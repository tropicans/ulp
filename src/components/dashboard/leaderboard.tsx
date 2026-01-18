"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award, TrendingUp, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { getLeaderboard } from "@/lib/actions/gamification"

interface Player {
    id: string
    name: string
    image: string | null
    points: number
    level: number
    unitKerja: string | null
}

import { motion, AnimatePresence } from "framer-motion"

export function Leaderboard() {
    const [players, setPlayers] = useState<Player[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [filter, setFilter] = useState<"GLOBAL" | "UNIT">("GLOBAL")

    useEffect(() => {
        async function fetchLeaderboard() {
            setIsLoading(true)
            const result = await getLeaderboard(5)
            if (result.players) {
                setPlayers(result.players as Player[])
            }
            setIsLoading(false)
        }
        fetchLeaderboard()
    }, [filter])

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 0: return <Trophy className="w-5 h-5 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.3)]" />
            case 1: return <Medal className="w-5 h-5 text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.3)]" />
            case 2: return <Medal className="w-5 h-5 text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.3)]" />
            default: return <span className="text-sm font-black text-slate-500 w-5 text-center">{rank + 1}</span>
        }
    }

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08
            }
        }
    }

    const item = {
        hidden: { opacity: 0, x: -10 },
        show: { opacity: 1, x: 0 }
    }

    return (
        <Card glass className="shadow-xl overflow-hidden border-slate-200 dark:border-slate-700/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-500" />
                    Papan Peringkat
                </CardTitle>
                <div className="flex bg-slate-100 dark:bg-slate-950/60 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                    <button
                        onClick={() => setFilter("GLOBAL")}
                        className={cn(
                            "px-3 py-1 text-[10px] font-black rounded-md transition-all uppercase tracking-tighter",
                            filter === "GLOBAL" ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-lg" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                    >
                        GLOBAL
                    </button>
                    <button
                        onClick={() => setFilter("UNIT")}
                        className={cn(
                            "px-3 py-1 text-[10px] font-black rounded-md transition-all uppercase tracking-tighter",
                            filter === "UNIT" ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-lg" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                    >
                        UNIT
                    </button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-4 py-4"
                        >
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex items-center gap-4 animate-pulse opacity-50">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="list"
                            variants={container}
                            initial="hidden"
                            animate="show"
                            className="space-y-3"
                        >
                            {players.map((player, index) => (
                                <motion.div
                                    key={player.id}
                                    variants={item}
                                    whileHover={{ x: 5, backgroundColor: "rgba(255,255,255,0.03)" }}
                                    className={cn(
                                        "flex items-center gap-4 p-3 rounded-xl transition-all group border border-transparent",
                                        index === 0 ? "bg-yellow-500/5 border-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.05)]" : ""
                                    )}
                                >
                                    <div className="w-8 flex justify-center">
                                        {getRankIcon(index)}
                                    </div>

                                    <Avatar className="h-10 w-10 border-2 border-slate-200 dark:border-slate-800 group-hover:border-blue-500/50 transition-colors">
                                        <AvatarImage src={player.image || ""} />
                                        <AvatarFallback className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold">
                                            {player.name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                                            {player.name}
                                        </p>
                                        <p className="text-[10px] text-slate-500 truncate font-medium">
                                            {player.unitKerja || "Instansi Umum"}
                                        </p>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-sm font-black text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.2)]">{player.points}</p>
                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">
                                            Level {player.level}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="pt-4 border-t border-slate-200 dark:border-white/5 text-center">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="text-[10px] font-black text-slate-500 hover:text-blue-400 transition-colors flex items-center justify-center gap-1 mx-auto uppercase tracking-widest"
                    >
                        <Users className="w-3 h-3" />
                        LIHAT SEMUA PERINGKAT
                    </motion.button>
                </div>
            </CardContent>
        </Card>
    )
}
