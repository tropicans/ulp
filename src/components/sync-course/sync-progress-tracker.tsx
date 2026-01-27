"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
    BookOpen,
    Video,
    FileQuestion,
    CheckCircle2,
    Circle,
    ChevronRight,
    Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { SyncCourseStatus } from "@/generated/prisma"

interface SyncProgressTrackerProps {
    courseSlug: string
    progress: {
        status: SyncCourseStatus
        preLearnAccessedAt: Date | null
        liveAccessedAt: Date | null
        postLearnSubmittedAt: Date | null
        completedAt: Date | null
    }
    className?: string
}

const steps = [
    {
        id: "pre-learning",
        title: "Pre-Learning",
        subtitle: "Advance Organizer",
        icon: BookOpen,
        path: "pre-learning"
    },
    {
        id: "live",
        title: "Live Session",
        subtitle: "YouTube Live",
        icon: Video,
        path: "live"
    },
    {
        id: "validation",
        title: "Concept Validation",
        subtitle: "Assessment",
        icon: FileQuestion,
        path: "validation"
    }
]

export function SyncProgressTracker({ courseSlug, progress, className }: SyncProgressTrackerProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <Card className={cn("border-slate-200 dark:border-slate-800", className)}>
                <CardContent className="p-6 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </CardContent>
            </Card>
        )
    }

    const getStepStatus = (stepId: string) => {
        switch (stepId) {
            case "pre-learning":
                return !!progress.preLearnAccessedAt
            case "live":
                return !!progress.liveAccessedAt
            case "validation":
                return !!progress.postLearnSubmittedAt
            default:
                return false
        }
    }

    const getCurrentStep = () => {
        if (!progress.preLearnAccessedAt) return 0
        if (!progress.liveAccessedAt) return 1
        if (!progress.postLearnSubmittedAt) return 2
        return 3 // All completed
    }

    const currentStep = getCurrentStep()
    const progressPercent = Math.round((currentStep / 3) * 100)

    const isCompleted = progress.status === SyncCourseStatus.COMPLETED

    return (
        <Card className={cn(
            "border-slate-200 dark:border-slate-800 overflow-hidden",
            isCompleted && "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-900",
            className
        )}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                            <Circle className="w-5 h-5 text-blue-500" />
                        )}
                        Progress Pembelajaran
                    </CardTitle>
                    <Badge
                        variant={isCompleted ? "default" : "outline"}
                        className={cn(
                            "text-[10px] font-black uppercase tracking-widest",
                            isCompleted && "bg-green-600 hover:bg-green-600"
                        )}
                    >
                        {isCompleted ? "Selesai" : `${progressPercent}%`}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-6 pt-2">
                {/* Progress Bar */}
                <Progress
                    value={progressPercent}
                    className={cn(
                        "h-2 mb-6",
                        isCompleted ? "bg-green-200 dark:bg-green-900/30" : "bg-slate-200 dark:bg-slate-800"
                    )}
                />

                {/* Steps */}
                <div className="space-y-3">
                    {steps.map((step, index) => {
                        const isStepCompleted = getStepStatus(step.id)
                        const isCurrentStep = currentStep === index
                        const isAccessible = index <= currentStep

                        return (
                            <Link
                                key={step.id}
                                href={isAccessible ? `/courses/${courseSlug}/sync/${step.path}` : "#"}
                                className={cn(
                                    "block p-4 rounded-xl border transition-all",
                                    isStepCompleted
                                        ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
                                        : isCurrentStep
                                            ? "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800"
                                            : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800",
                                    isAccessible && "hover:shadow-md hover:scale-[1.01]",
                                    !isAccessible && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center",
                                        isStepCompleted
                                            ? "bg-green-500 text-white"
                                            : isCurrentStep
                                                ? "bg-blue-500 text-white"
                                                : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                                    )}>
                                        {isStepCompleted ? (
                                            <CheckCircle2 className="w-5 h-5" />
                                        ) : (
                                            <step.icon className="w-5 h-5" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className={cn(
                                            "font-bold text-sm",
                                            isStepCompleted
                                                ? "text-green-700 dark:text-green-400"
                                                : isCurrentStep
                                                    ? "text-blue-700 dark:text-blue-400"
                                                    : "text-slate-700 dark:text-slate-400"
                                        )}>
                                            {step.title}
                                        </h4>
                                        <p className="text-xs text-slate-500">{step.subtitle}</p>
                                    </div>
                                    {isAccessible && (
                                        <ChevronRight className={cn(
                                            "w-5 h-5",
                                            isStepCompleted
                                                ? "text-green-500"
                                                : isCurrentStep
                                                    ? "text-blue-500"
                                                    : "text-slate-400"
                                        )} />
                                    )}
                                </div>
                            </Link>
                        )
                    })}
                </div>

                {isCompleted && (
                    <div className="mt-6 p-4 rounded-xl bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                        <p className="text-sm text-green-700 dark:text-green-400 text-center font-medium">
                            🎉 Selamat! Anda telah menyelesaikan seluruh rangkaian pembelajaran sinkronus.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
