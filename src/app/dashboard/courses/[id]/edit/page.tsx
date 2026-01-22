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
import { PublishToggle } from "@/components/courses/publish-toggle"
import { ThumbnailManager } from "@/components/courses/thumbnail-manager"

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

    // Get YouTube thumbnail if no thumbnail is stored but course has ytPlaylistId
    let effectiveThumbnail = course.thumbnail
    if (!effectiveThumbnail && course.ytPlaylistId) {
        // Get first video from playlist for thumbnail
        const firstVideo = await prisma.ytPlaylistItem.findFirst({
            where: { playlistId: course.ytPlaylistId },
            orderBy: { videoNo: 'asc' },
            select: { videoId: true }
        })
        if (firstVideo) {
            effectiveThumbnail = `https://i.ytimg.com/vi/${firstVideo.videoId}/maxresdefault.jpg`
        }
    }

    return (
        <div className="min-h-screen bg-white dark:bg-slate-900 pt-24 pb-20">
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
                            <EditCourseInfoDialog course={course} />
                        </CardHeader>
                        <CardContent className="space-y-4 text-slate-700 dark:text-slate-300">
                            <div>
                                <p className="text-sm text-slate-500 mb-1">Deskripsi</p>
                                <p>{course.description}</p>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
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

                    {/* Modules */}
                    <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-slate-900 dark:text-white">Modul & Materi</CardTitle>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" asChild className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                    <Link href={`/dashboard/courses/${course.id}/sessions`}>
                                        <Calendar className="w-4 h-4 mr-2" />
                                        Kelola Sesi
                                    </Link>
                                </Button>
                                <CreateModuleDialog
                                    courseId={course.id}
                                    nextOrder={(course.Module.length || 0) + 1}
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {course.Module.length > 0 ? (
                                <div className="space-y-4">
                                    {course.Module.map((module, idx) => (
                                        <div key={module.id} className="p-4 rounded-lg bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500 dark:text-blue-400 font-bold text-sm">
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-slate-900 dark:text-white">{module.title}</h4>
                                                        {module.description && (
                                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{module.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <EditModuleDialog module={module} />
                                            </div>
                                            <div className="ml-11 space-y-2">
                                                {module.Lesson.map((lesson) => (
                                                    <div key={lesson.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800/50">
                                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                                            <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600" />
                                                            {lesson.title}
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xs text-slate-500">{lesson.contentType}</span>
                                                            <EditLessonDialog lesson={lesson} />
                                                        </div>
                                                    </div>
                                                ))}
                                                <CreateLessonDialog
                                                    moduleId={module.id}
                                                    nextOrder={(module.Lesson.length || 0) + 1}
                                                />

                                                {/* Quizzes */}
                                                <div className="mt-4 space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4">
                                                    <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Evaluasi / Kuis</h5>
                                                    {(module as any).Quiz.length > 0 ? (
                                                        (module as any).Quiz.map((quiz: any) => (
                                                            <div key={quiz.id} className="flex items-center justify-between p-2 rounded bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/10 transition-colors">
                                                                <div className="flex items-center gap-2 text-sm text-blue-300">
                                                                    <FileQuestion className="w-4 h-4" />
                                                                    {quiz.title}
                                                                    <Badge variant="outline" className="text-[10px] border-blue-500/20 text-blue-400">
                                                                        {quiz.type}
                                                                    </Badge>
                                                                </div>
                                                                <Button variant="ghost" size="sm" asChild className="h-7 text-xs text-blue-400 hover:text-blue-300">
                                                                    <Link href={`/dashboard/quizzes/${quiz.id}/edit`}>
                                                                        Edit Kuis
                                                                    </Link>
                                                                </Button>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-xs text-slate-600 italic">Belum ada kuis evaluasi</p>
                                                    )}
                                                    <CreateQuizDialog moduleId={module.id} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-500">
                                    <p className="mb-4">Belum ada modul. Mulai tambahkan modul pertama Anda.</p>
                                    <CreateModuleDialog
                                        courseId={course.id}
                                        nextOrder={1}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
