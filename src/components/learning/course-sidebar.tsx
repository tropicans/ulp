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
    const [expandedModules, setExpandedModules] = useState<Set<string>>(
        new Set(modules.map((m) => m.id))
    )

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

    return (
        <div className="h-full overflow-y-auto bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
            <div className="p-3">
                <div className="space-y-2">
                    {/* PRETEST Section */}
                    {modules.some(m => m.Quiz?.some(q => q.type === 'PRETEST')) && (
                        <>
                            {modules.map(module =>
                                module.Quiz?.filter(q => q.type === 'PRETEST').map(quiz => {
                                    const active = quiz.id === currentQuizId
                                    return (
                                        <div key={quiz.id} className="mb-4">
                                            <Link
                                                href={`/courses/${course.slug}/learn?quiz=${quiz.id}`}
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-lg transition-colors border-2",
                                                    active
                                                        ? "bg-yellow-600/20 text-yellow-600 dark:text-yellow-400 border-yellow-600/40"
                                                        : "hover:bg-yellow-50 dark:hover:bg-yellow-900/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-yellow-500/20"
                                                )}
                                            >
                                                <div className="p-2 rounded-lg bg-yellow-500/20">
                                                    <FileQuestion className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold truncate">
                                                        {quiz.title}
                                                    </p>
                                                    <p className="text-[10px] text-yellow-600 dark:text-yellow-500 font-bold uppercase tracking-wider">
                                                        Tes Awal (Wajib)
                                                    </p>
                                                </div>
                                            </Link>
                                            <div className="ml-4 mt-2 border-l-2 border-dashed border-slate-300 dark:border-slate-700 h-4" />
                                        </div>
                                    )
                                })
                            )}
                        </>
                    )}

                    {/* Regular Modules */}
                    {modules.map((module) => {
                        const isExpanded = expandedModules.has(module.id)
                        const completedLessons = module.Lesson.filter(l => isLessonCompleted(l.id)).length
                        const totalItems = module.Lesson.length + (module.Quiz?.length || 0)
                        const moduleDone = completedLessons === module.Lesson.length && totalItems > 0

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
                                                {completedLessons}/{module.Lesson.length} materi selesai
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
                                        {module.Lesson.map((lesson) => {
                                            const completed = isLessonCompleted(lesson.id)
                                            const active = lesson.id === currentLessonId
                                            // Use refined title if available from yt_playlist_items
                                            const displayTitle = (lesson.ytVideoId && progress?.refinedTitleMap?.[lesson.ytVideoId])
                                                ? progress.refinedTitleMap[lesson.ytVideoId]
                                                : lesson.title

                                            return (
                                                <Link
                                                    key={lesson.id}
                                                    href={`/courses/${course.slug}/learn?lesson=${lesson.id}`}
                                                    className={cn(
                                                        "flex items-center gap-2 p-2 rounded-lg transition-colors group",
                                                        active
                                                            ? "bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-600/20"
                                                            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent"
                                                    )}
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
                                        {module.Quiz?.filter(q => q.type !== 'PRETEST' && q.type !== 'POSTTEST').map((quiz) => {
                                            const active = quiz.id === currentQuizId
                                            // In a full implementation, we'd check if quiz is passed
                                            return (
                                                <Link
                                                    key={quiz.id}
                                                    href={`/courses/${course.slug}/learn?quiz=${quiz.id}`}
                                                    className={cn(
                                                        "flex items-center gap-2 p-2 rounded-lg transition-colors group",
                                                        active
                                                            ? "bg-purple-600/20 text-purple-600 dark:text-purple-400 border border-purple-600/20"
                                                            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent"
                                                    )}
                                                >
                                                    <FileQuestion className={cn("w-4 h-4 flex-shrink-0", active ? "text-purple-400" : "text-purple-500/50")} />
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

                    {/* POSTTEST Section */}
                    {modules.some(m => m.Quiz?.some(q => q.type === 'POSTTEST')) && (
                        <>
                            <div className="ml-4 mt-2 border-l-2 border-dashed border-slate-300 dark:border-slate-700 h-4" />
                            {modules.map(module =>
                                module.Quiz?.filter(q => q.type === 'POSTTEST').map(quiz => {
                                    const active = quiz.id === currentQuizId
                                    const allLessonsComplete = modules.every(m =>
                                        m.Lesson.every(l => progress?.completedLessons?.includes(l.id))
                                    )
                                    return (
                                        <div key={quiz.id} className="mt-2">
                                            <Link
                                                href={`/courses/${course.slug}/learn?quiz=${quiz.id}`}
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-lg transition-colors border-2",
                                                    active
                                                        ? "bg-green-600/20 text-green-600 dark:text-green-400 border-green-600/40"
                                                        : allLessonsComplete
                                                            ? "hover:bg-green-50 dark:hover:bg-green-900/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-green-500/20"
                                                            : "opacity-50 cursor-not-allowed border-slate-300 dark:border-slate-700"
                                                )}
                                                onClick={(e) => !allLessonsComplete && e.preventDefault()}
                                            >
                                                <div className={cn(
                                                    "p-2 rounded-lg",
                                                    allLessonsComplete ? "bg-green-500/20" : "bg-slate-200 dark:bg-slate-700"
                                                )}>
                                                    <FileQuestion className={cn(
                                                        "w-5 h-5",
                                                        allLessonsComplete ? "text-green-600 dark:text-green-400" : "text-slate-400"
                                                    )} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold truncate">
                                                        {quiz.title}
                                                    </p>
                                                    <p className={cn(
                                                        "text-[10px] font-bold uppercase tracking-wider",
                                                        allLessonsComplete
                                                            ? "text-green-600 dark:text-green-500"
                                                            : "text-slate-400"
                                                    )}>
                                                        {allLessonsComplete ? "Evaluasi Akhir" : "Locked"}
                                                    </p>
                                                </div>
                                            </Link>
                                        </div>
                                    )
                                })
                            )}
                        </>
                    )}
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
