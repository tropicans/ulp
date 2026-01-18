"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Calendar as CalendarIcon, Clock, MapPin, Users, ChevronLeft, ChevronRight, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function SchedulePage() {
    const [currentMonth, setCurrentMonth] = useState(new Date())

    // Placeholder events
    const events = [
        { date: 18, title: "Webinar Digital Governance", time: "09:00 - 11:00", type: "SYNC_ONLINE" },
        { date: 20, title: "Workshop Kepemimpinan", time: "13:00 - 16:00", type: "FACE_TO_FACE" },
        { date: 25, title: "Ujian Sertifikasi", time: "10:00 - 12:00", type: "SYNC_ONLINE" },
    ]

    const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="mb-10 text-center md:text-left">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center justify-center md:justify-start gap-3">
                    <CalendarIcon className="w-8 h-8 text-blue-500" />
                    Jadwal Belajar
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Pantau sesi sinkronus dan deadline kursus Anda</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Calendar View */}
                <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 rounded-3xl">
                    <div className="flex items-center justify-between mb-8 px-2">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Januari 2026</h2>
                        <div className="flex gap-2">
                            <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"><ChevronLeft className="w-4 h-4" /></Button>
                            <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"><ChevronRight className="w-4 h-4" /></Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-2 mb-4">
                        {days.map(d => (
                            <div key={d} className="text-center text-[10px] font-black uppercase text-slate-600 tracking-widest py-2">
                                {d}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                        {Array(31).fill(0).map((_, i) => {
                            const day = i + 1
                            const hasEvent = events.find(e => e.date === day)
                            return (
                                <div
                                    key={i}
                                    className={cn(
                                        "aspect-square rounded-2xl border border-slate-200 dark:border-slate-800/50 flex flex-col items-center justify-center relative cursor-pointer group hover:border-blue-500/50 transition-all",
                                        day === 17 ? "bg-blue-600 border-none shadow-lg shadow-blue-900/30" : "bg-slate-50 dark:bg-slate-950/30",
                                        hasEvent && "ring-1 ring-blue-500/30"
                                    )}
                                >
                                    <span className={cn("text-lg font-bold", day === 17 ? "text-white" : "text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white")}>{day}</span>
                                    {hasEvent && (
                                        <div className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </Card>

                {/* Upcoming Events List */}
                <div className="space-y-6">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 px-2">
                        Sesi Mendatang
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    </h3>

                    <div className="space-y-4">
                        {events.map((event, i) => (
                            <div key={i} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xl group cursor-pointer">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center">
                                        <span className="text-[8px] font-black uppercase text-slate-500">Jan</span>
                                        <span className="text-xl font-bold text-slate-900 dark:text-white leading-none">{event.date}</span>
                                    </div>
                                    <div className={cn(
                                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                        event.type === "SYNC_ONLINE" ? "bg-blue-500/10 text-blue-400" : "bg-orange-500/10 text-orange-400"
                                    )}>
                                        {event.type === "SYNC_ONLINE" ? "Online" : "Classroom"}
                                    </div>
                                </div>
                                <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2 leading-tight">
                                    {event.title}
                                    <span className="block text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{event.type === "SYNC_ONLINE" ? "Virtual Meeting" : "Pertemuan Tatap Muka"}</span>
                                </h4>
                                <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800/50">
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                        <Clock className="w-3.5 h-3.5" /> {event.time} WIB
                                    </div>
                                    {event.type === "SYNC_ONLINE" ? (
                                        <div className="flex items-center gap-2 text-[10px] text-blue-500 font-bold">
                                            <Video className="w-3.5 h-3.5" /> Meeting Link Ready
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-[10px] text-orange-400 font-bold">
                                            <MapPin className="w-3.5 h-3.5" /> Ruang B-201, LAN RI
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
