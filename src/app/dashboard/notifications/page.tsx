"use client"

import { useState, useEffect } from "react"
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/actions/user"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Bell,
    BellOff,
    CheckCheck,
    Calendar,
    BookOpen,
    Award,
    MessageSquare,
    AlertCircle,
    ChevronRight,
    Search
} from "lucide-react"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchNotifications()
    }, [])

    async function fetchNotifications() {
        setIsLoading(true)
        const result = await getNotifications()
        if (result.notifications) {
            setNotifications(result.notifications)
        }
        setIsLoading(false)
    }

    const handleMarkAsRead = async (id: string, isRead: boolean) => {
        if (isRead) return
        const result = await markNotificationRead(id)
        if (result.success) {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
        }
    }

    const handleMarkAllAsRead = async () => {
        const result = await markAllNotificationsRead()
        if (result.success) {
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
            toast.success("Semua notifikasi ditandai telah dibaca")
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case "ENROLLMENT": return <BookOpen className="w-5 h-5 text-blue-400" />
            case "CERTIFICATE": return <Award className="w-5 h-5 text-yellow-400" />
            case "BADGE_EARNED": return <Award className="w-5 h-5 text-purple-400" />
            case "MESSAGE": return <MessageSquare className="w-5 h-5 text-green-400" />
            case "SYSTEM": return <AlertCircle className="w-5 h-5 text-red-400" />
            default: return <Bell className="w-5 h-5 text-slate-400" />
        }
    }

    const unreadCount = notifications.filter(n => !n.isRead).length

    return (
        <div className="container max-w-4xl mx-auto px-4 py-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <Bell className="w-8 h-8 text-blue-500" />
                        Pemberitahuan
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Pantau aktivitas pembelajaran dan update sistem</p>
                </div>
                {unreadCount > 0 && (
                    <Button
                        onClick={handleMarkAllAsRead}
                        className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl h-10 border border-slate-300 dark:border-slate-700"
                    >
                        <CheckCheck className="w-4 h-4 mr-2" />
                        Tandai Semua Dibaca
                    </Button>
                )}
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    Array(5).fill(0).map((_, i) => (
                        <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-900/50 animate-pulse border border-slate-200 dark:border-slate-800" />
                    ))
                ) : notifications.length === 0 ? (
                    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 border-dashed py-20">
                        <CardContent className="flex flex-col items-center justify-center">
                            <BellOff className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Belum ada notifikasi</h3>
                            <p className="text-slate-500 text-center max-w-xs italic">
                                Kami akan mengirimkan pemberitahuan jika ada aktivitas baru di kursus Anda
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    notifications.map((notif) => (
                        <Card
                            key={notif.id}
                            className={cn(
                                "group border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden relative",
                                !notif.isRead && "bg-blue-50 dark:bg-blue-600/5 border-blue-500/30 shadow-lg shadow-blue-900/5"
                            )}
                            onClick={() => handleMarkAsRead(notif.id, notif.isRead)}
                        >
                            {!notif.isRead && <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />}
                            <CardContent className="p-5">
                                <div className="flex items-start gap-4">
                                    <div className={cn(
                                        "p-3 rounded-2xl flex-shrink-0",
                                        notif.isRead ? "bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800" : "bg-blue-500/20 ring-1 ring-blue-500/30"
                                    )}>
                                        {getIcon(notif.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className={cn(
                                                "font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors"
                                            )}>
                                                {notif.title}
                                            </h3>
                                            <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {format(new Date(notif.createdAt), "d MMMM, HH:mm", { locale: localeId })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
                                            {notif.message}
                                        </p>

                                        {notif.link && (
                                            <div className="mt-3">
                                                <Link href={notif.link}>
                                                    <Button variant="link" className="p-0 h-auto text-[10px] font-black uppercase text-blue-500 hover:text-blue-400 flex items-center gap-1">
                                                        Lihat Detail <ChevronRight className="w-3 h-3" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
