"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileQuestion, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { getQuizAnalytics } from "@/lib/actions/xapi-extended-analytics"

interface QuizAnalyticsItem {
    quizId: string
    title: string
    attempts: number
    passes: number
    passRate: number
    avgScore: number
}

export function QuizAnalyticsCard() {
    const [quizzes, setQuizzes] = useState<QuizAnalyticsItem[]>([])
    const [stats, setStats] = useState({ totalAttempts: 0, overallPassRate: 0, avgScore: 0 })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getQuizAnalytics().then(result => {
            setQuizzes(result.quizzes)
            setStats({
                totalAttempts: result.totalAttempts,
                overallPassRate: result.overallPassRate,
                avgScore: result.avgScore
            })
            setLoading(false)
        })
    }, [])

    const getPassRateColor = (rate: number) => {
        if (rate >= 80) return "text-green-600 bg-green-50 dark:bg-green-900/20"
        if (rate >= 60) return "text-amber-600 bg-amber-50 dark:bg-amber-900/20"
        return "text-red-600 bg-red-50 dark:bg-red-900/20"
    }

    if (loading) {
        return (
            <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-slate-900 dark:text-white text-lg flex items-center gap-2">
                        <FileQuestion className="w-5 h-5 text-orange-500" />
                        Quiz Analytics
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
                    <FileQuestion className="w-5 h-5 text-orange-500" />
                    Quiz Analytics
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                        <p className="text-lg font-bold text-orange-600">{stats.totalAttempts}</p>
                        <p className="text-[10px] text-slate-500 uppercase">Attempts</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                        <p className="text-lg font-bold text-green-600">{stats.overallPassRate}%</p>
                        <p className="text-[10px] text-slate-500 uppercase">Pass Rate</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                        <p className="text-lg font-bold text-indigo-600">{stats.avgScore}%</p>
                        <p className="text-[10px] text-slate-500 uppercase">Avg Score</p>
                    </div>
                </div>

                {/* Quiz List */}
                {quizzes.length === 0 ? (
                    <div className="text-center py-4 text-slate-500">
                        <FileQuestion className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Belum ada data quiz</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {quizzes.slice(0, 5).map((quiz) => (
                            <div key={quiz.quizId} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate" title={quiz.title}>
                                        {quiz.title}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {quiz.attempts} attempts • avg {quiz.avgScore}%
                                    </p>
                                </div>
                                <Badge className={`ml-2 ${getPassRateColor(quiz.passRate)}`}>
                                    {quiz.passRate}%
                                </Badge>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
