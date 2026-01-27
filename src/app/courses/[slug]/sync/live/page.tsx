export const dynamic = "force-dynamic"
import { redirect, notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
    getSyncCourseProgress,
    getSyncCourseConfig,
    recordLiveSessionAccess
} from "@/lib/actions/sync-course"
import { ConceptMarker } from "@/lib/types/sync-course"
import { LiveSessionView } from "@/components/sync-course"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface LiveSessionPageProps {
    params: Promise<{ slug: string }>
}

export default async function LiveSessionPage({ params }: LiveSessionPageProps) {
    const { slug } = await params
    const session = await auth()

    if (!session?.user) {
        redirect(`/login?callbackUrl=/courses/${slug}/sync/live`)
    }

    // Get course
    const course = await prisma.course.findUnique({
        where: { slug },
        include: {
            Enrollment: {
                where: { userId: session.user.id }
            }
        }
    })

    if (!course) notFound()

    // Check enrollment
    if (course.Enrollment.length === 0 && session.user.role === "LEARNER") {
        redirect(`/courses/${slug}`)
    }

    // Get sync config
    const config = await getSyncCourseConfig(course.id)

    // Default config for testing
    const effectiveConfig = config || {
        advanceOrganizer: {
            title: "Persiapan Pembelajaran",
            content: "",
            videoUrl: undefined
        },
        learningFocus: [
            "Memahami konsep dasar yang akan disampaikan",
            "Mengidentifikasi poin-poin penting selama sesi",
            "Menghubungkan materi dengan konteks pekerjaan"
        ],
        youtubeStreamUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Placeholder
        conceptValidation: { questions: [] }
    }

    // Get progress
    const progress = await getSyncCourseProgress(course.id)

    if ("error" in progress) {
        redirect(`/courses/${slug}/sync/pre-learning`)
    }

    const preLearnCompleted = !!progress.preLearnAccessedAt
    const alreadyAccessed = !!progress.liveAccessedAt
    const existingMarkers = (progress.conceptMarkers as unknown as ConceptMarker[]) || []

    // Record live session access if pre-learning completed and not already accessed
    if (preLearnCompleted && !alreadyAccessed) {
        await recordLiveSessionAccess(course.id)
    }

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
            <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 px-4 md:px-6 flex items-center">
                <Button asChild variant="ghost" size="sm">
                    <Link href={`/courses/${slug}`}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Kembali
                    </Link>
                </Button>
            </header>

            <main className="container mx-auto px-4 py-8">
                <LiveSessionView
                    courseId={course.id}
                    courseSlug={slug}
                    courseTitle={course.title}
                    config={effectiveConfig}
                    existingMarkers={existingMarkers}
                    alreadyAccessed={alreadyAccessed}
                    preLearnCompleted={preLearnCompleted}
                    courseDurationJP={course.duration || 2}
                    initialWatchDuration={progress.liveWatchDuration || 0}
                />
            </main>
        </div>
    )
}
