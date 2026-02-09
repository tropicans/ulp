"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Loader2, Clock, Music, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

interface ProgressItem {
    videoId: string
    videoNo: number
    title: string
    refinedTitle: string | null
    duration: string
    audioStatus: "pending" | "processing" | "completed" | "failed"
    hasTranscript: boolean
    hasSummary: boolean
    hasTitle: boolean
    hasQuiz: boolean
    audioPath: string | null
}

interface ProgressData {
    playlistId: string
    playlistTitle: string
    total: number
    audio: { completed: number; failed: number; processing: number; pending: number }
    transcription: { completed: number; pending: number }
    enhancement: { summary: number; title: number; quiz: number; total: number }
    playlistProgress?: { hasQuizPrepost: boolean; quizPrepostCount: number; hasCourseDesc: boolean; hasCourseMetadata: boolean; status: string }
    completed: number
    failed: number
    processing: number
    pending: number
    webhookTriggered: boolean
    isComplete?: boolean
    items: ProgressItem[]
}

interface AudioProgressCardProps {
    playlistId: string
    courseId: string
    onComplete?: () => void
}

export function AudioProgressCard({ playlistId, courseId, onComplete }: AudioProgressCardProps) {
    const router = useRouter()
    const [data, setData] = useState<ProgressData | null>(null)
    const [loading, setLoading] = useState(true)
    const [autoRedirect, setAutoRedirect] = useState(true)

    const fetchProgress = useCallback(async () => {
        try {
            const res = await fetch(`/api/youtube/progress?playlistId=${playlistId}`)
            if (res.ok) {
                const json = await res.json()
                setData(json)

                // NOTE: Auto-redirect disabled - user clicks "Lihat Kursus" manually
                // const allDone = json.completed === json.total &&
                //     json.total > 0 &&
                //     json.pending === 0 &&
                //     json.processing === 0
                // if (allDone && autoRedirect) {
                //     onComplete?.()
                //     router.push(`/dashboard/courses/${courseId}/edit`)
                // }
            }
        } catch (e) {
            console.error("Failed to fetch progress:", e)
        } finally {
            setLoading(false)
        }
    }, [playlistId, courseId, autoRedirect, onComplete, router])

    useEffect(() => {
        fetchProgress()
        const interval = setInterval(fetchProgress, 3000)
        return () => clearInterval(interval)
    }, [fetchProgress])

    if (loading && !data) {
        return (
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardContent className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-slate-500">Memuat progress...</span>
                </CardContent>
            </Card>
        )
    }

    if (!data) return null

    const progressPercent = data.total > 0 ? (data.completed / data.total) * 100 : 0
    const isComplete = data.completed === data.total && data.total > 0

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "completed":
                return <CheckCircle2 className="w-4 h-4 text-green-600" />
            case "processing":
                return <Loader2 className="w-4 h-4 text-yellow-600 animate-spin" />
            case "failed":
                return <XCircle className="w-4 h-4 text-red-600" />
            default:
                return <Clock className="w-4 h-4 text-slate-400" />
        }
    }

    const getStatusBadge = (status: string) => {
        const variants: Record<string, string> = {
            completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            processing: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
            failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            pending: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
        }
        return variants[status] || variants.pending
    }

    return (
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Music className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                        <CardTitle className="text-lg">Ekstraksi Audio</CardTitle>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {data.playlistTitle}
                        </p>
                    </div>
                    {isComplete && (
                        <Button
                            onClick={() => router.push(`/dashboard/courses/${courseId}/edit`)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            Lihat Kursus <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
                {/* Audio Extraction Progress */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <Music className="w-4 h-4" /> Audio: {data.audio?.completed || data.completed} dari {data.total}
                        </span>
                        <span className="font-medium text-blue-600">{Math.round(progressPercent)}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                </div>

                {/* Transcription Progress */}
                {data.transcription && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                📝 Transkrip: {data.transcription.completed} dari {(data.audio?.completed || data.completed)}
                            </span>
                            <span className="font-medium text-purple-600">
                                {Math.round(((data.transcription.completed) / (data.audio?.completed || data.completed || 1)) * 100)}%
                            </span>
                        </div>
                        <Progress
                            value={((data.transcription.completed) / (data.audio?.completed || data.completed || 1)) * 100}
                            className="h-2 [&>div]:bg-purple-500"
                        />
                    </div>
                )}

                {/* AI Enhancement Progress */}
                {data.enhancement && data.enhancement.total > 0 && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                ✨ AI Enhancement: {data.enhancement.summary} dari {data.enhancement.total}
                            </span>
                            <span className="font-medium text-amber-600">
                                {Math.round((data.enhancement.summary / data.enhancement.total) * 100)}%
                            </span>
                        </div>
                        <Progress
                            value={(data.enhancement.summary / data.enhancement.total) * 100}
                            className="h-2 [&>div]:bg-amber-500"
                        />
                        <div className="flex gap-3 text-xs text-slate-500">
                            <span>📋 Summary: {data.enhancement.summary}</span>
                            <span>🏷️ Title: {data.enhancement.title}</span>
                            <span>❓ Quiz: {data.enhancement.quiz}</span>
                        </div>
                    </div>
                )}

                {/* Playlist Finalization (Quiz PrePost & Metadata) */}
                {data.playlistProgress && (
                    <div className="space-y-2 border-t pt-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                🎯 Finalisasi Playlist
                            </span>
                            <span className={`font-medium ${data.isComplete ? 'text-green-600' : 'text-slate-500'}`}>
                                {data.isComplete ? '✅ Selesai' : '⏳ Proses'}
                            </span>
                        </div>
                        <div className="flex gap-4 text-xs text-slate-500">
                            <span className={data.playlistProgress.hasQuizPrepost ? 'text-green-600' : ''}>
                                {data.playlistProgress.hasQuizPrepost ? '✓' : '○'} Pre/Post Test ({data.playlistProgress.quizPrepostCount} soal)
                            </span>
                            <span className={data.playlistProgress.hasCourseDesc ? 'text-green-600' : ''}>
                                {data.playlistProgress.hasCourseDesc ? '✓' : '○'} Deskripsi Kursus
                            </span>
                        </div>
                    </div>
                )}

                {/* Status Summary */}
                <div className="flex gap-4 text-sm flex-wrap">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-slate-600 dark:text-slate-400">Audio: {data.audio?.completed || data.completed}</span>
                    </div>
                    {data.transcription && (
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                            <span className="text-slate-600 dark:text-slate-400">Transkrip: {data.transcription.completed}</span>
                        </div>
                    )}
                    {data.enhancement && (
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-slate-600 dark:text-slate-400">AI: {data.enhancement.summary}</span>
                        </div>
                    )}
                    {(data.audio?.pending || data.pending) > 0 && (
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-slate-400" />
                            <span className="text-slate-600 dark:text-slate-400">Antrian: {data.audio?.pending || data.pending}</span>
                        </div>
                    )}
                </div>

                {/* Video List */}
                <div className="max-h-[300px] overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-lg">
                    {data.items.map((item) => (
                        <div
                            key={item.videoId}
                            className="flex items-center gap-3 px-3 py-2 border-b border-slate-50 dark:border-slate-800 last:border-0"
                        >
                            <span className="text-xs text-slate-400 w-6">{item.videoNo}</span>
                            {getStatusIcon(item.audioStatus)}
                            <span className="flex-1 text-sm truncate text-slate-700 dark:text-slate-300">
                                {item.title}
                            </span>
                            <span className="text-xs text-slate-400">{item.duration}</span>
                            {item.hasTranscript && (
                                <span className="text-xs text-purple-500" title="Transkrip tersedia">📝</span>
                            )}
                            <Badge className={`text-xs ${getStatusBadge(item.audioStatus)}`}>
                                {item.audioStatus === "completed" ? "Audio ✓" :
                                    item.audioStatus === "processing" ? "Proses" :
                                        item.audioStatus === "failed" ? "Gagal" : "Antrian"}
                            </Badge>
                        </div>
                    ))}
                </div>

                {/* Webhook Status */}
                {data.webhookTriggered && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                        <CheckCircle2 className="w-4 h-4" />
                        Transkripsi AI dimulai
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
