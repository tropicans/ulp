"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Footprints,
    Brain,
    Flame,
    Award,
    Lock,
    CheckCircle2,
    Trophy
} from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

const BADGE_ICONS: Record<string, any> = {
    Footprints: Footprints,
    Brain: Brain,
    Flame: Flame,
    Award: Award,
}

interface BadgeGridProps {
    badges: any[]
    points: number
    level: number
    streak: number
}

export function BadgeGrid({ badges, points, level, streak }: BadgeGridProps) {
    // All possible badges (would normally fetch from DB)
    const allBadges = [
        { id: "badge-first-step", name: "Langkah Pertama", icon: "Footprints", points: 10 },
        { id: "badge-quiz-master", name: "Quiz Master", icon: "Brain", points: 50 },
        { id: "badge-streak-3", name: "Belajar Tekun", icon: "Flame", points: 30 },
        { id: "badge-course-finisher", name: "Penuntas Kursus", icon: "Award", points: 100 },
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
        hidden: { opacity: 0, scale: 0.8 },
        show: { opacity: 1, scale: 1 }
    }

    return (
        <Card glass className="shadow-xl overflow-hidden border-slate-200 dark:border-slate-700/50">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500 -mx-0 -mt-6 px-6 py-4 mb-2">
                <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-400 animate-pulse" />
                    Pencapaian & Badge
                </CardTitle>
            </CardHeader>
            <CardContent>
                <motion.div
                    variants={container}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true }}
                    className="grid grid-cols-2 sm:grid-cols-4 gap-4"
                >
                    {allBadges.map((badgeDef) => {
                        const earned = badges.some(b => b.id === badgeDef.id)
                        const Icon = BADGE_ICONS[badgeDef.icon] || Award

                        return (
                            <motion.div
                                key={badgeDef.id}
                                variants={item}
                                whileHover={earned ? { scale: 1.05, rotate: 2 } : {}}
                                className={cn(
                                    "relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300",
                                    earned
                                        ? "bg-purple-100 dark:bg-purple-600/10 border-purple-300 dark:border-purple-500/30 text-slate-900 dark:text-white shadow-[0_0_20px_rgba(168,85,247,0.1)]"
                                        : "bg-slate-100 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 opacity-60 grayscale"
                                )}
                            >
                                <div className={cn(
                                    "w-12 h-12 rounded-xl flex items-center justify-center mb-3 shadow-lg transition-transform",
                                    earned ? "bg-purple-600 shadow-purple-900/40" : "bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800"
                                )}>
                                    {earned ? <Icon className="w-6 h-6 text-white" /> : <Lock className="w-5 h-5 text-slate-400 dark:text-slate-600" />}
                                </div>
                                <p className="text-[10px] font-black text-center uppercase tracking-wider line-clamp-1 text-slate-700 dark:text-slate-300">
                                    {badgeDef.name}
                                </p>
                                {earned && (
                                    <div className="absolute top-2 right-2">
                                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                                    </div>
                                )}
                            </motion.div>
                        )
                    })}
                </motion.div>

                <div className="mt-8 grid grid-cols-3 gap-2">
                    <motion.div
                        whileHover={{ y: -2 }}
                        className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-center"
                    >
                        <p className="text-[9px] text-slate-500 uppercase font-black tracking-tighter">Level</p>
                        <p className="text-lg font-black text-slate-900 dark:text-white">{level}</p>
                    </motion.div>
                    <motion.div
                        whileHover={{ y: -2 }}
                        className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-center"
                    >
                        <p className="text-[9px] text-slate-500 uppercase font-black tracking-tighter">Points</p>
                        <p className="text-lg font-black text-slate-900 dark:text-white">{points}</p>
                    </motion.div>
                    <motion.div
                        whileHover={{ y: -2 }}
                        className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-center"
                    >
                        <p className="text-[9px] text-slate-500 uppercase font-black tracking-tighter">Streak</p>
                        <p className="text-lg font-black text-slate-900 dark:text-white">{streak} 🔥</p>
                    </motion.div>
                </div>
            </CardContent>
        </Card>
    )
}
