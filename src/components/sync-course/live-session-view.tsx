"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
    Video,
    Target,
    Bookmark,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Plus,
    X,
    CheckCircle2,
    Clock,
    Lock,
    Timer,
    MessageSquare,
    ListChecks
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { saveConceptMarker, updateLiveWatchDuration } from "@/lib/actions/sync-course"
import { SyncCourseConfig, ConceptMarker } from "@/lib/types/sync-course"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface LiveSessionViewProps {
    courseId: string
    courseSlug: string
    courseTitle: string
    config: SyncCourseConfig
    existingMarkers: ConceptMarker[]
    alreadyAccessed: boolean
    preLearnCompleted: boolean
    courseDurationJP?: number // Duration in JP (45 min each)
    initialWatchDuration?: number // Already watched seconds
}

const MINIMUM_WATCH_PERCENT = 60
const WATCH_UPDATE_INTERVAL = 30 // Save to server every 30 seconds (optimized for high concurrency)

export function LiveSessionView({
    courseId,
    courseSlug,
    courseTitle,
    config,
    existingMarkers,
    alreadyAccessed,
    preLearnCompleted,
    courseDurationJP = 2,
    initialWatchDuration = 0
}: LiveSessionViewProps) {
    const [showFocusPanel, setShowFocusPanel] = useState(true)
    const [markers, setMarkers] = useState<ConceptMarker[]>(existingMarkers || [])
    const [isAddingMarker, setIsAddingMarker] = useState(false)
    const [markerText, setMarkerText] = useState("")
    const [isSavingMarker, setIsSavingMarker] = useState(false)
    const [checkedFocus, setCheckedFocus] = useState<Record<number, boolean>>({})
    const [hostname, setHostname] = useState("")

    useEffect(() => {
        setHostname(window.location.hostname)
    }, [])

    const toggleFocus = (index: number) => {
        setCheckedFocus(prev => ({
            ...prev,
            [index]: !prev[index]
        }))
    }

    // Watch time tracking
    const [watchedSeconds, setWatchedSeconds] = useState(initialWatchDuration)
    const [isWatching, setIsWatching] = useState(true)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const lastSavedRef = useRef(initialWatchDuration)

    // Calculate required time
    const totalDurationSeconds = courseDurationJP * 45 * 60 // JP to seconds
    const requiredSeconds = Math.round(totalDurationSeconds * (MINIMUM_WATCH_PERCENT / 100))
    const percentWatched = Math.min(100, Math.round((watchedSeconds / totalDurationSeconds) * 100))
    const canAccessValidation = watchedSeconds >= requiredSeconds
    const remainingSeconds = Math.max(0, requiredSeconds - watchedSeconds)

    // Format time display
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Save progress to server
    const saveProgress = useCallback((seconds: number) => {
        if (seconds > lastSavedRef.current) {
            lastSavedRef.current = seconds
            updateLiveWatchDuration(courseId, seconds)
        }
    }, [courseId])

    // Watch time tracking effect with 30s interval
    useEffect(() => {
        if (isWatching && !canAccessValidation) {
            intervalRef.current = setInterval(() => {
                setWatchedSeconds(prev => {
                    const newValue = prev + 1
                    // Save to server every 30 seconds (WATCH_UPDATE_INTERVAL)
                    if (newValue % WATCH_UPDATE_INTERVAL === 0) {
                        saveProgress(newValue)
                    }
                    return newValue
                })
            }, 1000)
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [isWatching, canAccessValidation, saveProgress])

    // Visibility API - pause timer when tab is hidden
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setIsWatching(false)
                // Save progress when user leaves tab
                saveProgress(watchedSeconds)
            } else {
                setIsWatching(true)
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [watchedSeconds, saveProgress])

    // Save on page leave (beforeunload)
    useEffect(() => {
        const handleBeforeUnload = () => {
            saveProgress(watchedSeconds)
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [watchedSeconds, saveProgress])

    // Save final duration when validation unlocks
    useEffect(() => {
        if (canAccessValidation && intervalRef.current) {
            clearInterval(intervalRef.current)
            saveProgress(watchedSeconds)
        }
    }, [canAccessValidation, watchedSeconds, saveProgress])

    const getYouTubeVideoId = (url: string) => {
        if (!url) return null

        // Handle live stream URLs
        if (url.includes('/live/')) {
            return url.split('/live/')[1]?.split('?')[0]
        }

        // Handle regular YouTube URLs
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
        const match = url.match(regExp)
        return (match && match[7].length === 11) ? match[7] : null
    }

    const getYouTubeEmbedUrl = (url: string) => {
        const videoId = getYouTubeVideoId(url)
        if (videoId) {
            return `https://www.youtube.com/embed/${videoId}?autoplay=1`
        }
        return url
    }

    const getYouTubeChatUrl = (url: string) => {
        const videoId = getYouTubeVideoId(url)
        if (videoId && hostname) {
            return `https://www.youtube.com/live_chat?v=${videoId}&embed_domain=${hostname}`
        }
        return ""
    }

    const handleAddMarker = useCallback(async () => {
        if (!markerText.trim()) return

        setIsSavingMarker(true)
        const newMarker: ConceptMarker = {
            timestamp: new Date().toISOString(),
            text: markerText.trim(),
            createdAt: new Date().toISOString()
        }

        const result = await saveConceptMarker(courseId, newMarker)
        if (result.success) {
            setMarkers(prev => [...prev, newMarker])
            setMarkerText("")
            setIsAddingMarker(false)
        }

        setIsSavingMarker(false)
    }, [courseId, markerText])

    // Guard: Pre-learning must be completed
    if (!preLearnCompleted) {
        return (
            <div className="max-w-2xl mx-auto text-center py-20">
                <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Clock className="w-10 h-10 text-yellow-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                    Pre-Learning Belum Selesai
                </h2>
                <p className="text-slate-500 mb-8">
                    Anda perlu menyelesaikan Pre-Learning terlebih dahulu sebelum mengakses Live Session.
                </p>
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                    <Link href={`/courses/${courseSlug}/sync/pre-learning`}>
                        Kembali ke Pre-Learning
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Badge
                            className="bg-red-600/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 text-[10px] font-black uppercase tracking-widest px-3 py-1"
                        >
                            <span className="relative flex h-2 w-2 mr-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                            </span>
                            Live Session
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-bold text-slate-500 border-slate-200 dark:border-slate-800">
                            {courseDurationJP} JP • {MINIMUM_WATCH_PERCENT}% Att. Required
                        </Badge>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        {courseTitle}
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    {canAccessValidation ? (
                        <Button asChild variant="outline" size="sm" className="rounded-xl border-green-200 hover:bg-green-50 text-green-600 font-bold hidden md:flex">
                            <Link href={`/courses/${courseSlug}/sync/validation`}>
                                Lanjut ke Validation
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Link>
                        </Button>
                    ) : (
                        <Badge variant="outline" className="text-yellow-600 bg-yellow-50/50 border-yellow-200 px-3 py-1.5 hidden md:flex items-center gap-1.5">
                            <Lock className="w-3 h-3" />
                            Validation Terkunci
                        </Badge>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Video Area */}
                <div className="lg:col-span-2 space-y-4">
                    {/* YouTube Embed */}
                    <div className="relative group">
                        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl shadow-blue-500/5">
                            <div className="aspect-video bg-slate-900">
                                <iframe
                                    src={getYouTubeEmbedUrl(config.youtubeStreamUrl)}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        </Card>
                        {/* Interactive overlay status when minimized/small (optional refinement) */}
                    </div>


                    {/* Concept Marker Widget */}
                    <Card className="border-slate-200 dark:border-slate-800">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Bookmark className="w-4 h-4 text-purple-500" />
                                    Catatan Konsep
                                </h3>
                                <Button
                                    size="sm"
                                    variant={isAddingMarker ? "ghost" : "default"}
                                    className={cn(
                                        "rounded-lg text-xs",
                                        !isAddingMarker && "bg-purple-600 hover:bg-purple-700"
                                    )}
                                    onClick={() => setIsAddingMarker(!isAddingMarker)}
                                >
                                    {isAddingMarker ? (
                                        <>
                                            <X className="w-3 h-3 mr-1" />
                                            Batal
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-3 h-3 mr-1" />
                                            Tandai Konsep
                                        </>
                                    )}
                                </Button>
                            </div>

                            <AnimatePresence>
                                {isAddingMarker && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mb-4"
                                    >
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Tulis konsep penting yang Anda tangkap..."
                                                value={markerText}
                                                onChange={(e) => setMarkerText(e.target.value)}
                                                className="flex-1"
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") handleAddMarker()
                                                }}
                                            />
                                            <Button
                                                onClick={handleAddMarker}
                                                disabled={!markerText.trim() || isSavingMarker}
                                                className="bg-purple-600 hover:bg-purple-700"
                                            >
                                                {isSavingMarker ? "..." : "Simpan"}
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {markers.length > 0 ? (
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {markers.map((marker, index) => (
                                        <div
                                            key={index}
                                            className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30"
                                        >
                                            <p className="text-sm text-slate-700 dark:text-slate-300">
                                                {marker.text}
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                {new Date(marker.createdAt).toLocaleTimeString('id-ID')}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 px-4 space-y-3">
                                    <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-2 text-slate-300">
                                        <Bookmark className="w-8 h-8 opacity-20" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                        Belum ada catatan konsep.
                                    </p>
                                    <p className="text-xs text-slate-400 max-w-[200px] mx-auto">
                                        Klik "Tandai Konsep" untuk mencatat poin penting selama sesi live.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4">
                    {/* Interactive Sidebar with Tabs */}
                    <Card className="border-slate-200 dark:border-slate-800 overflow-hidden min-h-[500px] flex flex-col">
                        <Tabs defaultValue="focus" className="w-full flex-1 flex flex-col">
                            <CardHeader className="p-0 border-b border-slate-100 dark:border-slate-800">
                                <TabsList className="w-full h-14 bg-transparent rounded-none p-0">
                                    <TabsTrigger
                                        value="focus"
                                        className="flex-1 h-full rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:shadow-none font-bold text-xs gap-2"
                                    >
                                        <ListChecks className="w-4 h-4" />
                                        FOKUS BELAJAR
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="chat"
                                        className="flex-1 h-full rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-red-500 data-[state=active]:shadow-none font-bold text-xs gap-2"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        LIVE CHAT
                                    </TabsTrigger>
                                </TabsList>
                            </CardHeader>

                            <div className="flex-1 overflow-y-auto p-4">
                                <TabsContent value="focus" className="mt-0 outline-none">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Target className="w-4 h-4 text-blue-500" />
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Fokus Pembelajaran</h3>
                                        </div>
                                        {config.learningFocus.map((focus, index) => (
                                            <div
                                                key={index}
                                                onClick={() => toggleFocus(index)}
                                                className={cn(
                                                    "group flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                                                    checkedFocus[index]
                                                        ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200/50 dark:border-blue-800/50"
                                                        : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800"
                                                )}
                                            >
                                                <div className={cn(
                                                    "flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors mt-0.5",
                                                    checkedFocus[index]
                                                        ? "bg-blue-600 border-blue-600 text-white"
                                                        : "border-slate-200 dark:border-slate-700 group-hover:border-blue-400"
                                                )}>
                                                    {checkedFocus[index] && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                </div>
                                                <span className={cn(
                                                    "text-xs font-medium leading-relaxed transition-colors",
                                                    checkedFocus[index] ? "text-blue-700 dark:text-blue-300 line-through opacity-50" : "text-slate-600 dark:text-slate-400"
                                                )}>
                                                    {focus}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>

                                <TabsContent value="chat" className="mt-0 h-full outline-none flex flex-col">
                                    {getYouTubeChatUrl(config.youtubeStreamUrl) ? (
                                        <iframe
                                            src={getYouTubeChatUrl(config.youtubeStreamUrl)}
                                            className="w-full flex-1 rounded-xl border border-slate-100 dark:border-slate-800 min-h-[400px]"
                                            allowFullScreen
                                        />
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
                                            <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center text-slate-300">
                                                <MessageSquare className="w-8 h-8 opacity-20" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-500">Chat Tidak Tersedia</p>
                                                <p className="text-xs text-slate-400">Stream URL tidak valid untuk chat.</p>
                                            </div>
                                        </div>
                                    )}
                                </TabsContent>
                            </div>
                        </Tabs>
                    </Card>

                    {/* Status & Action Card */}
                    <Card className={cn(
                        "border-none shadow-xl transition-all overflow-hidden",
                        canAccessValidation
                            ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white"
                            : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                    )}>
                        <CardContent className="p-6">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "w-10 h-10 rounded-2xl flex items-center justify-center",
                                            canAccessValidation ? "bg-white/20" : "bg-yellow-100 dark:bg-yellow-900/20"
                                        )}>
                                            {canAccessValidation ? (
                                                <CheckCircle2 className="w-6 h-6 text-white" />
                                            ) : (
                                                <Timer className="w-6 h-6 text-yellow-600" />
                                            )}
                                        </div>
                                        <div>
                                            <p className={cn(
                                                "text-sm font-black uppercase tracking-widest",
                                                canAccessValidation ? "text-white" : "text-slate-900 dark:text-white"
                                            )}>
                                                {canAccessValidation ? "Siap Lanjut!" : "Progress Belajar"}
                                            </p>
                                            <p className={cn(
                                                "text-[10px] font-bold",
                                                canAccessValidation ? "text-white/80" : "text-slate-500 dark:text-slate-400"
                                            )}>
                                                {canAccessValidation ? "Waktu minimal menonton terpenuhi" : `${percentWatched}% dari ${MINIMUM_WATCH_PERCENT}% minimal`}
                                            </p>
                                        </div>
                                    </div>
                                    {isWatching && !canAccessValidation && (
                                        <div className="flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                            <span className="text-[10px] font-bold text-blue-500">Watching</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                                        <span className={canAccessValidation ? "text-white/60" : "text-slate-500"}>Time Spent</span>
                                        <span className={canAccessValidation ? "text-white" : "text-slate-900 dark:text-white"}>
                                            {formatTime(watchedSeconds)} / {formatTime(requiredSeconds)}
                                        </span>
                                    </div>
                                    <Progress
                                        value={Math.min(100, (watchedSeconds / requiredSeconds) * 100)}
                                        className={cn(
                                            "h-2",
                                            canAccessValidation ? "bg-white/20 [&>div]:bg-white" : "bg-slate-100 dark:bg-slate-800 [&>div]:bg-yellow-500"
                                        )}
                                    />
                                </div>

                                {canAccessValidation ? (
                                    <Button
                                        asChild
                                        size="lg"
                                        className="w-full h-14 bg-white text-emerald-600 hover:bg-slate-50 font-black rounded-2xl shadow-lg border-none"
                                    >
                                        <Link href={`/courses/${courseSlug}/sync/validation`}>
                                            MULAI POST-TEST
                                            <ChevronRight className="w-5 h-5 ml-2" />
                                        </Link>
                                    </Button>
                                ) : (
                                    <Button
                                        size="lg"
                                        disabled
                                        className="w-full h-14 bg-slate-100 dark:bg-white/5 text-slate-400 font-black rounded-2xl border-none cursor-not-allowed flex-col items-center justify-center gap-0"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Lock className="w-4 h-4" />
                                            POST-TEST TERKUNCI
                                        </div>
                                        <span className="text-[9px] font-bold opacity-60">Sisa {formatTime(remainingSeconds)} Menit Lagi</span>
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
