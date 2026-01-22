import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Calendar,
    Clock,
    MapPin,
    Video,
    ArrowLeft,
    Users,
    CheckCircle2,
    XCircle,
    MoreVertical,
} from "lucide-react"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { AttendanceQRDisplay } from "@/components/sessions/attendance-qr-display"

interface SessionDetailPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function SessionDetailPage({
    params,
}: SessionDetailPageProps) {
    const { id: sessionId } = await params
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    const courseSession = await prisma.courseSession.findUnique({
        where: { id: sessionId },
        include: {
            Course: true,
            Attendance: {
                include: {
                    User: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            nip: true,
                            image: true,
                        },
                    },
                },
                orderBy: { checkInAt: "desc" },
            },
        },
    })

    if (!courseSession) {
        return <div>Session not found</div>
    }

    // Check permission
    if (
        courseSession.Course.instructorId !== session.user.id &&
        !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)
    ) {
        redirect("/dashboard")
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild className="text-slate-400 mb-4">
                    <Link href={`/dashboard/courses/${courseSession.courseId}/sessions`}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Kembali ke Daftar Sesi
                    </Link>
                </Button>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                            {courseSession.title}
                        </h1>
                        <div className="flex items-center gap-4 text-slate-400 text-sm">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(courseSession.startTime), "EEEE, d MMMM yyyy", {
                                    locale: localeId,
                                })}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {format(new Date(courseSession.startTime), "HH:mm")} -{" "}
                                {format(new Date(courseSession.endTime), "HH:mm")}
                            </span>
                        </div>
                    </div>
                    <Badge className="w-fit h-fit bg-blue-500/20 text-blue-400 border-blue-500/30 py-1.5 px-3">
                        {courseSession.type}
                    </Badge>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* QR Code Section - Only for Classroom or Hybrid */}
                    {(courseSession.type === "CLASSROOM" ||
                        courseSession.type === "HYBRID") && (
                            <AttendanceQRDisplay sessionId={courseSession.id} />
                        )}

                    {/* Attendance List */}
                    <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-slate-900 dark:text-white">Daftar Kehadiran</CardTitle>
                                <CardDescription>
                                    {courseSession.Attendance.length} peserta telah hadir
                                </CardDescription>
                            </div>
                            <Button variant="outline" className="border-slate-300 dark:border-slate-600">
                                Ekspor CSV
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {courseSession.Attendance.length > 0 ? (
                                    courseSession.Attendance.map((record) => (
                                        <div
                                            key={record.id}
                                            className="flex items-center justify-between p-4 rounded-lg bg-slate-100 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center overflow-hidden">
                                                    {record.User.image ? (
                                                        <img
                                                            src={record.User.image}
                                                            alt={record.User.name || undefined}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="text-slate-900 dark:text-white font-bold">
                                                            {(record.User.name || "?").charAt(0)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-white">
                                                        {record.User.name}
                                                    </p>
                                                    <p className="text-xs text-slate-400">
                                                        NIP: {record.User.nip || "-"} •{" "}
                                                        {record.User.email}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-right">
                                                <div className="hidden sm:block">
                                                    <p className="text-sm text-slate-900 dark:text-white">
                                                        {record.checkInAt ? format(record.checkInAt, "HH:mm") : "-"}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                                                        {record.method}
                                                    </p>
                                                </div>
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        record.status === "PRESENT"
                                                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                                                            : record.status === "LATE"
                                                                ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                                                : "bg-red-500/10 text-red-400 border-red-500/20"
                                                    }
                                                >
                                                    {record.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12">
                                        <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                        <p className="text-slate-400">Belum ada peserta yang hadir</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                        <CardHeader>
                            <CardTitle className="text-slate-900 dark:text-white text-lg">Informasi Sesi</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-xs text-slate-400 uppercase tracking-wider">
                                    Status Berjalan
                                </p>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${new Date(courseSession.endTime) < new Date() ? "bg-slate-500" : "bg-green-500 animate-pulse"
                                        }`} />
                                    <p className="text-sm text-slate-900 dark:text-white">
                                        {new Date(courseSession.endTime) < new Date() ? "Selesai" : "Aktif"}
                                    </p>
                                </div>
                            </div>

                            {courseSession.type !== "LIVE_ONLINE" && (
                                <div className="space-y-1">
                                    <p className="text-xs text-slate-400 uppercase tracking-wider">
                                        Lokasi
                                    </p>
                                    <p className="text-sm text-slate-900 dark:text-white flex items-start gap-2 pt-1">
                                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                                        {courseSession.location}
                                    </p>
                                    {courseSession.address && (
                                        <p className="text-xs text-slate-500 pl-6">
                                            {courseSession.address}
                                        </p>
                                    )}
                                </div>
                            )}

                            {courseSession.zoomJoinUrl && (
                                <div className="space-y-1">
                                    <p className="text-xs text-slate-400 uppercase tracking-wider">
                                        Link Zoom
                                    </p>
                                    <div className="pt-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                            className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                                        >
                                            <Link href={courseSession.zoomJoinUrl} target="_blank">
                                                <Video className="w-4 h-4 mr-2" />
                                                Buka Zoom
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {courseSession.description && (
                                <div className="space-y-1">
                                    <p className="text-xs text-slate-400 uppercase tracking-wider">
                                        Deskripsi
                                    </p>
                                    <p className="text-sm text-slate-300">
                                        {courseSession.description}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                        <CardHeader>
                            <CardTitle className="text-slate-900 dark:text-white text-lg">GPS Geofencing</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Status GPS</span>
                                <Badge variant="outline" className={courseSession.latitude ? "text-green-400 bg-green-400/10" : "text-slate-400"}>
                                    {courseSession.latitude ? "Aktif" : "Non-aktif"}
                                </Badge>
                            </div>
                            {courseSession.latitude && (
                                <>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Radius</span>
                                        <span className="text-slate-900 dark:text-white">{courseSession.geoRadius} meter</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Koordinat</span>
                                        <span className="text-slate-900 dark:text-white text-xs">
                                            {courseSession.latitude.toFixed(4)}, {courseSession.longitude?.toFixed(4)}
                                        </span>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
