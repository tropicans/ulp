"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { getCourses } from "@/lib/actions/courses"
import { CourseCard } from "@/components/courses/course-card"
import { GraduationCap, Filter, BookOpen, ChevronDown } from "lucide-react"
import { CourseFilters } from "@/components/courses/course-filters"
import { DeliveryMode } from "@/generated/prisma"
import { motion, AnimatePresence } from "framer-motion"
import { COURSE_CATEGORIES, getCategoryLabel } from "@/lib/constants/categories"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

// Inner component that uses useSearchParams
function CoursesContent() {
    const searchParams = useSearchParams()
    const [courses, setCourses] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

    // Get mode from URL search params
    const mode = searchParams.get("mode") as DeliveryMode | null

    useEffect(() => {
        async function loadCourses() {
            setIsLoading(true)
            const fetchedCourses = await getCourses({
                isPublished: true,
                deliveryMode: mode || undefined,
                category: selectedCategory || undefined
            })
            setCourses(fetchedCourses)
            setIsLoading(false)
        }
        loadCourses()
    }, [mode, selectedCategory])

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    }

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16"
            >
                <div className="max-w-2xl">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 rounded-2xl bg-blue-600/10 text-blue-500 border border-blue-500/20 shadow-xl shadow-blue-500/5">
                            <GraduationCap className="w-8 h-8" />
                        </div>
                        <div>
                            <span className="text-[10px] uppercase font-black tracking-widest text-blue-500/80 block mb-0.5">Explore Learning</span>
                            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Katalog Kursus</h1>
                        </div>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-lg font-medium leading-relaxed">
                        Akselerasi kompetensi Anda melalui kurikulum yang dirancang khusus untuk kebutuhan ASN masa depan.
                    </p>
                </div>

                {/* Filter Bar */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-4 bg-slate-100 dark:bg-slate-950/40 backdrop-blur-xl p-2 rounded-2xl border border-slate-200 dark:border-white/5 shadow-2xl"
                >
                    <CourseFilters />
                    <div className="w-px h-8 bg-slate-300 dark:bg-white/10 mx-2" />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-9 px-3 rounded-xl text-xs font-bold">
                                <Filter className="w-4 h-4 mr-2" />
                                {selectedCategory ? getCategoryLabel(selectedCategory) : "Semua Kategori"}
                                <ChevronDown className="w-3 h-3 ml-2" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                            <DropdownMenuItem onClick={() => setSelectedCategory(null)}>
                                📁 Semua Kategori
                            </DropdownMenuItem>
                            {COURSE_CATEGORIES.map((cat) => (
                                <DropdownMenuItem key={cat.value} onClick={() => setSelectedCategory(cat.value)}>
                                    {cat.icon} {cat.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </motion.div>
            </motion.div>

            {/* Course Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="h-[400px] rounded-[32px] bg-slate-200 dark:bg-slate-800/20 animate-pulse border border-slate-300 dark:border-white/5" />
                    ))}
                </div>
            ) : (
                <AnimatePresence mode="wait">
                    {courses.length > 0 ? (
                        <motion.div
                            key="grid"
                            variants={container}
                            initial="hidden"
                            animate="show"
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                        >
                            {courses.map((course) => (
                                <motion.div key={course.id} variants={item}>
                                    <CourseCard course={course} />
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center py-32 bg-slate-100 dark:bg-slate-950/40 backdrop-blur-xl rounded-[40px] border border-dashed border-slate-300 dark:border-white/10"
                        >
                            <div className="w-24 h-24 bg-slate-200 dark:bg-slate-900/50 rounded-full flex items-center justify-center mb-8 border border-slate-300 dark:border-white/5">
                                <BookOpen className="w-12 h-12 text-slate-400 dark:text-slate-600" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Belum Ada Kursus</h2>
                            <p className="text-slate-500 dark:text-slate-400 max-w-sm text-center font-medium">
                                Maaf, untuk kategori ini belum tersedia kursus. Silakan coba filter yang lain.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}
        </div>
    )
}

// Loading skeleton
function CoursesLoading() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
                <div className="max-w-2xl">
                    <div className="h-16 w-64 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse mb-4" />
                    <div className="h-6 w-96 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
                </div>
                <div className="h-12 w-96 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="h-[400px] rounded-[32px] bg-slate-200 dark:bg-slate-800/20 animate-pulse border border-slate-300 dark:border-white/5" />
                ))}
            </div>
        </div>
    )
}

// Main page component wrapped with Suspense
export default function CoursesPage() {
    return (
        <Suspense fallback={<CoursesLoading />}>
            <CoursesContent />
        </Suspense>
    )
}
