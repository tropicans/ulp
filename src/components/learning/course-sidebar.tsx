"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import {
    FileText,
    PlayCircle,
    FileCheck,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    FileQuestion,
    Circle,
    Calendar,
    Video,
    MapPin,
    ExternalLink
} from "lucide-react"
import { useState } from "react"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { DeliveryMode } from "@/generated/prisma"

interface Module {
    id: string
    title: string
    order: number
    Lesson: {
        id: string
        title: string
        order: number
        duration: number | null
        contentType: string
        ytVideoId?: string | null
    }[]
    Quiz?: {
        id: string
        title: string
        order: number
        type: string
    }[]
}

interface CourseSession {
    id: string
    title: string
    type: string
    startTime: Date
    endTime: Date
    location?: string | null
    zoomJoinUrl?: string | null
}

interface CourseSidebarProps {
    course: any
    modules: Module[]
    currentLessonId?: string
    currentQuizId?: string
    progress: {
        completedLessons: string[]
        completedQuizzes: string[]
        sessions?: CourseSession[]
        deliveryMode?: DeliveryMode
        refinedTitleMap?: Record<string, string>
    }
}

const getContentIcon = (contentType: string) => {
    switch (contentType) {
        case "VIDEO":
            return <PlayCircle className="w-4 h-4 text-blue-500/50" />
        case "ARTICLE":
            return <FileText className="w-4 h-4 text-yellow-500/50" />
        case "QUIZ":
            return <FileCheck className="w-4 h-4 text-purple-500/50" />
        default:
            return <Circle className="w-4 h-4 text-gray-500/50" />
    }
}

