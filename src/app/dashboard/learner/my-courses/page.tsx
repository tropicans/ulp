"use client"

import { useState, useEffect } from "react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { BookOpen, PlayCircle, ChevronRight, Award, GraduationCap, Clock, Flame } from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { UserAvatar } from "@/components/ui/user-avatar"

export default function MyCoursesPage() {
    const { data: session } = useSession()
    const [courses, setCourses] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (session?.user?.id) {
            fetchMyCourses()
        }
    }, [session])

    async function fetchMyCourses() {
        setIsLoading(true)
        try {
            // Using fetch to an internal API or calling a server action (simulated here for speed)
            const response = await fetch(`/api/user/enrollments`)
            const data = await response.json()
            if (data.courses) {
                setCourses(data.courses)
            }
        } catch (error) {
            console.error(error)
        }
        setIsLoading(false)
    }

    if (isLoading) return <div className="p-12 animate-pulse bg-white dark:bg-slate-900 min-h-screen" />

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="mb-12">
                <h1 className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-900/20">
                        <BookOpen className="w-8 h-8 text-white" />
                    </div>
                    Kursus Saya
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Lanjutkan progres pembelajaran dan kembangkan kompetensi Anda</p>
            </div>

            {courses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full flex items-center justify-center mb-6">
                        <GraduationCap className="w-12 h-12 text-slate-300 dark:text-slate-800" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Anda belum memiliki kursus</h3>
                    <p className="text-slate-500 max-w-sm mb-10">
                        Daftarkan diri Anda pada mata diklat yang tersedia untuk memulai pembelajaran.
                    </p>
                    <Button asChild className="bg-blue-600 hover:bg-blue-700 h-12 px-10 font-black uppercase text-xs tracking-widest rounded-xl shadow-lg shadow-blue-900/20">
                        <Link href="/courses">Lihat Katalog</Link>
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {courses.map((enrollment) => (
                        <Card key={enrollment.id} className="group border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden hover:border-blue-500/50 transition-all rounded-3xl flex flex-col">
                            <div className="h-48 relative overflow-hidden">
                                <img
                                    src={enrollment.Course.thumbnail || "/placeholder-course.jpg"}
                                    alt={enrollment.Course.title}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1">{enrollment.Course.category}</span>
                                        <h3 className="text-lg font-bold text-white leading-tight line-clamp-2">{enrollment.Course.title}</h3>
                                    </div>
                                </div>
                            </div>
                            <CardContent className="p-6 flex-1 flex flex-col">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {enrollment.Course.duration} Jam
                                    </span>
                                    <span className="text-lg font-black text-slate-900 dark:text-white">{enrollment.progress}%</span>
                                </div>
                                <Progress value={enrollment.progress} className="h-2 bg-slate-200 dark:bg-slate-950 mb-8" />

                                <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Flame className="w-3.5 h-3.5 text-orange-500" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Aktif</span>
                                    </div>
                                    <Link href={
                                        enrollment.Course.deliveryMode === "SYNC_ONLINE"
                                            ? `/courses/${enrollment.Course.slug}/sync/pre-learning`
                                            : `/courses/${enrollment.Course.slug}/learn`
                                    }>
                                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-10 px-6 transition-all group-hover:shadow-lg group-hover:shadow-blue-900/40">
                                            Belajar <ChevronRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
