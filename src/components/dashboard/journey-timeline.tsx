"use client"

import { motion } from "framer-motion"
import {
    BookOpen,
    CheckCircle2,
    FileText,
    Award,
    PlayCircle,
    Calendar,
    XCircle,
    ClipboardCheck
} from "lucide-react"
import { JourneyActivity } from "@/lib/actions/journey"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface JourneyTimelineProps {
    activities: JourneyActivity[]
}

const activityConfig: Record<string, { icon: any, color: string, bg: string, label: string }> = {
    ENROLLMENT: {
        icon: BookOpen,
        color: "text-blue-500",
        bg: "bg-blue-500/10",
        label: "Enrolled in Course"
    },
    QUIZ_PASS: {
        icon: CheckCircle2,
        color: "text-green-500",
        bg: "bg-green-500/10",
        label: "Quiz Passed"
    },
    QUIZ_FAIL: {
        icon: XCircle,
        color: "text-red-500",
        bg: "bg-red-500/10",
        label: "Quiz Attempt"
    },
    CERTIFICATE: {
        icon: Award,
        color: "text-yellow-500",
        bg: "bg-yellow-500/10",
        label: "Certificate Earned"
    },
    VIDEO_COMPLETE: {
        icon: PlayCircle,
        color: "text-purple-500",
        bg: "bg-purple-500/10",
        label: "Video Completed"
    },
    ATTENDANCE: {
        icon: Calendar,
        color: "text-indigo-500",
        bg: "bg-indigo-500/10",
        label: "Attended Session"
    },
    DEFAULT: {
        icon: FileText,
        color: "text-slate-500",
        bg: "bg-slate-500/10",
        label: "Activity"
    }
}

export function JourneyTimeline({ activities }: JourneyTimelineProps) {
    if (activities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <ClipboardCheck className="w-12 h-12 mb-4 opacity-20" />
                <p>No activities found in your journey yet.</p>
            </div>
        )
    }

    return (
        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-800 before:to-transparent">
            {activities.map((activity, index) => {
                const config = activityConfig[activity.type] || activityConfig.DEFAULT
                const Icon = config.icon

                return (
                    <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
                    >
                        {/* Dot */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-slate-50 dark:bg-slate-900 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                            <div className={cn("p-1.5 rounded-full", config.bg)}>
                                <Icon className={cn("w-4 h-4", config.color)} />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-1">
                                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", config.bg, config.color)}>
                                    {config.label}
                                </span>
                                <time className="text-xs text-slate-500 font-mono">
                                    {format(new Date(activity.occurredAt), "PPP p")}
                                </time>
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {activity.title}
                            </h3>
                            {activity.metadata && (
                                <div className="mt-2 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
                                    {activity.type === "QUIZ_PASS" || activity.type === "QUIZ_FAIL" ? (
                                        <p>Score: <span className="font-semibold text-slate-700 dark:text-slate-300">{activity.metadata.score}%</span></p>
                                    ) : activity.type === "VIDEO_COMPLETE" ? (
                                        <p>Duration: <span className="font-semibold text-slate-700 dark:text-slate-300">{Math.floor(activity.metadata.duration / 60)}m {activity.metadata.duration % 60}s</span></p>
                                    ) : activity.type === "ATTENDANCE" ? (
                                        <p>Method: <span className="font-semibold text-slate-700 dark:text-slate-300">{activity.metadata.method}</span> • Status: {activity.metadata.status}</p>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )
            })}
        </div>
    )
}