export function CourseSidebar({
    course,
    modules,
    currentLessonId,
    currentQuizId,
    progress
}: CourseSidebarProps) {
    // Check if pretest/posttest exist
    const hasPretestQuiz = modules.some(m => m.Quiz?.some(q => q.type === 'PRETEST'))
    const hasPosttestQuiz = modules.some(m => m.Quiz?.some(q => q.type === 'POSTTEST'))

    // Initialize expanded sections with all modules + evaluasi-awal and evaluasi-akhir
    const [expandedModules, setExpandedModules] = useState<Set<string>>(() => {
        const initial = new Set(modules.map((m) => m.id))
        if (hasPretestQuiz) initial.add('evaluasi-awal')
        if (hasPosttestQuiz) initial.add('evaluasi-akhir')
        return initial
    })

    function toggleModule(moduleId: string) {
        const newExpanded = new Set(expandedModules)
        if (newExpanded.has(moduleId)) {
            newExpanded.delete(moduleId)
        } else {
            newExpanded.add(moduleId)
        }
        setExpandedModules(newExpanded)
    }

    // Helper to check completion if we only pass completed IDs
    const isLessonCompleted = (lessonId: string) => {
        return progress?.completedLessons?.includes(lessonId)
    }

    const isQuizCompleted = (quizId: string) => {
        return progress?.completedQuizzes?.includes(quizId)
    }

    // Create a flat list of all items in order for sequential check
    const flatItems: { id: string, type: 'lesson' | 'quiz', quizType?: string }[] = []

    // Add PRETEST first if any
    modules.forEach(m => {
        m.Quiz?.filter(q => q.type === 'PRETEST').forEach(q => {
            flatItems.push({ id: q.id, type: 'quiz', quizType: q.type })
        })
    })

    // Add regular modules in order
    modules.forEach(m => {
        (m.Lesson || []).forEach(l => {
            flatItems.push({ id: l.id, type: 'lesson' })
        })
        m.Quiz?.filter(q => q.type !== 'PRETEST' && q.type !== 'POSTTEST').forEach(q => {
            flatItems.push({ id: q.id, type: 'quiz', quizType: q.type })
        })
    })

    // Add POSTTEST last
    modules.forEach(m => {
        m.Quiz?.filter(q => q.type === 'POSTTEST').forEach(q => {
            flatItems.push({ id: q.id, type: 'quiz', quizType: q.type })
        })
    })

    const isUnlocked = (itemId: string) => {
        const index = flatItems.findIndex(i => i.id === itemId)
        if (index <= 0) return true // First item (Pretest) is always unlocked

        const prevItem = flatItems[index - 1]
        if (prevItem.type === 'lesson') return isLessonCompleted(prevItem.id)
        return isQuizCompleted(prevItem.id)
    }

    return (
        <div className="h-full overflow-y-auto bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
            <div className="p-3">
                <div className="space-y-2">
                    {/* Evaluasi Awal Section (contains PRETEST) */}
                    {hasPretestQuiz && (() => {
                        const isEvaluasiAwalExpanded = expandedModules.has('evaluasi-awal')
                        const allPretests = modules.flatMap(m => (m.Quiz || []).filter(q => q.type === 'PRETEST'))
                        const completedPretests = allPretests.filter(q => isQuizCompleted(q.id)).length
                        const allPretestsDone = completedPretests === allPretests.length && allPretests.length > 0

                        return (
                            <div className="space-y-1">
                                {/* Section Header */}
                                <button
                                    onClick={() => toggleModule('evaluasi-awal')}
                                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-2 flex-1">
                                        {isEvaluasiAwalExpanded ? (
                                            <ChevronDown className="w-4 h-4 text-slate-500 dark:text-gray-400" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-slate-500 dark:text-gray-400" />
                                        )}
                                        <div className="flex-1">
                                            <h3 className="font-medium text-slate-900 dark:text-white text-sm">
                                                Evaluasi Awal
                                            </h3>
                                            <p className="text-xs text-slate-500">
                                                {completedPretests}/{allPretests.length} materi selesai
                                            </p>
                                        </div>
                                    </div>
                                    {allPretestsDone && (
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    )}
                                </button>

                                {/* Pretest Items */}
                                {isEvaluasiAwalExpanded && (
                                    <div className="ml-6 space-y-1">
                                        {modules.map(module =>
                                            (module.Quiz || []).filter(q => q.type === 'PRETEST').map(quiz => {
                                                const active = quiz.id === currentQuizId
                                                const unlocked = isUnlocked(quiz.id)
                                                const completed = isQuizCompleted(quiz.id)

                                                return (
                                                    <Link
                                                        key={quiz.id}
                                                        href={unlocked ? `/courses/${course.slug}/learn?quiz=${quiz.id}` : "#"}
                                                        onClick={(e) => !unlocked && e.preventDefault()}
                                                        className={cn(
                                                            "flex items-center gap-2 p-2 rounded-lg transition-colors group",
                                                            active
                                                                ? "bg-yellow-600/20 text-yellow-600 dark:text-yellow-400 border border-yellow-600/20"
                                                                : unlocked
                                                                    ? "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent"
                                                                    : "opacity-40 cursor-not-allowed grayscale"
                                                        )}
                                                        title={quiz.title}
                                                    >
                                                        {completed ? (
                                                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                        ) : (
                                                            <FileQuestion className={cn("w-4 h-4 flex-shrink-0", active ? "text-yellow-400" : "text-yellow-500/50")} />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate">
                                                                {quiz.title}
                                                            </p>
                                                            <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-wider">PRE-TEST</p>
                                                        </div>
                                                    </Link>
                                                )
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })()}

                    {/* Regular Modules - exclude modules that only contain PRETEST/POSTTEST */}
                    {modules
                        .filter(module => {
                            // Check if module has any lessons
                            const hasLessons = (module.Lesson || []).length > 0
                            // Check if module has any regular quizzes (not PRETEST/POSTTEST)
                            const hasRegularQuizzes = (module.Quiz || []).some(q => q.type !== 'PRETEST' && q.type !== 'POSTTEST')
                            // Include module only if it has content (lessons or regular quizzes)
                            return hasLessons || hasRegularQuizzes
                        })
                        .map((module) => {
                            const isExpanded = expandedModules.has(module.id)
                            const lessons = module.Lesson || []
                            const completedLessons = lessons.filter(l => isLessonCompleted(l.id)).length
                            const totalItems = lessons.length + (module.Quiz?.length || 0)
                            const moduleDone = completedLessons === lessons.length && totalItems > 0

                            return (
                                <div key={module.id} className="space-y-1">
                                    {/* Module Header */}
                                    <button
                                        onClick={() => toggleModule(module.id)}
                                        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-2 flex-1">
                                            {isExpanded ? (
                                                <ChevronDown className="w-4 h-4 text-slate-500 dark:text-gray-400" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-slate-500 dark:text-gray-400" />
                                            )}
                                            <div className="flex-1">
                                                <h3 className="font-medium text-slate-900 dark:text-white text-sm">
                                                    {module.title}
                                                </h3>
                                                <p className="text-xs text-slate-500">
                                                    {completedLessons}/{lessons.length} materi selesai
                                                </p>
                                            </div>
                                        </div>
                                        {moduleDone && (
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        )}
                                    </button>

                                    {/* Content List */}
                                    {isExpanded && (
                                        <div className="ml-6 space-y-1">
                                            {lessons.map((lesson) => {
                                                const completed = isLessonCompleted(lesson.id)
                                                const unlocked = isUnlocked(lesson.id)
                                                const active = lesson.id === currentLessonId
                                                // Use refined title if available from yt_playlist_items
                                                const displayTitle = (lesson.ytVideoId && progress?.refinedTitleMap?.[lesson.ytVideoId])
                                                    ? progress.refinedTitleMap[lesson.ytVideoId]
                                                    : lesson.title

                                                return (
                                                    <Link
                                                        key={lesson.id}
                                                        href={unlocked ? `/courses/${course.slug}/learn?lesson=${lesson.id}` : "#"}
                                                        onClick={(e) => !unlocked && e.preventDefault()}
                                                        className={cn(
                                                            "flex items-center gap-2 p-2 rounded-lg transition-colors group",
                                                            active
                                                                ? "bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-600/20"
                                                                : unlocked
                                                                    ? "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent"
                                                                    : "opacity-40 cursor-not-allowed grayscale"
                                                        )}
                                                        title={displayTitle}
                                                    >
                                                        {completed ? (
                                                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                        ) : (
                                                            getContentIcon(lesson.contentType)
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate">
                                                                {displayTitle}
                                                            </p>
                                                        </div>
                                                    </Link>
                                                )
                                            })}

                                            {/* Quizzes - exclude PRETEST and POSTTEST as they're shown separately */}
                                            {(module.Quiz || []).filter(q => q.type !== 'PRETEST' && q.type !== 'POSTTEST').map((quiz) => {
                                                const active = quiz.id === currentQuizId
                                                const unlocked = isUnlocked(quiz.id)
                                                const completed = isQuizCompleted(quiz.id)

                                                return (
                                                    <Link
                                                        key={quiz.id}
                                                        href={unlocked ? `/courses/${course.slug}/learn?quiz=${quiz.id}` : "#"}
                                                        onClick={(e) => !unlocked && e.preventDefault()}
                                                        className={cn(
                                                            "flex items-center gap-2 p-2 rounded-lg transition-colors group",
                                                            active
                                                                ? "bg-purple-600/20 text-purple-600 dark:text-purple-400 border border-purple-600/20"
                                                                : unlocked
                                                                    ? "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent"
                                                                    : "opacity-40 cursor-not-allowed grayscale"
                                                        )}
                                                        title={quiz.title}
                                                    >
                                                        {completed ? (
                                                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                        ) : (
                                                            <FileQuestion className={cn("w-4 h-4 flex-shrink-0", active ? "text-purple-400" : "text-purple-500/50")} />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate">
                                                                {quiz.title}
                                                            </p>
                                                            <p className="text-[10px] text-purple-500 font-bold uppercase tracking-wider">KUIS</p>
                                                        </div>
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                    {/* Evaluasi & Ujian Section (contains POSTTEST) */}
                    {hasPosttestQuiz && (() => {
                        const isEvaluasiAkhirExpanded = expandedModules.has('evaluasi-akhir')
                        const allPosttests = modules.flatMap(m => (m.Quiz || []).filter(q => q.type === 'POSTTEST'))
                        const completedPosttests = allPosttests.filter(q => isQuizCompleted(q.id)).length
                        const allPosttestsDone = completedPosttests === allPosttests.length && allPosttests.length > 0

                        return (
                            <div className="space-y-1">
                                {/* Section Header */}
                                <button
                                    onClick={() => toggleModule('evaluasi-akhir')}
                                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-2 flex-1">
                                        {isEvaluasiAkhirExpanded ? (
                                            <ChevronDown className="w-4 h-4 text-slate-500 dark:text-gray-400" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-slate-500 dark:text-gray-400" />
                                        )}
                                        <div className="flex-1">
                                            <h3 className="font-medium text-slate-900 dark:text-white text-sm">
                                                Evaluasi & Ujian
                                            </h3>
                                            <p className="text-xs text-slate-500">
                                                {completedPosttests}/{allPosttests.length} materi selesai
                                            </p>
                                        </div>
                                    </div>
                                    {allPosttestsDone && (
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    )}
                                </button>

                                {/* Posttest Items */}
                                {isEvaluasiAkhirExpanded && (
                                    <div className="ml-6 space-y-1">
                                        {modules.map(module =>
                                            (module.Quiz || []).filter(q => q.type === 'POSTTEST').map(quiz => {
                                                const active = quiz.id === currentQuizId
                                                const unlocked = isUnlocked(quiz.id)
                                                const completed = isQuizCompleted(quiz.id)

                                                return (
                                                    <Link
                                                        key={quiz.id}
                                                        href={unlocked ? `/courses/${course.slug}/learn?quiz=${quiz.id}` : "#"}
                                                        onClick={(e) => !unlocked && e.preventDefault()}
                                                        className={cn(
                                                            "flex items-center gap-2 p-2 rounded-lg transition-colors group",
                                                            active
                                                                ? "bg-green-600/20 text-green-600 dark:text-green-400 border border-green-600/20"
                                                                : unlocked
                                                                    ? "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent"
                                                                    : "opacity-40 cursor-not-allowed grayscale"
                                                        )}
                                                        title={quiz.title}
                                                    >
                                                        {completed ? (
                                                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                        ) : (
                                                            <FileQuestion className={cn("w-4 h-4 flex-shrink-0", active ? "text-green-400" : unlocked ? "text-green-500/50" : "text-slate-400")} />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate">
                                                                {quiz.title}
                                                            </p>
                                                            <p className={cn(
                                                                "text-[10px] font-bold uppercase tracking-wider",
                                                                unlocked ? "text-green-500" : "text-slate-400"
                                                            )}>
                                                                {unlocked ? "POST-TEST" : "LOCKED"}
                                                            </p>
                                                        </div>
                                                    </Link>
                                                )
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })()}
                </div>

                {/* Session Section - Only for non-async modes */}
                {progress?.deliveryMode && progress.deliveryMode !== "ASYNC_ONLINE" && progress?.sessions && progress.sessions.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            {progress.deliveryMode === "SYNC_ONLINE" ? (
                                <Video className="w-5 h-5 text-purple-500" />
                            ) : (
                                <Calendar className="w-5 h-5 text-green-500" />
                            )}
                            {progress.deliveryMode === "SYNC_ONLINE" ? "Live Session" : "Sesi Kelas"}
                        </h2>
                        <div className="space-y-3">
                            {progress.sessions.map((session) => (
                                <div
                                    key={session.id}
                                    className="p-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 border border-slate-200 dark:border-slate-700"
                                >
                                    <p className="text-sm font-medium text-slate-900 dark:text-white mb-1 line-clamp-1">
                                        {session.title}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                        {format(new Date(session.startTime), "EEEE, dd MMM yyyy", { locale: localeId })}
                                    </p>
                                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                        {format(new Date(session.startTime), "HH:mm", { locale: localeId })} - {format(new Date(session.endTime), "HH:mm", { locale: localeId })} WIB
                                    </p>
                                    {session.location && (
                                        <div className="flex items-center gap-1 mt-2 text-xs text-slate-500 dark:text-slate-400">
                                            <MapPin className="w-3 h-3" />
                                            <span className="line-clamp-1">{session.location}</span>
                                        </div>
                                    )}
                                    {session.zoomJoinUrl && (
                                        <a
                                            href={session.zoomJoinUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            Gabung Zoom
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
