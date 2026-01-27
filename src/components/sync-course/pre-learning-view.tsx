"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    BookOpen,
    ChevronRight,
    CheckCircle2,
    PlayCircle,
    Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { recordPreLearningAccess } from "@/lib/actions/sync-course"
import { SyncCourseConfig } from "@/lib/types/sync-course"
import { motion } from "framer-motion"

interface PreLearningViewProps {
    courseId: string
    courseSlug: string
    courseTitle: string
    config: SyncCourseConfig
    alreadyAccessed: boolean
}

export function PreLearningView({
    courseId,
    courseSlug,
    courseTitle,
    config,
    alreadyAccessed
}: PreLearningViewProps) {
    const [isCompleted, setIsCompleted] = useState(alreadyAccessed)
    const [isLoading, setIsLoading] = useState(false)

    // Record access on mount if not already accessed
    useEffect(() => {
        async function recordAccess() {
            if (!alreadyAccessed) {
                setIsLoading(true)
                const result = await recordPreLearningAccess(courseId)
                if (result.success) {
                    setIsCompleted(true)
                }
                setIsLoading(false)
            }
        }
        recordAccess()
    }, [courseId, alreadyAccessed])

    const { advanceOrganizer } = config

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
            >
                <Badge
                    variant="outline"
                    className="mb-4 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest"
                >
                    Pre-Learning: Advance Organizer
                </Badge>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">
                    {advanceOrganizer.title}
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                    Pahami kerangka konseptual sebelum mengikuti sesi live
                </p>
            </motion.div>

            {/* Status Card */}
            {isLoading ? (
                <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
                        <CardContent className="p-8">
                            {/* Video if available */}
                            {advanceOrganizer.videoUrl && (
                                <div className="mb-8 rounded-2xl overflow-hidden bg-slate-900 aspect-video">
                                    <iframe
                                        src={advanceOrganizer.videoUrl.replace('watch?v=', 'embed/')}
                                        className="w-full h-full"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                </div>
                            )}

                            {/* Content */}
                            <div
                                className="prose prose-slate dark:prose-invert max-w-none mb-8 
                                    [&_ul]:list-none [&_ul]:pl-0 [&_ul]:mt-6
                                    [&_li]:relative [&_li]:pl-6 [&_li]:mb-4
                                    [&_li]:before:content-[''] [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[0.6em]
                                    [&_li]:before:w-3 [&_li]:before:h-1 [&_li]:before:bg-red-600 [&_li]:before:rounded-full"
                                dangerouslySetInnerHTML={{ __html: advanceOrganizer.content }}
                            />

                            {/* Completion Status */}
                            {isCompleted && (
                                <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 mb-6">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                                        Pre-Learning telah diakses. Anda dapat melanjutkan ke Live Session.
                                    </p>
                                </div>
                            )}

                            {/* Next Button */}
                            <Button
                                asChild
                                size="lg"
                                className="w-full h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-900/20"
                            >
                                <Link href={`/courses/${courseSlug}/sync/live`}>
                                    <PlayCircle className="w-5 h-5 mr-2" />
                                    Lanjut ke Live Session
                                    <ChevronRight className="w-5 h-5 ml-2" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </div>
    )
}
