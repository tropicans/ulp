"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
    LayoutDashboard,
    History,
    ArrowLeft,
    RefreshCw
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { JourneyTimeline } from "@/components/dashboard/journey-timeline"
import { getLearnerJourney, JourneyActivity } from "@/lib/actions/journey"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function JourneyPage() {
    const [activities, setActivities] = useState<JourneyActivity[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchJourney = async () => {
        setIsLoading(true)
        try {
            const data = await getLearnerJourney()
            setActivities(data)
        } catch (error) {
            console.error("Failed to fetch journey:", error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchJourney()
    }, [])

    return (
        <div className="container mx-auto px-4 py-8 relative">
            {/* Background Decoration */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6"
            >
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link
                            href="/dashboard/learner"
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-500 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div className="p-1.5 rounded-lg bg-blue-600/10 text-blue-500">
                            <History className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] uppercase font-black tracking-widest text-blue-500/80">Personal Journey</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                        Jejak Pembelajaran 🚀
                    </h1>
                    <p className="text-slate-400 font-medium">
                        Lihat riwayat aktivitas dan pencapaian Anda selama belajar di platform ini.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchJourney}
                        disabled={isLoading}
                        className="border-slate-200 dark:border-slate-800 font-bold rounded-xl"
                    >
                        <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                        Refresh
                    </Button>
                </div>
            </motion.div>

            {/* Timeline Section */}
            <div className="max-w-4xl mx-auto">
                {isLoading ? (
                    <div className="space-y-8">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex gap-4">
                                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                                <Skeleton className="h-32 w-full rounded-xl" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <JourneyTimeline activities={activities} />
                )}
            </div>
        </div>
    )
}
