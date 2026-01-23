"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Activity, Users, BookOpen, FileQuestion, Play, ChevronLeft, ChevronRight, Loader2, Video, Sparkles, AlertTriangle, TrendingDown, SkipForward, Pause } from "lucide-react"
import Link from "next/link"
import { getXAPIStatements, getXAPIStats } from "@/lib/actions/xapi-analytics"
import { getVideoList, getVideoAnalytics, getAIVideoInsights } from "@/lib/actions/video-analytics"

const ITEMS_PER_PAGE = 10

export default function XAPIAnalyticsPage() {
    const [stats, setStats] = useState<any>({ totalStatements: 0, enrollments: 0, completions: 0, quizAttempts: 0, videoEvents: 0 })
    const [statements, setStatements] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)

    // Video analytics state
    const [videoList, setVideoList] = useState<any[]>([])
    const [selectedVideoId, setSelectedVideoId] = useState<string>("")
    const [videoAnalytics, setVideoAnalytics] = useState<any>(null)
    const [aiInsights, setAIInsights] = useState<any>(null)
    const [loadingVideo, setLoadingVideo] = useState(false)

    useEffect(() => {
        async function loadData() {
            setLoading(true)
            try {
                const [statsResult, statementsResult, videos] = await Promise.all([
                    getXAPIStats(),
                    getXAPIStatements({ limit: 100 }),
                    getVideoList()
                ])
                setStats(statsResult)
                setVideoList(videos)
                if (statementsResult.error) {
                    setError(statementsResult.error)
                } else {
                    setStatements(statementsResult.statements)
                }
            } catch (err) {
                setError("Gagal memuat data")
            }
            setLoading(false)
        }
        loadData()
    }, [])

    // Load video analytics when video is selected
    async function handleVideoSelect(videoId: string) {
        setSelectedVideoId(videoId)
        if (!videoId) {
            setVideoAnalytics(null)
            setAIInsights(null)
            return
        }

        setLoadingVideo(true)
        try {
            const [analytics, insights] = await Promise.all([
                getVideoAnalytics(videoId),
                getAIVideoInsights(videoId)
            ])
            setVideoAnalytics(analytics)
            setAIInsights(insights)
        } catch (err) {
            console.error("Error loading video analytics:", err)
        }
        setLoadingVideo(false)
    }

    // Pagination logic
    const totalPages = Math.ceil(statements.length / ITEMS_PER_PAGE)
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const paginatedStatements = statements.slice(startIndex, startIndex + ITEMS_PER_PAGE)

    // Helper to get verb display name
    function getVerbName(verbId: string): string {
        if (verbId.includes("registered")) return "Enrolled"
        if (verbId.includes("completed")) return "Completed"
        if (verbId.includes("passed")) return "Passed"
        if (verbId.includes("failed")) return "Failed"
        if (verbId.includes("played")) return "Played"
        if (verbId.includes("paused")) return "Paused"
        if (verbId.includes("seeked")) return "Seeked"
        return verbId.split("/").pop() || "Unknown"
    }

    // Helper to get verb badge color
    function getVerbColor(verbId: string): string {
        if (verbId.includes("registered")) return "bg-blue-500/20 text-blue-600"
        if (verbId.includes("completed")) return "bg-green-500/20 text-green-600"
        if (verbId.includes("passed")) return "bg-emerald-500/20 text-emerald-600"
        if (verbId.includes("failed")) return "bg-red-500/20 text-red-600"
        if (verbId.includes("played") || verbId.includes("paused") || verbId.includes("seeked")) return "bg-purple-500/20 text-purple-600"
        return "bg-gray-500/20 text-gray-600"
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-indigo-500" />
                    <p className="text-slate-500">Memuat data xAPI...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white dark:bg-slate-900 py-8">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <Link href="/dashboard/admin" className="flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm mb-4 w-fit group">
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Kembali ke Dashboard Admin
                </Link>

                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">xAPI Analytics</h1>
                    <p className="text-slate-500 dark:text-slate-400">Monitoring aktivitas pembelajaran dari Yet Analytics LRS</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                    <Activity className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalStatements}</p>
                                    <p className="text-xs text-slate-500">Total Statements</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-green-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.enrollments}</p>
                                    <p className="text-xs text-slate-500">Enrollments</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.completions}</p>
                                    <p className="text-xs text-slate-500">Completions</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                                    <FileQuestion className="w-5 h-5 text-orange-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.quizAttempts}</p>
                                    <p className="text-xs text-slate-500">Quiz Attempts</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                    <Play className="w-5 h-5 text-purple-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.videoEvents}</p>
                                    <p className="text-xs text-slate-500">Video Events</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Analytics Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Verb Distribution Chart */}
                    <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                        <CardHeader>
                            <CardTitle className="text-slate-900 dark:text-white text-lg">Distribusi Aktivitas</CardTitle>
                            <CardDescription>Breakdown statement berdasarkan jenis aktivitas</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {(() => {
                                // Calculate verb distribution from statements
                                const verbCounts: Record<string, number> = {}
                                statements.forEach((stmt: any) => {
                                    const verbName = getVerbName(stmt.verb?.id || "")
                                    verbCounts[verbName] = (verbCounts[verbName] || 0) + 1
                                })
                                const sortedVerbs = Object.entries(verbCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)
                                const maxCount = Math.max(...sortedVerbs.map(v => v[1]), 1)

                                if (sortedVerbs.length === 0) {
                                    return (
                                        <div className="text-center py-8 text-slate-500">
                                            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">Belum ada data aktivitas</p>
                                        </div>
                                    )
                                }

                                return (
                                    <div className="space-y-3">
                                        {sortedVerbs.map(([verb, count]) => (
                                            <div key={verb} className="space-y-1">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-slate-700 dark:text-slate-300 font-medium">{verb}</span>
                                                    <span className="text-slate-500">{count}</span>
                                                </div>
                                                <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                                                        style={{ width: `${(count / maxCount) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            })()}
                        </CardContent>
                    </Card>

                    {/* Timeline Activity Chart */}
                    <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                        <CardHeader>
                            <CardTitle className="text-slate-900 dark:text-white text-lg">Timeline 7 Hari Terakhir</CardTitle>
                            <CardDescription>Aktivitas pembelajaran per hari</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {(() => {
                                // Calculate activity per day for last 7 days
                                const dayLabels = ['Ming', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
                                const today = new Date()
                                const dayCounts: number[] = Array(7).fill(0)
                                const dayNames: string[] = []

                                for (let i = 6; i >= 0; i--) {
                                    const date = new Date(today)
                                    date.setDate(date.getDate() - i)
                                    dayNames.push(dayLabels[date.getDay()])
                                }

                                statements.forEach((stmt: any) => {
                                    if (stmt.timestamp) {
                                        const stmtDate = new Date(stmt.timestamp)
                                        const diffDays = Math.floor((today.getTime() - stmtDate.getTime()) / (1000 * 60 * 60 * 24))
                                        if (diffDays >= 0 && diffDays < 7) {
                                            dayCounts[6 - diffDays]++
                                        }
                                    }
                                })

                                const maxCount = Math.max(...dayCounts, 1)

                                return (
                                    <div className="flex flex-col">
                                        <div className="w-full h-40 flex items-end justify-around gap-2 mb-4">
                                            {dayCounts.map((count, i) => (
                                                <div key={i} className="flex-1 flex flex-col items-center">
                                                    <div
                                                        className="w-full max-w-[40px] bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-lg transition-all duration-500 hover:opacity-80 relative group"
                                                        style={{ height: `${Math.max((count / maxCount) * 100, 5)}%` }}
                                                    >
                                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                            {count} aktivitas
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="w-full flex justify-around px-2">
                                            {dayNames.map((name, i) => (
                                                <span key={i} className="text-slate-500 text-[10px] font-bold uppercase">{name}</span>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })()}
                        </CardContent>
                    </Card>
                </div>

                {/* Video Analytics Section */}
                <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 mb-6">
                    <CardHeader>
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                    <Video className="w-5 h-5 text-purple-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-slate-900 dark:text-white">Video Analytics</CardTitle>
                                    <CardDescription>Analisis perilaku learner saat menonton video</CardDescription>
                                </div>
                            </div>
                            <Select value={selectedVideoId} onValueChange={handleVideoSelect}>
                                <SelectTrigger className="w-[280px]">
                                    <SelectValue placeholder="Pilih video untuk analisis..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {videoList.map((video) => (
                                        <SelectItem key={video.id} value={video.id}>
                                            {video.title} ({video.viewCount} events)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loadingVideo ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                                <span className="ml-2 text-slate-500">Menganalisis video...</span>
                            </div>
                        ) : !selectedVideoId ? (
                            <div className="text-center py-12 text-slate-500">
                                <Video className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                <p>Pilih video dari dropdown untuk melihat analytics</p>
                            </div>
                        ) : videoAnalytics ? (
                            <div className="space-y-6">
                                {/* Video Stats */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{videoAnalytics.totalViews}</p>
                                        <p className="text-xs text-slate-500">Total Views</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{videoAnalytics.uniqueViewers}</p>
                                        <p className="text-xs text-slate-500">Unique Viewers</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{Math.round(videoAnalytics.avgWatchTime)}s</p>
                                        <p className="text-xs text-slate-500">Avg Watch Time</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{videoAnalytics.completionRate}%</p>
                                        <p className="text-xs text-slate-500">Completion Rate</p>
                                    </div>
                                </div>

                                {/* Pause Heatmap */}
                                {videoAnalytics.pauseEvents.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                            <Pause className="w-4 h-4" /> Pause Heatmap (area yang sering di-pause)
                                        </h4>
                                        <div className="flex gap-1 h-8">
                                            {videoAnalytics.pauseEvents.map((evt: any, i: number) => {
                                                const maxCount = Math.max(...videoAnalytics.pauseEvents.map((e: any) => e.count))
                                                const intensity = evt.count / maxCount
                                                const minutes = Math.floor(evt.position / 60)
                                                const seconds = evt.position % 60
                                                return (
                                                    <div
                                                        key={i}
                                                        className="flex-1 rounded relative group cursor-pointer"
                                                        style={{
                                                            backgroundColor: `rgba(239, 68, 68, ${0.2 + intensity * 0.8})`
                                                        }}
                                                    >
                                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                            {minutes}:{seconds.toString().padStart(2, '0')} - {evt.count} pause
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                            <span>0:00</span>
                                            <span>→ Timeline video</span>
                                        </div>
                                    </div>
                                )}

                                {/* AI Insights */}
                                {aiInsights && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800">
                                            <h4 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-3 flex items-center gap-2">
                                                <Sparkles className="w-4 h-4" /> AI Insights
                                            </h4>
                                            <ul className="space-y-2">
                                                {aiInsights.insights.map((insight: string, i: number) => (
                                                    <li key={i} className="text-sm text-slate-700 dark:text-slate-300">{insight}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
                                            <h4 className="text-sm font-semibold text-green-700 dark:text-green-300 mb-3 flex items-center gap-2">
                                                <TrendingDown className="w-4 h-4" /> Rekomendasi
                                            </h4>
                                            <ul className="space-y-2">
                                                {aiInsights.recommendations.map((rec: string, i: number) => (
                                                    <li key={i} className="text-sm text-slate-700 dark:text-slate-300">• {rec}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {/* Problem Areas */}
                                {aiInsights?.problemAreas?.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4 text-amber-500" /> Area Bermasalah
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {aiInsights.problemAreas.map((area: any, i: number) => (
                                                <Badge
                                                    key={i}
                                                    className={
                                                        area.severity === "high" ? "bg-red-500/20 text-red-600" :
                                                            area.severity === "medium" ? "bg-amber-500/20 text-amber-600" :
                                                                "bg-slate-500/20 text-slate-600"
                                                    }
                                                >
                                                    {area.issue}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-slate-500">
                                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                <p>Tidak ada data untuk video ini</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Activity Table */}
                <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-slate-900 dark:text-white">Aktivitas Terbaru</CardTitle>
                                <CardDescription>
                                    Menampilkan {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, statements.length)} dari {statements.length} statement
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {error ? (
                            <div className="text-center py-8 text-red-500">
                                Error: {error}
                            </div>
                        ) : statements.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Belum ada statement xAPI</p>
                                <p className="text-sm mt-2">Statement akan muncul setelah ada aktivitas pembelajaran</p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Actor</th>
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Verb</th>
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Object</th>
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Score</th>
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Waktu</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedStatements.map((stmt: any, i: number) => (
                                                <tr key={stmt.id || i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                    <td className="py-3 px-4">
                                                        <div>
                                                            <p className="font-medium text-slate-900 dark:text-white text-sm">{stmt.actor?.name || "Unknown"}</p>
                                                            <p className="text-xs text-slate-500">{stmt.actor?.mbox?.replace("mailto:", "") || ""}</p>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <Badge className={getVerbColor(stmt.verb?.id || "")}>
                                                            {getVerbName(stmt.verb?.id || "")}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <p className="text-sm text-slate-700 dark:text-slate-300 truncate max-w-xs">
                                                            {stmt.object?.definition?.name?.en || stmt.object?.definition?.name?.id || stmt.object?.id?.split("/").pop() || "Unknown"}
                                                        </p>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        {stmt.result?.score?.scaled !== undefined ? (
                                                            <span className="text-sm font-medium">{Math.round(stmt.result.score.scaled * 100)}%</span>
                                                        ) : (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-xs text-slate-500">
                                                        {stmt.timestamp ? new Date(stmt.timestamp).toLocaleString("id-ID", {
                                                            day: "2-digit",
                                                            month: "short",
                                                            hour: "2-digit",
                                                            minute: "2-digit"
                                                        }) : "-"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                                        <p className="text-sm text-slate-500">
                                            Halaman {currentPage} dari {totalPages}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                                Sebelumnya
                                            </Button>
                                            <div className="flex items-center gap-1">
                                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                    let pageNum: number
                                                    if (totalPages <= 5) {
                                                        pageNum = i + 1
                                                    } else if (currentPage <= 3) {
                                                        pageNum = i + 1
                                                    } else if (currentPage >= totalPages - 2) {
                                                        pageNum = totalPages - 4 + i
                                                    } else {
                                                        pageNum = currentPage - 2 + i
                                                    }
                                                    return (
                                                        <Button
                                                            key={pageNum}
                                                            variant={currentPage === pageNum ? "default" : "outline"}
                                                            size="sm"
                                                            className="w-8 h-8 p-0"
                                                            onClick={() => setCurrentPage(pageNum)}
                                                        >
                                                            {pageNum}
                                                        </Button>
                                                    )
                                                })}
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                            >
                                                Selanjutnya
                                                <ChevronRight className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div >
    )
}
