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
    Users,
    ChevronRight,
    ArrowLeft,
} from "lucide-react"
import { CreateSessionDialog } from "@/components/sessions/create-session-dialog"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"

interface SessionsPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function SessionsPage({ params }: SessionsPageProps) {
    const { id: courseId } = await params
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
            CourseSession: {
                include: {
                    _count: {
                        select: { Attendance: true },
                    },
                },
                orderBy: { startTime: "asc" },
            },
        },
    })

    if (!course) {
        return <div>Course not found</div>
    }

    // Check permission
    if (
        course.instructorId !== session.user.id &&
        !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)
    ) {
        redirect("/dashboard")
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                        <Link href={`/dashboard/courses/${course.id}/edit`}>
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Kelola Sesi</h1>
                        <p className="text-slate-500 dark:text-slate-400">{course.title}</p>
                    </div>
                </div>
                <CreateSessionDialog courseId={course.id} />
            </div>

            <div className="grid gap-4">
                {course.CourseSession.length > 0 ? (
                    course.CourseSession.map((session) => (
                        <Card key={session.id} className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                                {session.title}
                                            </h3>
                                            <Badge className="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30">
                                                {session.type}
                                            </Badge>
                                            {new Date(session.startTime) < new Date() &&
                                                new Date(session.endTime) > new Date() && (
                                                    <Badge className="bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/30">
                                                        Sedang Berlangsung
                                                    </Badge>
                                                )}
                                        </div>
                                        <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                                {format(new Date(session.startTime), "EEEE, d MMMM yyyy", {
                                                    locale: localeId,
                                                })}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                                {format(new Date(session.startTime), "HH:mm")} -{" "}
                                                {format(new Date(session.endTime), "HH:mm")}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {session.type === "LIVE_ONLINE" ? (
                                                    <>
                                                        <Video className="w-4 h-4 text-purple-500" />
                                                        <span className="text-purple-600 dark:text-purple-400">Online</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <MapPin className="w-4 h-4 text-orange-500" />
                                                        <span>{session.location || "Lokasi belum ditentukan"}</span>
                                                    </>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Users className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                                <span className="font-medium">{session._count.Attendance}</span> Peserta Hadir
                                            </div>
                                        </div>
                                    </div>
                                    <Button asChild variant="outline" className="border-slate-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:border-blue-300 dark:hover:border-blue-500/30 hover:text-blue-600 dark:hover:text-blue-400">
                                        <Link href={`/dashboard/sessions/${session.id}`}>
                                            Kelola Absensi
                                            <ChevronRight className="w-4 h-4 ml-2" />
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <Card className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 border-dashed border-2">
                        <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
                                <Calendar className="w-10 h-10 text-slate-400 dark:text-slate-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                Belum ada sesi
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-8">
                                Klik tombol "Buat Session" untuk menjadwalkan pertemuan tatap muka
                                atau sesi online.
                            </p>
                            <CreateSessionDialog courseId={course.id} />
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
