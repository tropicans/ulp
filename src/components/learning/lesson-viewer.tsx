"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, FileText, PlayCircle, FileDown, Clock, Video } from "lucide-react"
import { markLessonComplete } from "@/lib/actions/progress"
import { toast } from "sonner"

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

interface LessonViewerProps {
    lesson: {
        id: string
        title: string
        contentType: string
        content?: string | null
        videoUrl?: string | null
        fileUrl?: string | null
        duration?: number | null
        description?: string | null
    }
    isCompleted: boolean
    onComplete?: () => void
}

export function LessonViewer({ lesson, isCompleted, onComplete }: LessonViewerProps) {
    const [completing, setCompleting] = useState(false)

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

    return (
        <div className="space-y-6">
            {/* Lesson Header */}
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{lesson.title}</h1>
                    {lesson.description && (
                        <p className="text-slate-500 dark:text-gray-400">{lesson.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-4">
                        <div className="flex items-center text-sm text-slate-500 dark:text-gray-400">
                            <Clock className="w-4 h-4 mr-1" />
                            {lesson.duration || 0} menit
                        </div>
                        {isCompleted && (
                            <div className="flex items-center text-sm text-green-500 dark:text-green-400">
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Selesai
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Lesson Content */}
            <Card className="bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                <CardContent className="p-6">
                    {lesson.contentType === "VIDEO" && lesson.videoUrl && (
                        isValidVideoUrl(lesson.videoUrl) ? (
                            <div className="aspect-video bg-black rounded-lg overflow-hidden">
                                <iframe
                                    src={lesson.videoUrl}
                                    className="w-full h-full"
                                    allowFullScreen
                                    title={lesson.title}
                                />
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

            {/* Action Buttons */}
            {!isCompleted && (
                <div className="flex justify-end">
                    <Button
                        onClick={handleMarkComplete}
                        disabled={completing}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {completing ? "Menyimpan..." : "Tandai Selesai"}
                    </Button>
                </div>
            )}
        </div>
    )
}
