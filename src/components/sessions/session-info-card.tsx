"use client"

import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Calendar,
    Clock,
    MapPin,
    Video,
    ExternalLink,
    Users,
    QrCode
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Session {
    id: string
    title: string
    startTime: Date
    endTime: Date
    location?: string | null
    zoomJoinUrl?: string | null
    zoomMeetingId?: string | null
    maxParticipants?: number | null
    _count?: {
        Attendance: number
    }
}

interface SessionInfoCardProps {
    session: Session
    showQrButton?: boolean
    showJoinButton?: boolean
    compact?: boolean
}

export function SessionInfoCard({
    session,
    showQrButton = false,
    showJoinButton = true,
    compact = false
}: SessionInfoCardProps) {
    const isPast = new Date(session.endTime) < new Date()
    const isOngoing = new Date(session.startTime) <= new Date() && new Date(session.endTime) >= new Date()
    const isUpcoming = new Date(session.startTime) > new Date()

    const statusBadge = isPast
        ? { label: "Selesai", className: "bg-slate-500/20 text-slate-500" }
        : isOngoing
            ? { label: "Sedang Berlangsung", className: "bg-green-500/20 text-green-500" }
            : { label: "Akan Datang", className: "bg-blue-500/20 text-blue-500" }

    if (compact) {
        return (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-lg",
                        session.zoomJoinUrl ? "bg-blue-500/10" : "bg-green-500/10"
                    )}>
                        {session.zoomJoinUrl ? (
                            <Video className="w-4 h-4 text-blue-500" />
                        ) : (
                            <MapPin className="w-4 h-4 text-green-500" />
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{session.title}</p>
                        <p className="text-xs text-slate-500">
                            {format(new Date(session.startTime), "dd MMM, HH:mm", { locale: localeId })}
                        </p>
                    </div>
                </div>
                <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
            </div>
        )
    }

    return (
        <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden">
            <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white mb-1">{session.title}</h4>
                        <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
                    </div>
                    {session.maxParticipants && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Users className="w-3.5 h-3.5" />
                            <span>{session._count?.Attendance || 0}/{session.maxParticipants}</span>
                        </div>
                    )}
                </div>

                <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>{format(new Date(session.startTime), "EEEE, dd MMMM yyyy", { locale: localeId })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>
                            {format(new Date(session.startTime), "HH:mm", { locale: localeId })} - {format(new Date(session.endTime), "HH:mm", { locale: localeId })} WIB
                        </span>
                    </div>
                    {session.location && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <span>{session.location}</span>
                        </div>
                    )}
                    {session.zoomJoinUrl && (
                        <div className="flex items-center gap-2 text-sm text-blue-500">
                            <Video className="w-4 h-4" />
                            <span>Sesi Online via Zoom</span>
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    {showJoinButton && session.zoomJoinUrl && isOngoing && (
                        <Button asChild size="sm" className="flex-1 bg-blue-600 hover:bg-blue-500">
                            <a href={session.zoomJoinUrl} target="_blank" rel="noopener noreferrer">
                                <Video className="w-4 h-4 mr-2" />
                                Gabung Zoom
                            </a>
                        </Button>
                    )}
                    {showQrButton && !isPast && (
                        <Button asChild size="sm" variant="outline" className="flex-1 border-slate-300 dark:border-slate-600">
                            <Link href={`/dashboard/sessions/${session.id}`}>
                                <QrCode className="w-4 h-4 mr-2" />
                                Lihat QR Absensi
                            </Link>
                        </Button>
                    )}
                    {!showJoinButton && !showQrButton && (
                        <Button asChild size="sm" variant="outline" className="w-full border-slate-300 dark:border-slate-600">
                            <Link href={`/dashboard/sessions/${session.id}`}>
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Lihat Detail
                            </Link>
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
