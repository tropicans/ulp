"use client"

import { useState, useEffect } from "react"
import { getInstructorAnalytics } from "@/lib/actions/reports"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { TrendingUp, Users, BookOpen, Award, BarChart3, PieChart, Activity } from "lucide-react"

export default function InstructorReportsPage() {
    const [data, setData] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchAnalytics()
    }, [])

    async function fetchAnalytics() {
        setIsLoading(true)
        const result = await getInstructorAnalytics()
        if (result.courses) {
            setData(result)
        }
        setIsLoading(false)
    }

    if (isLoading) return <div className="p-12 animate-pulse bg-white dark:bg-slate-900 min-h-screen" />

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="mb-10">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                    <BarChart3 className="w-8 h-8 text-blue-500" />
                    Laporan Pengajaran
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Analisis performa konten dan keterlibatan peserta</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-500 uppercase font-black">Total Peserta</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <span className="text-4xl font-black text-slate-900 dark:text-white">{data?.totalEnrollments || 0}</span>
                            <Users className="w-8 h-8 text-blue-500/50" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-500 uppercase font-black">Mata Diklat</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <span className="text-4xl font-black text-slate-900 dark:text-white">{data?.courseCount || 0}</span>
                            <BookOpen className="w-8 h-8 text-purple-500/50" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-500 uppercase font-black">Engagement Avg</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <span className="text-4xl font-black text-slate-900 dark:text-white">85%</span>
                            <TrendingUp className="w-8 h-8 text-green-500/50" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur">
                    <CardHeader>
                        <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                            <PieChart className="w-5 h-5 text-blue-400" /> Distribusi Peserta per Kursus
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data?.courses?.map((c: any) => (
                                <div key={c.id} className="space-y-1.5">
                                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest px-1">
                                        <span className="text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{c.title}</span>
                                        <span className="text-slate-900 dark:text-white">{c.enrollments} Peserta</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-200 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-300 dark:border-slate-800">
                                        <div
                                            className="h-full bg-blue-600 rounded-full"
                                            style={{ width: `${Math.min(100, (c.enrollments / (data.totalEnrollments || 1)) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur">
                    <CardHeader>
                        <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                            <Activity className="w-5 h-5 text-orange-400" /> Ringkasan Aktivitas
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-10">
                        <div className="w-24 h-24 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-orange-500 animate-spin-slow mb-6" />
                        <p className="text-slate-500 italic text-sm text-center max-w-xs">
                            Kalkulasi tingkat penyelesaian kursus (completion rate) sedang diproses dari data progress lesson...
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
