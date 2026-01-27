"use client"

import { useEffect, useState } from "react"
import { getCourseBySlug, enrollInCourse } from "@/lib/actions/courses"
import { notFound, useRouter } from "next/navigation"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    BarChart,
    Users,
    Calendar,
    Clock,
    ChevronRight,
    PlayCircle,
    FileText,
    Lock,
    CheckCircle2,
    CheckCircle,
    ArrowLeft,
    BookOpen,
    Shield,
    Video,
    MapPin
} from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { deliveryModeConfig } from "@/lib/utils/delivery-modes"
import { DeliveryMode } from "@/generated/prisma"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { SessionInfoCard } from "@/components/sessions/session-info-card"

interface CourseDetailProps {
    params: Promise<{
        slug: string
    }>
}

export default function CourseDetailPage({ params }: CourseDetailProps) {
    const { data: session } = useSession()
    const router = useRouter()
    const [course, setCourse] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isEnrolling, setIsEnrolling] = useState(false)

    useEffect(() => {
        async function loadCourse() {
            setIsLoading(true)
            const { slug } = await params
            const data = await getCourseBySlug(slug)
            if (!data) {
                notFound()
                return
            }
            setCourse(data)
            setIsLoading(false)
        }
        loadCourse()
    }, [params])

    const isEnrolled = course?.Enrollment?.some(
        (enrollment: any) => enrollment.userId === session?.user?.id
    ) || false

    const handleEnroll = async () => {
        if (!course) return

        // Redirect to login if not authenticated
        if (!session) {
            router.push(`/login?callbackUrl=/courses/${course.slug}`)
            return
        }

        setIsEnrolling(true)
        try {
            await enrollInCourse(course.id)
            // Refresh course data
            const updatedData = await getCourseBySlug(course.slug)
            setCourse(updatedData)
        } catch (err) {
            console.error(err)
        } finally {
            setIsEnrolling(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

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
        hidden: { opacity: 0, y: 30 },
        show: { opacity: 1, y: 0 }
    }

    return (
        <div className="min-h-screen pt-20 pb-20 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Sticky Floating Sub-Header */}
            <motion.div
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                className="fixed top-20 left-0 right-0 z-40 px-4 py-3 pointer-events-none"
            >
                <div className="container mx-auto">
                    <div className="bg-white/80 dark:bg-slate-950/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-3 flex items-center justify-between shadow-2xl shadow-black/10 dark:shadow-black/40 pointer-events-auto">
                        <div className="flex items-center gap-4">
                            <Link href="/courses" className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors group">
                                <ArrowLeft className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white" />
                            </Link>
                            <div className="h-6 w-px bg-slate-200 dark:bg-white/10" />
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px] md:max-w-md">{course.title}</h2>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest hidden md:block">Instructor: <span className="text-slate-900 dark:text-white">{course.User.name}</span></span>
                            {!isEnrolled && (
                                <Button
                                    onClick={handleEnroll}
                                    disabled={isEnrolling}
                                    className="bg-blue-600 hover:bg-blue-500 text-white font-black px-6 rounded-xl shadow-lg shadow-blue-600/20 text-xs uppercase tracking-widest disabled:opacity-50"
                                >
                                    {isEnrolling ? "Memproses..." : "Daftar Sekarang"}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="container mx-auto px-4 mt-14 relative z-10"
            >
                <div className="grid lg:grid-cols-3 gap-12">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-12">
                        {/* Course Hero Section */}
                        <motion.div variants={item} className="space-y-6">
                            <div className="flex flex-wrap gap-3">
                                <Badge className="bg-blue-600/10 text-blue-400 border-blue-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                                    {deliveryModeConfig[course.deliveryMode as DeliveryMode].label}
                                </Badge>
                                <Badge className="bg-purple-600/10 text-purple-400 border-purple-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                                    {course.category || "Professional Development"}
                                </Badge>
                            </div>
                            <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white leading-tight tracking-tighter">
                                {course.title}
                            </h1>
                            <p className="text-xl text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                                {course.courseShortDesc || course.description}
                            </p>
                        </motion.div>

                        {/* Feature Grid */}
                        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {[
                                { label: "Kesulitan", value: course.difficulty, icon: BarChart, color: "text-blue-500" },
                                { label: "Penyampaian", value: deliveryModeConfig[course.deliveryMode as DeliveryMode].label, icon: Calendar, color: "text-purple-500" },
                                { label: "Estimasi", value: `${course.duration || "--"} Jam`, icon: Clock, color: "text-green-500" },
                                { label: "Bahasa", value: course.language || "Indonesia", icon: FileText, color: "text-orange-500" },
                                { label: "JP", value: `${course.jp || course.duration || 1} JP`, icon: BookOpen, color: "text-yellow-500" },
                            ].map((stat) => (
                                <div key={stat.label} className="p-6 rounded-[32px] bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 backdrop-blur-sm group hover:border-slate-300 dark:hover:border-white/10 transition-colors">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">{stat.label}</p>
                                    <div className="flex items-center gap-3">
                                        <div className={cn("p-2 rounded-xl bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-white/5", stat.color)}>
                                            <stat.icon className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">{stat.value}</span>
                                    </div>
                                </div>
                            ))}
                        </motion.div>

                        {/* About This Course */}
                        <motion.div variants={item} className="space-y-6">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400">
                                    <FileText className="w-6 h-6" />
                                </div>
                                Tentang Kursus Ini
                            </h2>

                            {/* Full Description */}
                            {course.courseDesc && (
                                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5">
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-3">Deskripsi Lengkap</h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                                        {course.courseDesc}
                                    </p>
                                </div>
                            )}

                            <div className="grid md:grid-cols-2 gap-4">
                                {/* Requirements */}
                                {course.requirements && (
                                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5">
                                        <div className="flex items-center gap-2 mb-4">
                                            <CheckCircle2 className="w-5 h-5 text-amber-500" />
                                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Persyaratan</h3>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                                            {course.requirements}
                                        </p>
                                    </div>
                                )}

                                {/* Learning Outcomes */}
                                {course.outcomes && (
                                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5">
                                        <div className="flex items-center gap-2 mb-4">
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Hasil Pembelajaran</h3>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                                            {course.outcomes}
                                        </p>
                                    </div>
                                )}
                            </div>



                            {/* Recommended Next Courses */}
                            {course.recommendedNext && (
                                <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 border border-purple-200 dark:border-purple-500/20">
                                    <div className="flex items-center gap-2 mb-3">
                                        <ChevronRight className="w-5 h-5 text-purple-500" />
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Kursus Rekomendasi Selanjutnya</h3>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                        {course.recommendedNext}
                                    </p>
                                </div>
                            )}
                        </motion.div>

                        {/* Curriculum */}
                        <motion.div variants={item} className="space-y-8">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400">
                                        <BookOpen className="w-6 h-6" />
                                    </div>
                                    Kurikulum Pembelajaran
                                </h2>
                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{course.Module.length} Modul Terstruktur</span>
                            </div>

                            <div className="space-y-4">
                                {course.Module.map((module: any, mIdx: number) => (
                                    <div key={module.id} className="rounded-[32px] border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-slate-900/40 overflow-hidden group">
                                        <div className="p-6 bg-slate-200/50 dark:bg-white/5 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white font-black text-sm">
                                                    {mIdx + 1}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{module.title}</h3>
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{module.Lesson.length} Materi Pembelajaran</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-600 transition-transform group-hover:translate-x-1" />
                                        </div>
                                        <div className="px-4 pb-4">
                                            <div className="bg-white dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-white/5 divide-y divide-slate-200 dark:divide-white/5">
                                                {module.Lesson.map((lesson: any) => (
                                                    <div key={lesson.id} className="p-4 flex items-center justify-between group/item hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-lg bg-slate-200 dark:bg-slate-900/50 border border-slate-300 dark:border-white/5">
                                                                {lesson.contentType === 'VIDEO' ? (
                                                                    <PlayCircle className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover/item:text-blue-500 dark:group-hover/item:text-blue-400" />
                                                                ) : (
                                                                    <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover/item:text-green-500 dark:group-hover/item:text-green-400" />
                                                                )}
                                                            </div>
                                                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 group-hover/item:text-slate-900 dark:group-hover/item:text-white transition-colors">{lesson.title}</span>
                                                        </div>
                                                        <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-700" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Sessions Section - Only for non-ASYNC modes */}
                        {course.deliveryMode !== 'ASYNC_ONLINE' && course.CourseSession && course.CourseSession.length > 0 && (
                            <motion.div variants={item} className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                        <div className={cn(
                                            "p-2 rounded-xl",
                                            course.deliveryMode === 'SYNC_ONLINE' ? "bg-red-600/20 text-red-400" : "bg-green-600/20 text-green-400"
                                        )}>
                                            {course.deliveryMode === 'SYNC_ONLINE' ? (
                                                <Video className="w-6 h-6" />
                                            ) : (
                                                <MapPin className="w-6 h-6" />
                                            )}
                                        </div>
                                        {course.deliveryMode === 'SYNC_ONLINE' ? 'Jadwal Live Session' : 'Jadwal Sesi Kelas'}
                                    </h2>
                                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                        {course.CourseSession.length} Sesi Terjadwal
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {course.CourseSession.slice(0, 4).map((session: any) => (
                                        <SessionInfoCard
                                            key={session.id}
                                            session={session}
                                            showQrButton={course.deliveryMode === 'ON_CLASSROOM' || course.deliveryMode === 'HYBRID'}
                                            showJoinButton={course.deliveryMode === 'SYNC_ONLINE' || course.deliveryMode === 'HYBRID'}
                                        />
                                    ))}
                                </div>
                                {course.CourseSession.length > 4 && (
                                    <div className="text-center">
                                        <Button variant="outline" className="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">
                                            Lihat Semua {course.CourseSession.length} Sesi
                                        </Button>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>

                    {/* Sidebar / Enrollment Glass Card */}
                    <div className="lg:col-span-1">
                        <motion.div variants={item} className="sticky top-40 space-y-8">
                            <div className="relative rounded-[40px] border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/40 backdrop-blur-2xl p-10 shadow-2xl overflow-hidden group">
                                {/* Glass Effects */}
                                <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] group-hover:bg-blue-500/20 transition-colors" />
                                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px]" />

                                <div className="relative z-10 space-y-8">
                                    <div className="rounded-3xl overflow-hidden aspect-video relative border border-slate-200 dark:border-white/10 shadow-2xl">
                                        {course.thumbnail ? (
                                            <Image src={course.thumbnail} alt={course.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                                        ) : (
                                            <div className="w-full h-full bg-slate-200 dark:bg-slate-950 flex items-center justify-center">
                                                <BookOpen className="w-16 h-16 text-slate-400 dark:text-slate-800" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent flex items-end p-6">
                                            <div className="flex items-center gap-2">
                                                <div className="px-3 py-1 rounded-full bg-blue-600 text-[10px] font-black uppercase tracking-widest text-white shadow-lg">Premium Access</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        {isEnrolled ? (
                                            <>
                                                <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center gap-2 text-green-500 dark:text-green-400 font-bold">
                                                    <CheckCircle className="w-5 h-5" />
                                                    Telah Terdaftar
                                                </div>
                                                <Button
                                                    asChild
                                                    className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white text-lg font-black rounded-2xl shadow-xl shadow-blue-600/20 transition-all uppercase tracking-widest"
                                                >
                                                    <Link href={
                                                        course.deliveryMode === 'SYNC_ONLINE' || course.deliveryMode === 'HYBRID'
                                                            ? `/courses/${course.slug}/sync/pre-learning`
                                                            : `/courses/${course.slug}/learn`
                                                    }>
                                                        Mulai Belajar
                                                    </Link>
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                onClick={handleEnroll}
                                                disabled={isEnrolling}
                                                className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white text-lg font-black rounded-2xl shadow-xl shadow-blue-600/20 transition-all uppercase tracking-widest disabled:opacity-50"
                                            >
                                                {isEnrolling ? "Memproses..." : "Daftar Sekarang"}
                                            </Button>
                                        )}
                                        <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                            <Shield className="w-3 h-3" />
                                            Jaminan Keamanan Data ASN
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-8 border-t border-slate-200 dark:border-white/5">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kursus ini mencakup:</p>
                                        <ul className="space-y-4">
                                            {[
                                                { label: "Sertifikat Digital Kolektif", color: "text-blue-500" },
                                                { label: "Materi Lifetime Access", color: "text-purple-500" },
                                                { label: "Forum Diskusi Eksklusif", color: "text-green-500" },
                                                { label: "Quiz & Assessment", color: "text-orange-500" },
                                            ].map((feature) => (
                                                <li key={feature.label} className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                                                    <CheckCircle2 className={cn("w-4 h-4", feature.color)} />
                                                    {feature.label}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Instructor Info */}
                            <div className="rounded-[32px] border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 p-8 flex items-center gap-5 hover:border-slate-300 dark:hover:border-white/10 transition-colors">
                                <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-white/10 overflow-hidden">
                                    {course.User.image ? (
                                        <Image src={course.User.image} alt={course.User.name} width={64} height={64} className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center font-black text-slate-400 dark:text-slate-700 text-xl">
                                            {course.User.name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Expert Content Creator</p>
                                    <h4 className="text-slate-900 dark:text-white font-black">{course.User.name}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{course.User.jabatan || "Specialist Mentor"}</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
