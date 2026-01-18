"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    Activity,
    Users,
    BookOpen,
    Zap,
    TrendingUp,
    Clock,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    ChevronRight,
    Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getPlatformAnalytics } from "@/lib/actions/admin"
import { PremiumToggle } from "@/components/ui/premium-toggle"

export default function AdminAnalyticsPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [timeframe, setTimeframe] = useState<'REALTIME' | 'DAILY' | 'MONTHLY'>('REALTIME')

    useEffect(() => {
        async function loadData() {
            setLoading(true)
            const res = await getPlatformAnalytics(timeframe)
            if (!res.error) {
                setData(res)
            }
            setLoading(false)
        }
        loadData()
    }, [timeframe])

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <p className="text-slate-500 dark:text-slate-400 font-bold animate-pulse">Menghubungkan ke pusat data...</p>
            </div>
        )
    }

    const { stats, popularCourses, trend } = data || {
        stats: { learners: 0, completions: 0, points: 0, courses: 0, growth: '+0%' },
        popularCourses: [],
        trend: []
    }

    const timeframeLabels = {
        REALTIME: ['-24h', '-22h', '-20h', '-18h', '-16h', '-14h', '-12h', '-10h', '-8h', '-6h', '-4h', '-2h'],
        DAILY: ['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN'],
        MONTHLY: ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN']
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 underline decoration-indigo-500/30 underline-offset-8">
                        <Activity className="w-8 h-8 text-indigo-500" />
                        Analitik Platform
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-3 font-medium">Monitor kesehatan sistem, performa user, dan tren pembelajaran</p>
                </div>
                <div className="relative">
                    {loading && data && (
                        <div className="absolute -top-8 right-0 flex items-center gap-2 bg-indigo-600/10 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Updating...</span>
                        </div>
                    )}
                    <PremiumToggle
                        options={[
                            { value: 'REALTIME', label: 'Real-time' },
                            { value: 'DAILY', label: 'Harian' },
                            { value: 'MONTHLY', label: 'Bulanan' }
                        ]}
                        value={timeframe}
                        onChange={(v) => setTimeframe(v as 'REALTIME' | 'DAILY' | 'MONTHLY')}
                    />
                </div>
            </div>

            {/* Matrix HUD */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {[
                    { label: "Total Learners", value: stats.learners.toLocaleString(), change: stats.growth, color: "text-blue-500", icon: Users },
                    { label: "Completions", value: stats.completions.toLocaleString(), change: stats.growth, color: "text-green-500", icon: Zap },
                    { label: "Total Courses", value: stats.courses.toLocaleString(), change: "+0%", color: "text-orange-500", icon: BookOpen },
                    { label: "Points Awarded", value: (stats.points / 1000).toFixed(1) + "K", change: stats.growth, color: "text-purple-500", icon: TrendingUp },
                ].map((stat, i) => (
                    <Card key={i} className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-default">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/5 dark:bg-white/5 blur-3xl rounded-full -mr-8 -mt-8 group-hover:bg-slate-500/10 dark:group-hover:bg-white/10 transition-all" />
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className={cn("p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800", stat.color)}>
                                    <stat.icon className="w-5 h-5" />
                                </div>
                                <span className={cn(
                                    "flex items-center text-[10px] font-black uppercase tracking-widest",
                                    stat.change.startsWith("+") ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                )}>
                                    {stat.change} <ArrowUpRight className="w-3 h-3 ml-0.5" />
                                </span>
                            </div>
                            <h4 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{stat.label}</h4>
                            <p className="text-3xl font-black text-slate-900 dark:text-white">{stat.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Visual Chart Placeholder */}
                <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl min-h-[400px] flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-slate-900 dark:text-white">Trend Aktivitas {timeframe === 'REALTIME' ? '24 Jam' : timeframe === 'DAILY' ? 'Mingguan' : 'Bulanan'}</CardTitle>
                            <CardDescription>Visualisasi engagement user berdasarkan periode {timeframe.toLowerCase()}</CardDescription>
                        </div>
                        <BarChart3 className="w-5 h-5 text-slate-300 dark:text-slate-700" />
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col items-center justify-center p-12">
                        <div className="w-full h-48 flex items-end justify-around gap-2 mb-8">
                            {trend.map((h: number, i: number) => (
                                <div key={i} className="flex-1 max-w-[40px] bg-indigo-600/20 border border-indigo-500/30 rounded-t-lg relative group transition-all hover:bg-indigo-600 hover:scale-105" style={{ height: `${Math.max(h % 100, 5)}%` }}>
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 text-[10px] font-bold text-white px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-shadow whitespace-nowrap shadow-2xl z-10">
                                        {Math.floor(h)} Activity
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="w-full flex justify-between px-2">
                            {timeframeLabels[timeframe].map((label: string) => (
                                <span key={label} className="text-slate-600 text-[9px] font-bold uppercase tracking-widest">{label}</span>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-slate-900 dark:text-white">Trending Courses</CardTitle>
                        <CardDescription>Kursus dengan pertumbuhan peserta aktif tertinggi</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {popularCourses.length > 0 ? popularCourses.map((item: any, i: number) => (
                            <div key={i} className="flex items-center gap-4 group cursor-pointer p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-800">
                                <div className={cn("w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-indigo-500")}>
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{item.title}</h4>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1 mt-1">
                                        <Users className="w-3 h-3 text-indigo-500" /> {item.count} Peserta
                                    </span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-800 group-hover:text-slate-500 dark:group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-600 gap-2">
                                <Activity className="w-8 h-8 opacity-20" />
                                <p className="text-xs font-bold uppercase tracking-widest">Belum ada data</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
