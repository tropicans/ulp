import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { CheckInInterface } from "@/components/sessions/check-in-interface"
import { SiteHeader } from "@/components/navigation/site-header"

interface CheckInPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function CheckInPage({ params }: CheckInPageProps) {
    const { id: sessionId } = await params
    const session = await auth()

    if (!session) {
        redirect(`/login?callbackUrl=/sessions/${sessionId}/checkin`)
    }

    const courseSession = await prisma.courseSession.findUnique({
        where: { id: sessionId },
        include: {
            Course: true,
        },
    })

    if (!courseSession) {
        return <div>Session not found</div>
    }

    // Check enrollment
    const enrollment = await prisma.enrollment.findUnique({
        where: {
            userId_courseId: {
                userId: session.user.id,
                courseId: courseSession.courseId,
            },
        },
    })

    if (!enrollment && session.user.role === "LEARNER") {
        return (
            <div className="min-h-screen flex flex-col bg-slate-900">
                <SiteHeader />
                <div className="flex-1 flex items-center justify-center px-4">
                    <div className="max-w-md w-full bg-slate-800 p-8 rounded-xl border border-slate-700 text-center">
                        <h2 className="text-xl font-bold text-white mb-4">Akses Ditolak</h2>
                        <p className="text-slate-400 mb-6">
                            Anda harus terdaftar dalam kursus "{courseSession.Course.title}" untuk melakukan presensi sesi ini.
                        </p>
                        <a
                            href={`/courses/${courseSession.Course.slug}`}
                            className="text-blue-400 hover:underline"
                        >
                            Lihat Kursus
                        </a>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
            <SiteHeader />

            <main className="flex-1 flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <CheckInInterface
                        sessionId={courseSession.id}
                        sessionTitle={courseSession.title}
                        hasGPS={!!courseSession.latitude}
                        radius={courseSession.geoRadius || undefined}
                    />
                </div>
            </main>

            <footer className="p-6 text-center text-slate-500 text-xs">
                &copy; {new Date().getFullYear()} TITAN - Kementerian Sekretariat Negara
            </footer>
        </div>
    )
}
