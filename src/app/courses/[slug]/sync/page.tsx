import { redirect, notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getSyncCourseProgress, getSyncCourseConfig, recordLiveSessionAccess } from "@/lib/actions/sync-course"
import { SyncProgressTracker } from "@/components/sync-course"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Video, BookOpen, FileQuestion } from "lucide-react"
import Link from "next/link"

interface SyncCoursePageProps {
    params: Promise<{ slug: string }>
}

export default async function SyncCoursePage({ params }: SyncCoursePageProps) {
    const { slug } = await params
    const session = await auth()

    if (!session?.user) {
        redirect(`/login?callbackUrl=/courses/${slug}/sync`)
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

    // Check if enrolled
    if (course.Enrollment.length === 0 && session.user.role === "LEARNER") {
        redirect(`/courses/${slug}`)
    }

    // Check if this is a sync course
    if (course.deliveryMode !== "SYNC_ONLINE") {
        redirect(`/courses/${slug}/learn`)
    }

    // Get sync config and progress
    const config = await getSyncCourseConfig(course.id)
    const progress = await getSyncCourseProgress(course.id)

    if ("error" in progress) {
        return <div>Error loading progress</div>
    }

    // Determine where to redirect based on progress
    if (!progress.preLearnAccessedAt) {
        redirect(`/courses/${slug}/sync/pre-learning`)
    } else if (!progress.liveAccessedAt) {
        redirect(`/courses/${slug}/sync/live`)
    } else if (!progress.postLearnSubmittedAt) {
        redirect(`/courses/${slug}/sync/validation`)
    }

    // All completed - show summary
    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
            {/* Header */}
            <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 px-4 md:px-6 flex items-center">
                <Button asChild variant="ghost" size="sm">
                    <Link href={`/courses/${slug}`}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Kembali ke Course
                    </Link>
                </Button>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Title */}
                <div className="text-center mb-8">
                    <Badge className="mb-4 bg-green-600 text-white">Sync Course</Badge>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
                        {course.title}
                    </h1>
                    <p className="text-slate-500">Pembelajaran Sinkronus Berbasis Pengetahuan</p>
                </div>

                {/* Progress Tracker */}
                <SyncProgressTracker
                    courseSlug={slug}
                    progress={{
                        status: progress.status,
                        preLearnAccessedAt: progress.preLearnAccessedAt,
                        liveAccessedAt: progress.liveAccessedAt,
                        postLearnSubmittedAt: progress.postLearnSubmittedAt,
                        completedAt: progress.completedAt || null
                    }}
                    className="mb-8"
                />

                {/* Course Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-slate-200 dark:border-slate-800">
                        <CardContent className="p-6 text-center">
                            <BookOpen className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                            <h3 className="font-bold text-slate-900 dark:text-white">Pre-Learning</h3>
                            <p className="text-sm text-slate-500">Advance Organizer</p>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200 dark:border-slate-800">
                        <CardContent className="p-6 text-center">
                            <Video className="w-8 h-8 text-red-500 mx-auto mb-2" />
                            <h3 className="font-bold text-slate-900 dark:text-white">Live Session</h3>
                            <p className="text-sm text-slate-500">YouTube Live</p>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200 dark:border-slate-800">
                        <CardContent className="p-6 text-center">
                            <FileQuestion className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                            <h3 className="font-bold text-slate-900 dark:text-white">Validation</h3>
                            <p className="text-sm text-slate-500">Concept Assessment</p>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}
