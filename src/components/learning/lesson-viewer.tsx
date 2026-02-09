"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, FileText, PlayCircle, FileDown, Clock, Video, ArrowRight } from "lucide-react"
import { markLessonComplete } from "@/lib/actions/progress"
import { trackVideoPlay, trackVideoPause, trackVideoCompleted, trackVideoSeek } from "@/lib/actions/video-tracking"
import { toast } from "sonner"
import { KnowledgeCheckModal } from "./knowledge-check-modal"

// YouTube Player types
interface YTPlayer {
    playVideo: () => void
    pauseVideo: () => void
    destroy: () => void
    getCurrentTime: () => number
    getDuration: () => number
}

interface YTPlayerOptions {
    videoId: string
    playerVars?: {
        autoplay?: number
        enablejsapi?: number
        modestbranding?: number
        rel?: number
    }
    events?: {
        onReady?: (event: { target: YTPlayer }) => void
        onStateChange?: (event: { data: number }) => void
    }
}

interface YTNamespace {
    Player: new (elementId: string, options: YTPlayerOptions) => YTPlayer
    PlayerState: {
        ENDED: number
        PLAYING: number
        PAUSED: number
    }
}

// Extend window for YouTube API
declare global {
    interface Window {
        YT: YTNamespace
        onYouTubeIframeAPIReady: () => void
    }
}

// Helper to validate embeddable video URLs
const isValidVideoUrl = (url: string | null | undefined): boolean => {
    if (!url) return false
    const validPatterns = [
        /youtube\.com\/embed/,
        /youtu\.be/,
        /youtube\.com\/watch/,
        /vimeo\.com/,
        /player\.vimeo\.com/,
        /drive\.google\.com/,
        /loom\.com/,
        /wistia\.com/,
        /dailymotion\.com/,
    ]
    return validPatterns.some(pattern => pattern.test(url))
}

// Extract YouTube video ID from various URL formats
const getYouTubeVideoId = (url: string | null | undefined): string | null => {
    if (!url) return null

    // youtube.com/watch?v=VIDEO_ID
    const watchMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/)
    if (watchMatch) return watchMatch[1]

    // youtube.com/embed/VIDEO_ID
    const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/)
    if (embedMatch) return embedMatch[1]

    // youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)
    if (shortMatch) return shortMatch[1]

    return null
}

// Check if URL is YouTube
const isYouTubeUrl = (url: string | null | undefined): boolean => {
    if (!url) return false
    return /youtube\.com|youtu\.be/.test(url)
}

// Convert various video URL formats to embeddable format
const getEmbedUrl = (url: string | null | undefined): string => {
    if (!url) return ""

    // YouTube watch URL -> embed URL with enablejsapi
    const youtubeWatchMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/)
    if (youtubeWatchMatch) {
        return `https://www.youtube.com/embed/${youtubeWatchMatch[1]}?enablejsapi=1&autoplay=1`
    }

    // YouTube short URL -> embed URL
    const youtubeShortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)
    if (youtubeShortMatch) {
        return `https://www.youtube.com/embed/${youtubeShortMatch[1]}?enablejsapi=1&autoplay=1`
    }

    // Already embed format - add enablejsapi
    if (url.includes('youtube.com/embed')) {
        const separator = url.includes('?') ? '&' : '?'
        return `${url}${separator}enablejsapi=1&autoplay=1`
    }

    return url
}

interface KnowledgeCheckQuestion {
    question: string
    options: string[]
    correct: number
}

interface LessonViewerProps {
    lesson: {
        id: string
        title: string
        contentType: string
        content?: string | null
        videoUrl?: string | null
        ytVideoId?: string | null
        fileUrl?: string | null
        duration?: number | null
        description?: string | null
    }
    isCompleted: boolean
    knowledgeCheck?: KnowledgeCheckQuestion | null
    videoSummary?: string | null
    videoDuration?: string | null
    refinedTitle?: string | null
    nextLessonId?: string | null
    courseSlug?: string
    onComplete?: () => void
    onNavigateNext?: () => void
}

