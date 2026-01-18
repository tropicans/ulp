"use client";

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    BookOpen,
    TrendingUp,
    ChevronRight,
    PlayCircle,
    Flame,
    Zap,
    LayoutDashboard
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getUserGamificationStats } from "@/lib/actions/gamification"
import { getUserEnrollments } from "@/lib/actions/courses"
import { BadgeGrid } from "@/components/dashboard/badge-grid"
import { Leaderboard } from "@/components/dashboard/leaderboard"
import { Progress } from "@/components/ui/progress"
import { CertificateButton } from "@/components/dashboard/certificate-button"
import { motion } from "framer-motion"

export default function LearnerDashboard() {
    const { data: session, status } = useSession()
    const [gameStats, setGameStats] = useState<any>({ points: 0, level: 1, streak: 0, badges: [] })
    const [enrollments, setEnrollments] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (status === "unauthenticated") {
            redirect("/login")
        }

        async function fetchData() {
            if (!session?.user?.id) return

            setIsLoading(true)
            try {
                // Fetch stats from server action
                const [statsResult, enrollmentsResult] = await Promise.all([
                    getUserGamificationStats(),
                    getUserEnrollments(),
                ])
                if (!("error" in statsResult)) {
                    setGameStats(statsResult)
                }
                setEnrollments(enrollmentsResult)
            } catch (err) {
                console.error(err)
            } finally {
                setIsLoading(false)
            }
        }
        fetchData()
    }, [session, status])

    if (status === "loading" || isLoading) {
        return (
            <div className="container mx-auto px-4 py-32 flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Memuat Dashboard Anda...</p>
            </div>
        )
    }

    const user = session?.user

    const summaryStats = [
        { label: "Kursus Aktif", value: enrollments.length.toString(), icon: BookOpen, color: "text-blue-500", shadow: "shadow-blue-500/10" },
        { label: "Total Points", value: gameStats.points, icon: Zap, color: "text-purple-500", shadow: "shadow-purple-500/10" },
        { label: "Streak", value: `${gameStats.streak} Hari`, icon: Flame, color: "text-orange-500", shadow: "shadow-orange-500/10" },
    ]

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    }

    return (
        <div className="container mx-auto px-4 py-8 relative">
            {/* Background Decoration */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Welcome Section */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6"
            >
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-blue-600/10 text-blue-500">
                            <LayoutDashboard className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] uppercase font-black tracking-widest text-blue-500/80">Learner Dashboard</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                        Selamat datang, {user?.name?.split(' ')[0]}! 👋
                    </h1>
                    <p className="text-slate-400 font-medium">
                        Siap untuk meningkatkan kompetensi Anda hari ini?
                    </p>
                </div>
                <div className="hidden md:block text-right">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Unit Kerja</p>
                    <Badge variant="outline" className="border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 px-4 py-1.5 rounded-xl font-bold">
                        {user?.unitKerja || "Instansi Pusat"}
                    </Badge>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10"
            >
                {summaryStats.map((stat) => (
                    <motion.div key={stat.label} variants={item}>
                        <Card glass className="border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors group">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
                                        <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums">{stat.value}</p>
                                    </div>
                                    <div className={cn(
                                        "p-4 rounded-2xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-2xl",
                                        stat.color,
                                        stat.shadow
                                    )}>
                                        <stat.icon className="w-7 h-7" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="lg:col-span-2 space-y-8"
                >
                    {/* Level Progress */}
                    <motion.div variants={item}>
                        <Card glass className="overflow-hidden border-slate-200 dark:border-white/5 bg-gradient-to-br from-slate-50 dark:from-slate-900/40 to-slate-100 dark:to-slate-950/40">
                            <CardContent className="p-8 relative">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-3xl -mr-32 -mt-32 rounded-full" />
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-6 relative">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-black text-white text-3xl shadow-xl shadow-purple-600/20 rotate-3">
                                            {gameStats.level}
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mb-1">Peringkat Level</p>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Elite Practitioner</h3>
                                        </div>
                                    </div>
                                    <div className="flex flex-col md:items-end">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Zap className="w-4 h-4 text-purple-400" />
                                            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{gameStats.points}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Target: {gameStats.nextLevelExp} pts</p>
                                    </div>
                                </div>
                                <div className="space-y-2 relative">
                                    <Progress value={(gameStats.currentProgress / 200) * 100} className="h-3 bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-white/5" />
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        <span>Progress Level</span>
                                        <span>{Math.round((gameStats.currentProgress / 200) * 100)}%</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Badge Grid */}
                    <motion.div variants={item}>
                        <BadgeGrid
                            badges={gameStats.badges}
                            points={gameStats.points}
                            level={gameStats.level}
                            streak={gameStats.streak}
                        />
                    </motion.div>

                    {/* Continue Learning */}
                    <motion.div variants={item}>
                        <Card glass className="border-slate-200 dark:border-white/5">
                            <CardHeader>
                                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-blue-600/10 text-blue-500">
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                    Lanjutkan Pembelajaran
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {enrollments.length > 0 ? (
                                    <>
                                        {enrollments.slice(0, 3).map((enrollment) => (
                                            <Link
                                                key={enrollment.id}
                                                href={`/courses/${enrollment.courseSlug}/learn`}
                                                className="block"
                                            >
                                                <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/5 hover:border-blue-300 dark:hover:border-blue-500/20 transition-all group">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                                                            {enrollment.courseTitle}
                                                        </h4>
                                                        <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors" />
                                                    </div>
                                                    <div className="flex items-center gap-4 mb-3">
                                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                                            {enrollment.completedLessons}/{enrollment.totalLessons} materi
                                                        </span>
                                                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                                            {enrollment.progressPercent}%
                                                        </span>
                                                    </div>
                                                    <Progress value={enrollment.progressPercent} className="h-2 bg-slate-200 dark:bg-slate-950" />
                                                </div>
                                            </Link>
                                        ))}
                                        {enrollments.length > 3 && (
                                            <Button asChild variant="outline" className="w-full mt-4 border-slate-200 dark:border-white/5 font-bold rounded-xl">
                                                <Link href="/dashboard/courses">Lihat Semua Kursus</Link>
                                            </Button>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-16 px-4 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl">
                                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-200 dark:border-white/5">
                                            <BookOpen className="w-10 h-10 text-slate-400 dark:text-slate-600" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Mulai Perjalanan Anda</h3>
                                        <p className="text-sm text-slate-400 mb-8 max-w-xs mx-auto">
                                            Belum ada kursus aktif. Jelajahi katalog sekarang untuk memulai pembelajaran.
                                        </p>
                                        <Button asChild className="bg-blue-600 hover:bg-blue-500 text-white font-black px-10 py-6 rounded-2xl shadow-xl shadow-blue-600/20 transition-all">
                                            <Link href="/courses">Jelajahi Katalog</Link>
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>

                {/* Sidebar */}
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="space-y-8"
                >
                    <motion.div variants={item}>
                        <Leaderboard />
                    </motion.div>

                    {/* Info Card */}
                    <motion.div variants={item}>
                        <Card glass className="overflow-hidden border-slate-200 dark:border-white/5 group">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center justify-between">
                                    Info Utama
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                                    Selesaikan modul <span className="text-blue-600 dark:text-blue-400 font-bold">Digital Literacy</span> minggu ini untuk mendapatkan badge <span className="text-purple-600 dark:text-purple-400 font-bold">Fast Learner</span>!
                                </p>
                                <Button variant="outline" className="w-full text-[10px] font-black uppercase tracking-widest h-11 border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 hover:bg-blue-600 hover:text-white hover:border-blue-600 rounded-xl transition-all" asChild>
                                    <Link href="/courses">Lihat Semua Info</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    )
}
