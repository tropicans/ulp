import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getXAPIStatements, getXAPIStats } from "@/lib/actions/xapi-analytics"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Activity, Users, BookOpen, FileQuestion, Play, Clock } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function XAPIAnalyticsPage() {
    const session = await auth()
    if (!session?.user?.id || !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
        redirect("/dashboard")
    }

    const [stats, statementsResult] = await Promise.all([
        getXAPIStats(),
        getXAPIStatements({ limit: 50 })
    ])

    const recentStatements = statementsResult.statements

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

    return (
        <div className="min-h-screen bg-white dark:bg-slate-900 pt-24 pb-20">
            <div className="container max-w-6xl mx-auto px-4">
                <Link href="/dashboard/admin" className="flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm mb-6 w-fit group">
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Kembali ke Dashboard Admin
                </Link>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">xAPI Analytics</h1>
                    <p className="text-slate-500 dark:text-slate-400">Monitoring aktivitas pembelajaran dari Yet Analytics LRS</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
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

                {/* Recent Activity Table */}
                <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                    <CardHeader>
                        <CardTitle className="text-slate-900 dark:text-white">Aktivitas Terbaru</CardTitle>
                        <CardDescription>50 statement terakhir dari LRS</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {statementsResult.error ? (
                            <div className="text-center py-8 text-red-500">
                                Error: {statementsResult.error}
                            </div>
                        ) : recentStatements.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Belum ada statement xAPI</p>
                                <p className="text-sm mt-2">Statement akan muncul setelah ada aktivitas pembelajaran</p>
                            </div>
                        ) : (
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
                                        {recentStatements.map((stmt: any, i: number) => (
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
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
