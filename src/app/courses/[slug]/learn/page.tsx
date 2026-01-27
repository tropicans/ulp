import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { CourseSidebar } from "@/components/learning/course-sidebar"
import { MobileSidebar } from "@/components/learning/mobile-sidebar"
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

    // Check if verification is required
    const verificationSetting = await prisma.systemSetting.findUnique({
        where: { key: "require_email_verification" }
    })

    if (verificationSetting?.value === "true") {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { emailVerified: true, phoneVerified: true }
        })

        // Redirect to verify page if not verified
        if (!user?.emailVerified && !user?.phoneVerified) {
            redirect("/verify")
        }
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

    // For SYNC_ONLINE courses, check if pre-learning has been accessed
    // If not, redirect to pre-learning first
    if (course.deliveryMode === "SYNC_ONLINE" || course.deliveryMode === "HYBRID") {
        const progress = await prisma.syncCourseProgress.findUnique({
            where: {
                userId_courseId: {
                    userId: session.user.id,
                    courseId: course.id
                }
            }
        })

        // If no progress record or pre-learning not accessed, redirect to pre-learning
        if (!progress || !progress.preLearnAccessedAt) {
            redirect(`/courses/${slug}/sync/pre-learning`)
        }
    }

    // Fetch refined titles and durations from yt_playlist_items for lessons with ytVideoId
    const allLessonsWithYtId = course.Module.flatMap(m => m.Lesson.filter(l => l.ytVideoId))
    const ytVideoIds = allLessonsWithYtId.map(l => l.ytVideoId).filter((id): id is string => !!id)

    const ytItems = ytVideoIds.length > 0 ? await prisma.ytPlaylistItem.findMany({
        where: { videoId: { in: ytVideoIds } },
        select: { videoId: true, refinedTitle: true, durationStr: true }
    }) : []

    // Create maps of videoId -> refinedTitle and videoId -> durationStr
    const refinedTitleMap: Record<string, string> = {}
    const durationMap: Record<string, string> = {}
    ytItems.forEach(item => {
        if (item.refinedTitle) {
            refinedTitleMap[item.videoId] = item.refinedTitle
        }
        if (item.durationStr) {
            durationMap[item.videoId] = item.durationStr
        }
    })

    // Calculate overall progress for sidebar
    const completedLessons = course.Module.flatMap(m =>
        m.Lesson.filter(l => l.Progress && l.Progress.length > 0 && !!l.Progress[0].completedAt).map(l => l.id)
    )

    const sidebarProgress = {
        completedLessons,
        sessions: course.CourseSession,
        deliveryMode: course.deliveryMode,
        refinedTitleMap,
    }

    const currentLessonId = resolvedSearchParams.lesson
    const currentQuizId = resolvedSearchParams.quiz
    const attemptId = resolvedSearchParams.attempt

    let currentLesson = null
    let currentQuiz = null
    let attemptData: Awaited<ReturnType<typeof getAttemptResult>> = null

    if (attemptId) {
        attemptData = await getAttemptResult(attemptId)
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

    // Find PRETEST and POSTTEST
    let pretestQuiz = null
    let posttestQuiz = null
    let pretestCompleted = false
    let allLessonsCompleted = false

    for (const module of course.Module) {
        const pretest = module.Quiz.find(q => q.type === 'PRETEST')
        if (pretest) pretestQuiz = pretest

        const posttest = module.Quiz.find(q => q.type === 'POSTTEST')
        if (posttest) posttestQuiz = posttest
    }

    // Check if user completed pretest
    if (pretestQuiz) {
        const pretestAttempt = await prisma.quizAttempt.findFirst({
            where: {
                quizId: pretestQuiz.id,
                userId: session.user.id,
                submittedAt: { not: null }
            }
        })
        pretestCompleted = !!pretestAttempt
    }

    // Check if all lessons are completed
    const totalLessons = course.Module.flatMap(m => m.Lesson).length
    allLessonsCompleted = completedLessons.length === totalLessons && totalLessons > 0

    // ENFORCE PRETEST: If pretest exists and not completed, force user to pretest
    if (pretestQuiz && !pretestCompleted && !currentQuizId && !attemptId) {
        currentQuiz = pretestQuiz
        currentLesson = null
    }
    // SHOW POSTTEST: If all lessons completed and posttest exists, show posttest
    else if (allLessonsCompleted && posttestQuiz && !currentLessonId && !currentQuizId && !attemptId) {
        currentQuiz = posttestQuiz
        currentLesson = null
    }
    // Default to first lesson (only if pretest is completed or doesn't exist)
    else if (!currentLesson && !currentQuiz && course.Module[0]?.Lesson[0]) {
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

    // Flatten all lessons to calculate next lesson
    const allLessons = course.Module.flatMap(m => m.Lesson)
    const currentLessonIndex = currentLesson ? allLessons.findIndex(l => l.id === currentLesson.id) : -1
    const nextLesson = currentLessonIndex >= 0 && currentLessonIndex < allLessons.length - 1
        ? allLessons[currentLessonIndex + 1]
        : null

    // Fetch knowledge check and summary from yt_playlist_items if lesson has ytVideoId
    let knowledgeCheck = null
    let videoSummary: string | null = null
    if (currentLesson?.ytVideoId) {
        const ytItem = await prisma.ytPlaylistItem.findFirst({
            where: { videoId: currentLesson.ytVideoId },
            select: { quizKnowledgeCheck: true, summary: true }
        })
        if (ytItem?.quizKnowledgeCheck) {
            try {
                knowledgeCheck = JSON.parse(ytItem.quizKnowledgeCheck)
            } catch (e) {
                console.error('Failed to parse knowledge check:', e)
            }
        }
        if (ytItem?.summary) {
            videoSummary = ytItem.summary
        }
    }

    // Check quiz attempts if viewing a quiz
    let attemptCount = 0
    let hasExceededAttempts = false
    let remainingAttempts = 0

    if (currentQuiz) {
        attemptCount = await prisma.quizAttempt.count({
            where: {
                quizId: currentQuiz.id,
                userId: session.user.id
            }
        })
        hasExceededAttempts = attemptCount >= currentQuiz.maxAttempts
        remainingAttempts = currentQuiz.maxAttempts - attemptCount
    }

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col">
            {/* Header */}
            <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 px-4 md:px-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {/* Mobile Hamburger Menu */}
                    <MobileSidebar
                        course={course}
                        modules={course.Module as any}
                        currentLessonId={currentLesson?.id}
                        currentQuizId={currentQuiz?.id}
                        progress={sidebarProgress}
                    />

                    <Button asChild variant="ghost" size="sm" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                        <Link href={`/courses/${slug}`}>
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Kembali</span>
                        </Link>
                    </Button>
                    <div className="hidden md:block border-l border-slate-200 dark:border-slate-700 pl-3">
                        <h1 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{course.title}</h1>
                    </div>
                </div>
            </header>

            {/* Main Layout */}
            <div className="flex flex-1 overflow-hidden">
                {/* Desktop Sidebar - reduced width */}
                <aside className="w-64 xl:w-72 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hidden lg:block overflow-y-auto flex-shrink-0">
                    <CourseSidebar
                        course={course}
                        modules={course.Module as any}
                        currentLessonId={currentLesson?.id}
                        currentQuizId={currentQuiz?.id}
                        progress={sidebarProgress}
                    />
                </aside>

                {/* Content Area - increased max width */}
                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6">
                        {attemptData ? (
                            <QuizResult
                                attempt={attemptData}
                                quiz={attemptData.Quiz}
                                courseSlug={slug}
                            />
                        ) : currentQuiz ? (
                            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Error Message if max attempts */}
                                {hasExceededAttempts && (
                                    <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-900/20 border-2 border-red-500/30">
                                        <div className="flex items-start gap-4">
                                            <div className="p-2 rounded-lg bg-red-500/20">
                                                <FileQuestion className="w-6 h-6 text-red-600 dark:text-red-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-red-900 dark:text-red-100 mb-2">
                                                    Batas Percobaan Tercapai
                                                </h3>
                                                <p className="text-sm text-red-700 dark:text-red-300">
                                                    Anda telah menggunakan semua {currentQuiz.maxAttempts} percobaan untuk {currentQuiz.type === 'PRETEST' ? 'pretest' : 'posttest'} ini.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

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

                                    {hasExceededAttempts ? (
                                        <Button size="lg" className="h-14 w-full bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold rounded-2xl cursor-not-allowed" disabled>
                                            Batas Percobaan Tercapai
                                        </Button>
                                    ) : (
                                        <Button size="lg" className="h-14 w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-purple-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]" asChild>
                                            <Link href={`/courses/${slug}/quizzes/${currentQuiz.id}/take`}>
                                                Mulai Kerjakan Sekarang
                                            </Link>
                                        </Button>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-blue-400 text-sm">
                                    <BookOpen className="w-5 h-5 flex-shrink-0" />
                                    <p>
                                        {hasExceededAttempts
                                            ? `Anda telah menggunakan semua percobaan (${currentQuiz.maxAttempts}x).`
                                            : `Sisa percobaan: ${remainingAttempts}x dari ${currentQuiz.maxAttempts}x total.`
                                        }
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <LessonViewer
                                key={currentLesson?.id || 'lesson'}
                                lesson={currentLesson as any}
                                isCompleted={!!isCompleted}
                                knowledgeCheck={knowledgeCheck}
                                videoSummary={videoSummary}
                                videoDuration={currentLesson?.ytVideoId ? durationMap[currentLesson.ytVideoId] : null}
                                refinedTitle={currentLesson?.ytVideoId ? refinedTitleMap[currentLesson.ytVideoId] : null}
                                nextLessonId={nextLesson?.id || null}
                                courseSlug={slug}
                            />
                        )}
                    </div>
                </main>
            </div>
        </div>
    )
}
