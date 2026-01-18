"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

const filters = [
    { label: "Semua", value: null },
    { label: "On-Classroom", value: "ON_CLASSROOM" },
    { label: "Hybrid", value: "HYBRID" },
    { label: "E-Learning", value: "ASYNC_ONLINE" },
    { label: "Live Online", value: "SYNC_ONLINE" },
]

export function CourseFilters() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()
    const currentMode = searchParams.get("mode")

    const handleFilter = (value: string | null) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value) {
            params.set("mode", value)
        } else {
            params.delete("mode")
        }
        router.push(`${pathname}?${params.toString()}`)
    }

    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide no-scrollbar">
            <motion.div
                className="flex items-center gap-2"
                initial={false}
            >
                {filters.map((filter) => {
                    const isActive = (filter.value === null && !currentMode) || (filter.value === currentMode)
                    return (
                        <motion.button
                            key={filter.label}
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleFilter(filter.value)}
                            className={cn(
                                "relative px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300",
                                isActive
                                    ? "text-white bg-blue-600 shadow-lg shadow-blue-600/20"
                                    : "text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 hover:text-slate-700 dark:hover:text-slate-200"
                            )}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeFilter"
                                    className="absolute inset-0 bg-blue-600 rounded-xl -z-10 shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className="relative z-10">{filter.label}</span>
                        </motion.button>
                    )
                })}
            </motion.div>
        </div>
    )
}