export function LessonViewer({
    lesson,
    isCompleted,
    knowledgeCheck,
    videoSummary,
    videoDuration,
    refinedTitle,
    nextLessonId,
    courseSlug,
    onComplete,
    onNavigateNext
}: LessonViewerProps) {
    const router = useRouter()
    const [completing, setCompleting] = useState(false)
    const [videoEnded, setVideoEnded] = useState(false)
    const [showKnowledgeCheck, setShowKnowledgeCheck] = useState(false)
    const playerRef = useRef<YTPlayer | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Use refs to avoid stale closures in YouTube player callbacks
    const knowledgeCheckRef = useRef(knowledgeCheck)
    const isCompletedRef = useRef(isCompleted)
    const videoEndedRef = useRef(videoEnded)
    const onCompleteRef = useRef(onComplete)
    const lessonIdRef = useRef(lesson.id)
    const lastKnownTimeRef = useRef<number>(0) // For seek detection
    const isPlayingRef = useRef<boolean>(false)
    const seekCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)

    // Keep refs in sync with props/state
    useEffect(() => {
        knowledgeCheckRef.current = knowledgeCheck
        console.log('[LessonViewer] knowledgeCheck updated:', knowledgeCheck)
    }, [knowledgeCheck])

    useEffect(() => {
        isCompletedRef.current = isCompleted
    }, [isCompleted])

    useEffect(() => {
        videoEndedRef.current = videoEnded
    }, [videoEnded])

    useEffect(() => {
        onCompleteRef.current = onComplete
    }, [onComplete])

    useEffect(() => {
        lessonIdRef.current = lesson.id
    }, [lesson.id])

    // Handler for YouTube player state changes
    const handlePlayerStateChange = useCallback((event: { data: number }) => {
        const player = playerRef.current
        if (!player) return

        try {
            const currentTime = player.getCurrentTime()
            const duration = player.getDuration()
            const videoId = getYouTubeVideoId(lesson.videoUrl) || lesson.id

            // YT.PlayerState.PLAYING = 1
            if (event.data === 1) {
                isPlayingRef.current = true
                // Detect seek: if time jumped more than 3 seconds from last known position
                const timeDiff = Math.abs(currentTime - lastKnownTimeRef.current)
                console.log(`[Video] PLAYING - currentTime: ${currentTime.toFixed(2)}, lastKnown: ${lastKnownTimeRef.current.toFixed(2)}, diff: ${timeDiff.toFixed(2)}`)
                if (lastKnownTimeRef.current > 0 && timeDiff > 3) {
                    console.log(`[Seek Detected] from ${lastKnownTimeRef.current.toFixed(2)} to ${currentTime.toFixed(2)}`)
                    trackVideoSeek(lessonIdRef.current, videoId, lastKnownTimeRef.current, currentTime)
                }
                lastKnownTimeRef.current = currentTime
                trackVideoPlay(lessonIdRef.current, videoId, currentTime)
            }
            // YT.PlayerState.PAUSED = 2
            else if (event.data === 2) {
                isPlayingRef.current = false
                console.log(`[Video] PAUSED - currentTime: ${currentTime.toFixed(2)}, saving to lastKnown`)
                lastKnownTimeRef.current = currentTime
                trackVideoPause(lessonIdRef.current, videoId, currentTime, duration)
            }
            // YT.PlayerState.ENDED = 0
            else if (event.data === 0) {
                isPlayingRef.current = false
                lastKnownTimeRef.current = 0
                trackVideoCompleted(lessonIdRef.current, videoId, duration)
                handleVideoEnded()
            }
        } catch (e) {
            // YT.PlayerState.ENDED = 0 (fallback)
            if (event.data === 0) {
                handleVideoEnded()
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lesson.videoUrl, lesson.id])

    // Initialize YouTube player
    const initializePlayer = useCallback(() => {
        const videoId = getYouTubeVideoId(lesson.videoUrl)
        if (!videoId || !containerRef.current) return

        // Clean up existing player
        if (playerRef.current) {
            try {
                playerRef.current.destroy()
            } catch (e) {
                // Ignore
            }
        }

        playerRef.current = new window.YT.Player('youtube-player', {
            videoId: videoId,
            playerVars: {
                autoplay: 1,
                enablejsapi: 1,
                modestbranding: 1,
                rel: 0,
            },
            events: {
                onStateChange: handlePlayerStateChange,
                onReady: (event) => {
                    // Autoplay when ready
                    event.target.playVideo()
                }
            }
        })
    }, [lesson.videoUrl, handlePlayerStateChange])

    // Load YouTube IFrame API
    useEffect(() => {
        if (!isYouTubeUrl(lesson.videoUrl)) return

        // Check if API is already loaded
        if (window.YT && window.YT.Player) {
            initializePlayer()
        } else {
            // Load the API
            const tag = document.createElement('script')
            tag.src = 'https://www.youtube.com/iframe_api'
            const firstScriptTag = document.getElementsByTagName('script')[0]
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

            window.onYouTubeIframeAPIReady = initializePlayer
        }

        // Cleanup: destroy player on unmount
        return () => {
            if (playerRef.current) {
                try {
                    playerRef.current.destroy()
                } catch (e) {
                    // Ignore errors during cleanup
                }
                playerRef.current = null
            }
            // Clear seek check interval
            if (seekCheckIntervalRef.current) {
                clearInterval(seekCheckIntervalRef.current)
                seekCheckIntervalRef.current = null
            }
        }
    }, [lesson.videoUrl, initializePlayer])

    // Seek detection interval - runs every 500ms while playing
    useEffect(() => {
        const checkSeek = () => {
            if (!isPlayingRef.current || !playerRef.current) return

            try {
                const currentTime = playerRef.current.getCurrentTime()
                const videoId = getYouTubeVideoId(lesson.videoUrl) || lesson.id

                // If time jumped more than 3 seconds (accounting for 500ms interval + buffer)
                const timeDiff = Math.abs(currentTime - lastKnownTimeRef.current)
                if (lastKnownTimeRef.current > 0 && timeDiff > 3) {
                    // This is a seek!
                    console.log(`[Seek Detected] from ${lastKnownTimeRef.current} to ${currentTime}`)
                    trackVideoSeek(lessonIdRef.current, videoId, lastKnownTimeRef.current, currentTime)
                }
                lastKnownTimeRef.current = currentTime
            } catch (e) {
                // Player might be destroyed
            }
        }

        // Start interval
        seekCheckIntervalRef.current = setInterval(checkSeek, 500)

        return () => {
            if (seekCheckIntervalRef.current) {
                clearInterval(seekCheckIntervalRef.current)
                seekCheckIntervalRef.current = null
            }
        }
    }, [lesson.videoUrl, lesson.id])

    async function handleVideoEnded() {
        console.log('[LessonViewer] handleVideoEnded called')
        console.log('[LessonViewer] isCompletedRef:', isCompletedRef.current)
        console.log('[LessonViewer] videoEndedRef:', videoEndedRef.current)
        console.log('[LessonViewer] knowledgeCheckRef:', knowledgeCheckRef.current)

        // Prevent double execution in same session
        if (videoEndedRef.current) {
            console.log('[LessonViewer] Skipping - already ended in this session')
            return
        }

        setVideoEnded(true)

        // Only mark lesson complete if not already completed
        if (!isCompletedRef.current) {
            const result = await markLessonComplete(lessonIdRef.current)

            if (result.error) {
                toast.error("Gagal menandai selesai", {
                    description: result.error,
                })
            } else {
                toast.success("🎉 Video selesai! Lesson ditandai complete.")
                onCompleteRef.current?.()
            }
        }

        // Always show knowledge check if available (even for already completed lessons)
        const currentKnowledgeCheck = knowledgeCheckRef.current
        console.log('[LessonViewer] Checking knowledgeCheck:', currentKnowledgeCheck)
        if (currentKnowledgeCheck) {
            console.log('[LessonViewer] Showing knowledge check modal in 500ms')
            setTimeout(() => {
                setShowKnowledgeCheck(true)
            }, 500)
        } else {
            console.log('[LessonViewer] No knowledge check available')
        }
    }

    async function handleMarkComplete() {
        setCompleting(true)
        const result = await markLessonComplete(lesson.id)

        if (result.error) {
            toast.error("Gagal menandai selesai", {
                description: result.error,
            })
        } else {
            toast.success("Lesson ditandai selesai!")
            onComplete?.()
        }
        setCompleting(false)
    }

    function handleKnowledgeCheckComplete() {
        setShowKnowledgeCheck(false)
        // Navigate to next lesson if available
        if (nextLessonId) {
            if (onNavigateNext) {
                onNavigateNext()
            } else if (courseSlug) {
                // Use router for client-side navigation
                router.push(`/courses/${courseSlug}/learn?lesson=${nextLessonId}`)
            }
        }
    }

    function handleNavigateNext() {
        if (nextLessonId) {
            if (onNavigateNext) {
                onNavigateNext()
            } else if (courseSlug) {
                router.push(`/courses/${courseSlug}/learn?lesson=${nextLessonId}`)
            }
        }
    }

    return (
        <div className="space-y-4">
            {/* Lesson Header */}
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">
                        {refinedTitle || lesson.title}
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center text-sm text-slate-500 dark:text-gray-400">
                            <Clock className="w-4 h-4 mr-1" />
                            {videoDuration || `${lesson.duration || 0} menit`}
                        </div>
                        {(isCompleted || videoEnded) && (
                            <div className="flex items-center text-sm text-green-500 dark:text-green-400">
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Selesai
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Lesson Content */}
            <Card className="bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 shadow-sm">
                <CardContent className="p-2 sm:p-4">
                    {lesson.contentType === "VIDEO" && lesson.videoUrl && (
                        isValidVideoUrl(lesson.videoUrl) ? (
                            <div ref={containerRef} className="aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
                                {isYouTubeUrl(lesson.videoUrl) ? (
                                    // YouTube Player with API
                                    <div id="youtube-player" className="w-full h-full" />
                                ) : (
                                    // Regular iframe for non-YouTube
                                    <iframe
                                        src={getEmbedUrl(lesson.videoUrl)}
                                        className="w-full h-full"
                                        allowFullScreen
                                        title={lesson.title}
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="aspect-video bg-slate-200 dark:bg-slate-900 rounded-lg flex flex-col items-center justify-center space-y-4 border border-slate-300 dark:border-slate-700">
                                <div className="p-6 rounded-full bg-slate-300 dark:bg-slate-800">
                                    <Video className="w-12 h-12 text-slate-500 dark:text-slate-400" />
                                </div>
                                <div className="text-center">
                                    <p className="text-slate-700 dark:text-slate-300 font-semibold">Video Belum Tersedia</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Materi video akan segera diupload</p>
                                </div>
                            </div>
                        )
                    )}

                    {lesson.contentType === "ARTICLE" && lesson.content && (
                        <div className="prose prose-slate dark:prose-invert max-w-none">
                            <div
                                className="text-slate-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap"
                                dangerouslySetInnerHTML={{ __html: lesson.content }}
                            />
                        </div>
                    )}

                    {lesson.contentType === "DOCUMENT" && lesson.fileUrl && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <FileDown className="w-16 h-16 text-blue-500 dark:text-blue-400" />
                            <p className="text-slate-600 dark:text-gray-300">Dokumen tersedia untuk diunduh</p>
                            <Button asChild variant="outline" className="border-blue-500 text-blue-500 dark:text-blue-400">
                                <a href={lesson.fileUrl} target="_blank" rel="noopener noreferrer">
                                    <FileDown className="w-4 h-4 mr-2" />
                                    Download Dokumen
                                </a>
                            </Button>
                        </div>
                    )}

                    {lesson.contentType === "QUIZ" && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <FileText className="w-16 h-16 text-purple-500 dark:text-purple-400" />
                            <p className="text-slate-600 dark:text-gray-300">Quiz akan tersedia di update selanjutnya</p>
                        </div>
                    )}

                    {lesson.contentType === "INTERACTIVE" && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <PlayCircle className="w-16 h-16 text-green-500 dark:text-green-400" />
                            <p className="text-slate-600 dark:text-gray-300">Konten interaktif akan tersedia di update selanjutnya</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Video Summary */}
            {videoSummary && (
                <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-800/80 dark:to-slate-800/50 border-blue-200 dark:border-slate-700">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-600/20 flex-shrink-0">
                                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Ringkasan Materi</h3>
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                    {videoSummary}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end">
                {/* Next Lesson Button - shows after video ends or if already completed */}
                {(isCompleted || videoEnded) && nextLessonId && (
                    <Button
                        onClick={handleNavigateNext}
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        Lesson Selanjutnya
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                )}
            </div>

            {/* Knowledge Check Modal */}
            <KnowledgeCheckModal
                isOpen={showKnowledgeCheck}
                question={knowledgeCheck || null}
                onComplete={handleKnowledgeCheckComplete}
                onClose={() => setShowKnowledgeCheck(false)}
            />
        </div>
    )
}
