import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Calendar, BookOpen, Users, FileQuestion, HelpCircle } from "lucide-react"
import { CreateModuleDialog } from "@/components/courses/create-module-dialog"
import { CreateLessonDialog } from "@/components/courses/create-lesson-dialog"
import { CreateQuizDialog } from "@/components/quizzes/create-quiz-dialog"
import { EditCourseInfoDialog } from "@/components/courses/edit-course-info-dialog"
import { EditModuleDialog } from "@/components/courses/edit-module-dialog"
import { EditLessonDialog } from "@/components/courses/edit-lesson-dialog"
import { ThumbnailManager } from "@/components/courses/thumbnail-manager"
import { RefineAllTitlesButton } from "@/components/courses/refine-all-titles-button"
import { CourseBuilder } from "@/components/courses/course-builder"
import { PublishToggle } from "@/components/courses/publish-toggle"

interface EditCoursePageProps {
    params: Promise<{
        id: string
    }>
}

export default async function EditCoursePage({ params }: EditCoursePageProps) {
    const { id } = await params
    const session = await auth()

    if (!session?.user) {
        redirect("/login")
    }

    const course = await prisma.course.findUnique({
        where: { id },
        include: {
            Module: {
                orderBy: { order: "asc" },
                include: {
                    Lesson: {
                        orderBy: { order: "asc" }
                    },
                    Quiz: {
                        orderBy: { updatedAt: "desc" }
                    }
                }
            }
        }
    })

    if (!course) {
        notFound()
    }

    // Check ownership
    if (course.instructorId !== session.user.id && !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
        redirect("/dashboard/courses")
    }

    // Get YouTube thumbnail and metadata if course has ytPlaylistId
    let effectiveThumbnail = course.thumbnail
    let effectiveDescription = course.description
    let effectiveCourseShortDesc = course.courseShortDesc
    let effectiveRequirements = course.requirements
    let effectiveOutcomes = course.outcomes
    let effectiveRecommendedNext = course.recommendedNext

    if (course.ytPlaylistId) {
        // Get first video from playlist for thumbnail
        if (!effectiveThumbnail) {
            const firstVideo = await prisma.ytPlaylistItem.findFirst({
                where: { playlistId: course.ytPlaylistId },
                orderBy: { videoNo: 'asc' },
                select: { videoId: true }
            })
            if (firstVideo) {
                effectiveThumbnail = `https://i.ytimg.com/vi/${firstVideo.videoId}/maxresdefault.jpg`
            }
        }

        // Fallback to YtPlaylist metadata if Course fields are empty or have default placeholder
        const isDefaultDescription = !effectiveDescription || effectiveDescription.startsWith("Kursus otomatis dari YouTube")
        if (isDefaultDescription || !effectiveCourseShortDesc || !effectiveRequirements || !effectiveOutcomes || !effectiveRecommendedNext) {
            const ytPlaylist = await prisma.ytPlaylist.findUnique({
                where: { playlistId: course.ytPlaylistId },
                select: {
                    courseDesc: true,
                    courseShortDesc: true,
                    requirements: true,
                    outcomes: true,
                    recommendedNext: true
                }
            })
            if (ytPlaylist) {
                if (isDefaultDescription && ytPlaylist.courseDesc) {
                    effectiveDescription = ytPlaylist.courseDesc
                }
                effectiveCourseShortDesc = effectiveCourseShortDesc || ytPlaylist.courseShortDesc
                effectiveRequirements = effectiveRequirements || ytPlaylist.requirements
                effectiveOutcomes = effectiveOutcomes || ytPlaylist.outcomes
                effectiveRecommendedNext = effectiveRecommendedNext || ytPlaylist.recommendedNext
            }
        }
    }

    // Create effective course object with fallback values
    const effectiveCourse = {
        ...course,
        description: effectiveDescription,
        courseShortDesc: effectiveCourseShortDesc,
        requirements: effectiveRequirements,
        outcomes: effectiveOutcomes,
        recommendedNext: effectiveRecommendedNext,
    }

    return (
        <div className="min-h-screen bg-white dark:bg-slate-900 pt-4 pb-20">
            <div className="container max-w-5xl mx-auto px-4">
                <Link href="/dashboard/courses" className="flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm mb-6 w-fit group">
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Kembali ke Daftar Kursus
                </Link>

                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{course.title}</h1>
                        <p className="text-slate-500 dark:text-slate-400">Edit kursus dan kelola modul & materi</p>
                    </div>
                    <PublishToggle courseId={course.id} isPublished={course.isPublished} />
                </div>

                <div className="space-y-6">
                    {/* Course Basic Info */}
                    <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-slate-900 dark:text-white">Informasi Kursus</CardTitle>
                            <EditCourseInfoDialog course={effectiveCourse} />
                        </CardHeader>
                        <CardContent className="space-y-4 text-slate-700 dark:text-slate-300">
                            {effectiveCourse.courseShortDesc && (
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Deskripsi Singkat</p>
                                    <p className="text-sm bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">{effectiveCourse.courseShortDesc}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-sm text-slate-500 mb-1">Deskripsi</p>
                                <p>{course.description}</p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-500">Kategori</p>
                                    <p className="font-medium">{course.category || "-"}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Metode</p>
                                    <p className="font-medium">{course.deliveryMode}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Kesulitan</p>
                                    <p className="font-medium">{course.difficulty}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Durasi</p>
                                    <p className="font-medium">{course.duration || "-"} jam</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Thumbnail Manager */}
                    <ThumbnailManager
                        courseId={course.id}
                        courseTitle={course.title}
                        courseDescription={course.description}
                        currentThumbnail={effectiveThumbnail}
                    />

                    {/* Modules & Materials Builder */}
                    <CourseBuilder course={course} />
                </div>
            </div>
        </div>
    )
}
