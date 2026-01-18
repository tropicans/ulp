import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { CourseSidebar } from "@/components/learning/course-sidebar"
import { LessonViewer } from "@/components/learning/lesson-viewer"
import { QuizResult } from "@/components/quizzes/quiz-result"
import { getAttemptResult } from "@/lib/actions/quizzes"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BookOpen, FileQuestion } from "lucide-react"
import Link from "next/link"

interface LearnPageProps {
    params: Promise<{ slug: string }>
    searchParams: Promise<{ lesson?: string; quiz?: string; attempt?: string }>
}

export default async function LearnPage({ params, searchParams }: LearnPageProps) {
    const { slug } = await params
    const resolvedSearchParams = await searchParams
    const session = await auth()
    if (!session?.user) {
        redirect(`/login?callbackUrl=/courses/${slug}/learn`)
    }

    // Get course with modules, lessons, quizzes, and sessions
    const course = await prisma.course.findUnique({
        where: { slug: slug },
        include: {
            User: {
                select: {
                    name: true,
                    image: true,
                },
            },
            Module: {
                orderBy: { order: "asc" },
                include: {
                    Lesson: {
                        orderBy: { order: "asc" },
                        include: {
                            Progress: {
                                where: { userId: session.user.id },
                            },
                        },
                    },
                    Quiz: {
                        orderBy: { updatedAt: "desc" },
                    },
                },
            },
            Enrollment: {
                where: { userId: session.user.id },
            },
            CourseSession: {
                where: {
                    startTime: { gte: new Date() }
                },
                orderBy: { startTime: "asc" },
                take: 3,
            },
        },
    })

    if (!course) notFound()

    // Check enrollment
    const isEnrolled = course.Enrollment.length > 0
    if (!isEnrolled && session.user.role === "LEARNER") {
        redirect(`/courses/${slug}`)
    }

    // Calculate overall progress for sidebar
    const completedLessons = course.Module.flatMap(m =>
        m.Lesson.filter(l => l.Progress && l.Progress.length > 0 && !!l.Progress[0].completedAt).map(l => l.id)
    )

    const sidebarProgress = {
        completedLessons,
        sessions: course.CourseSession,
        deliveryMode: course.deliveryMode,
    }

    const currentLessonId = resolvedSearchParams.lesson
    const currentQuizId = resolvedSearchParams.quiz
    const attemptId = resolvedSearchParams.attempt

    let currentLesson = null
    let currentQuiz = null
    let attemptData = null

    if (attemptId) {
        const result = await getAttemptResult(attemptId)
        if (result && 'attempt' in result && result.attempt) {
            attemptData = result.attempt
        }
    }

    if (currentQuizId) {
        for (const module of course.Module) {
            currentQuiz = module.Quiz.find(q => q.id === currentQuizId)
            if (currentQuiz) break
        }
    }

    if (!currentQuiz && currentLessonId) {
        for (const module of course.Module) {
            currentLesson = module.Lesson.find(l => l.id === currentLessonId)
            if (currentLesson) break
        }
    }

    // Default to first lesson
    if (!currentLesson && !currentQuiz && course.Module[0]?.Lesson[0]) {
        currentLesson = course.Module[0].Lesson[0]
    }

    if (!currentLesson && !currentQuiz) {
        return (
            <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center p-4">
                <div className="text-center space-y-4">
                    <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto" />
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Belum Ada Materi</h1>
                    <p className="text-slate-500 dark:text-slate-400">Course ini belum memiliki materi atau kuis.</p>
                    <Button asChild variant="outline" className="border-slate-200 dark:border-slate-700">
                        <Link href={`/courses/${slug}`}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Kembali ke Course
                        </Link>
                    </Button>
                </div>
            </div>
        )
    }

    const isCompleted = currentLesson ? currentLesson.Progress?.[0]?.completedAt : false

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col">
            {/* Header */}
            <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 px-4 md:px-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button asChild variant="ghost" size="sm" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                        <Link href={`/courses/${slug}`}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Kembali
                        </Link>
                    </Button>
                    <div className="hidden sm:block">
                        <h1 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{course.title}</h1>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-none mt-1">
                            Instruktur: {course.User.name}
                        </p>
                    </div>
                </div>
            </header>

            {/* Main Layout */}
            <div className="flex flex-1 overflow-hidden">
                {/* Desktop Sidebar */}
                <aside className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hidden lg:block overflow-y-auto">
                    <CourseSidebar
                        course={course}
                        modules={course.Module as any}
                        currentLessonId={currentLesson?.id}
                        currentQuizId={currentQuiz?.id}
                        progress={sidebarProgress}
                    />
                </aside>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto">
                    <div className="container max-w-4xl mx-auto px-4 py-8">
                        {attemptData ? (
                            <QuizResult
                                attempt={attemptData}
                                quiz={attemptData.Quiz}
                                courseSlug={slug}
                            />
                        ) : currentQuiz ? (
                            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl -mr-16 -mt-16 rounded-full" />
                                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 blur-3xl -ml-16 -mb-16 rounded-full" />

                                    <div className="w-20 h-20 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-purple-900/20 rotate-3">
                                        <FileQuestion className="w-12 h-12 text-white -rotate-3" />
                                    </div>

                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3">{currentQuiz.title}</h2>
                                    <p className="text-slate-500 dark:text-slate-400 mb-10 leading-relaxed">
                                        {currentQuiz.description || "Uji pemahaman Anda terhadap materi yang telah dipelajari dengan mengerjakan kuis evaluasi ini."}
                                    </p>

                                    <div className="grid grid-cols-2 gap-4 mb-10">
                                        <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 backdrop-blur-sm group hover:border-purple-500/30 transition-colors">
                                            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold mb-2">Passing Score</p>
                                            <p className="text-2xl font-black text-slate-900 dark:text-white">{currentQuiz.passingScore}%</p>
                                        </div>
                                        <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 backdrop-blur-sm group hover:border-blue-500/30 transition-colors">
                                            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold mb-2">Waktu Pengerjaan</p>
                                            <p className="text-2xl font-black text-slate-900 dark:text-white">
                                                {currentQuiz.timeLimit ? `${currentQuiz.timeLimit} Menit` : 'Tanpa Batas'}
                                            </p>
                                        </div>
                                    </div>

                                    <Button size="lg" className="h-14 w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-purple-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]" asChild>
                                        <Link href={`/courses/${slug}/quizzes/${currentQuiz.id}/take`}>
                                            Mulai Kerjakan Sekarang
                                        </Link>
                                    </Button>
                                </div>

                                <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-blue-400 text-sm">
                                    <BookOpen className="w-5 h-5 flex-shrink-0" />
                                    <p>Anda dapat mengulang kuis ini hingga <strong>{currentQuiz.maxAttempts} kali</strong>.</p>
                                </div>
                            </div>
                        ) : (
                            <LessonViewer
                                lesson={currentLesson as any}
                                isCompleted={!!isCompleted}
                            />
                        )}
                    </div>
                </main>
            </div>
        </div>
    )
}
