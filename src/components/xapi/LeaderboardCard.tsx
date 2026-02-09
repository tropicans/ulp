"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react"
import { getLearnerLeaderboard } from "@/lib/actions/xapi-extended-analytics"

interface LeaderboardEntry {
    userId: string
    name: string
    email: string
    image?: string
    activityCount: number
    enrollments: number
    completions: number
    trend: "up" | "down" | "stable"
}

export function LeaderboardCard() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getLearnerLeaderboard(10).then(result => {
            setLeaderboard(result.leaderboard)
            setLoading(false)
        })
    }, [])

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case "up": return <TrendingUp className="w-3 h-3 text-green-500" />
            case "down": return <TrendingDown className="w-3 h-3 text-red-500" />
            default: return <Minus className="w-3 h-3 text-slate-400" />
        }
    }

    const getRankBadge = (index: number) => {
        if (index === 0) return "🥇"
        if (index === 1) return "🥈"
        if (index === 2) return "🥉"
        return `#${index + 1}`
    }

    if (loading) {
        return (
            <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-slate-900 dark:text-white text-lg flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        Top Learners
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
            <CardHeader className="pb-3">
                <CardTitle className="text-slate-900 dark:text-white text-lg flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    Top Learners
                </CardTitle>
            </CardHeader>
            <CardContent>
                {leaderboard.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Belum ada data learner</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {leaderboard.map((learner, index) => (
                            <div
                                key={learner.userId}
                                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${index < 3 ? "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                                    }`}
                            >
                                {/* Rank */}
                                <div className="w-8 text-center font-bold text-lg">
                                    {getRankBadge(index)}
                                </div>

                                {/* Avatar */}
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                                    {learner.image ? (
                                        <img src={learner.image} alt={learner.name} className="w-full h-full object-cover" />
                                    ) : (
                                        learner.name.charAt(0).toUpperCase()
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                        {learner.name}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">
                                        {learner.completions} completed • {learner.enrollments} enrolled
                                    </p>
                                </div>

                                {/* Stats */}
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-xs">
                                        {learner.activityCount}
                                    </Badge>
                                    {getTrendIcon(learner.trend)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
