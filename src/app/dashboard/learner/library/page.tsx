"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
    Search,
    BookOpen,
    Video,
    FileText,
    ChevronRight,
    Loader2,
    Sparkles,
    Filter,
    Clock
} from "lucide-react"
import { getLibraryLessons, LibraryLesson } from "@/lib/actions/library"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { AddToCourseDialog } from "@/components/dashboard/add-to-course-dialog"

export default function LearnerLibraryPage() {
    const [lessons, setLessons] = useState<LibraryLesson[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [filter, setFilter] = useState<string>("ALL")

    useEffect(() => {
        const delaySearch = setTimeout(() => {
            fetchLessons()
        }, 300)
        return () => clearTimeout(delaySearch)
    }, [searchQuery, filter])

    async function fetchLessons() {
        setLoading(true)
        try {
            const data = await getLibraryLessons(searchQuery)
            // Client-side filtering for content type if needed, 
            // though getLibraryLessons currently only filters by text/category.
            let filtered = data
            if (filter !== "ALL") {
                filtered = data.filter(l => l.contentType === filter)
            }
            setLessons(filtered)
        } catch (error) {
            console.error("Failed to load library")
        } finally {
            setLoading(false)
        }
    }

    const categories = [
        { id: "ALL", label: "Semua" },
        { id: "VIDEO", label: "Video", icon: <Video className="w-3 h-3" /> },
        { id: "DOCUMENT", label: "Dokumen", icon: <FileText className="w-3 h-3" /> },
        { id: "ARTICLE", label: "Artikel", icon: <BookOpen className="w-3 h-3" /> },
    ]

    return (
        <div className="container max-w-7xl mx-auto px-4 py-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-indigo-600/10 text-indigo-500">
                            <Sparkles className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] uppercase font-black tracking-widest text-indigo-500/80">Pengetahuan Baru</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                        Ala Carte 🍱
                    </h1>
                    <p className="text-slate-500 font-medium">
                        Temukan ribuan video, dokumen, dan artikel berkualitas dari berbagai kursus.
                    </p>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <Input
                        placeholder="Cari topik, materi, atau kompetensi..."
                        className="pl-12 h-14 text-lg rounded-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none focus:ring-indigo-500 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                    {categories.map((cat) => (
                        <Button
                            key={cat.id}
                            variant={filter === cat.id ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setFilter(cat.id)}
                            className={`rounded-xl h-12 px-6 font-bold transition-all ${filter === cat.id
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                                : "text-slate-500 hover:text-indigo-500"
                                }`}
                        >
                            {cat.icon && <span className="mr-2">{cat.icon}</span>}
                            {cat.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {loading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={`skeleton-${i}`} className="h-[200px] rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                        ))
                    ) : lessons.length > 0 ? (
                        lessons.map((lesson, index) => (
                            <motion.div
                                key={lesson.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card className="group h-full overflow-hidden border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 rounded-3xl">
                                    <CardContent className="p-6">
                                        <div className="flex flex-col h-full">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500">
                                                    {lesson.contentType === "VIDEO" ? <Video className="w-5 h-5" /> :
                                                        lesson.contentType === "DOCUMENT" ? <FileText className="w-5 h-5" /> :
                                                            <BookOpen className="w-5 h-5" />}
                                                </div>
                                                <Badge variant="outline" className="text-[10px] font-black tracking-widest uppercase border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                                    {lesson.contentType}
                                                </Badge>
                                            </div>

                                            <div className="flex-1 space-y-2 mb-6">
                                                <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {lesson.title}
                                                </h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                                                    {lesson.description || "Tidak ada deskripsi tersedia untuk materi ini."}
                                                </p>
                                            </div>

                                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                                    <span className="flex items-center gap-1.5 truncate pr-4">
                                                        <BookOpen className="w-3.5 h-3.5" />
                                                        {lesson.courseTitle}
                                                    </span>
                                                    {lesson.duration && (
                                                        <span className="flex items-center gap-1.5 whitespace-nowrap">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {lesson.duration} MENIT
                                                        </span>
                                                    )}
                                                </div>
                                                <AddToCourseDialog
                                                    lessonId={lesson.id}
                                                    lessonTitle={lesson.title}
                                                />
                                                <Button
                                                    asChild
                                                    variant="ghost"
                                                    className="w-full h-10 rounded-xl text-slate-500 font-bold hover:text-indigo-600 transition-all group/btn mt-2"
                                                >
                                                    <Link href={`/dashboard/courses/${lesson.courseId}/learn#lesson-${lesson.id}`}>
                                                        Buka Pratinjau
                                                        <ChevronRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))
                    ) : (
                        <div className="col-span-full py-32 text-center">
                            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Search className="w-8 h-8 text-slate-400" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Materi tidak ditemukan</h2>
                            <p className="text-slate-500 max-w-sm mx-auto">Coba cari dengan kata kunci lain atau pilih kategori yang berbeda.</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
