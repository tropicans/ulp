import { redirect, notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getSyncCourseConfig } from "@/lib/actions/sync-course"
import { KAPUploadForm } from "@/components/sync-course"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Video } from "lucide-react"
import Link from "next/link"

interface SyncConfigPageProps {
    params: Promise<{ courseId: string }>
}

export default async function SyncConfigPage({ params }: SyncConfigPageProps) {
    const { courseId } = await params
    const session = await auth()

    if (!session?.user) {
        redirect("/login")
    }

    // Only instructors and admins can access
    if (session.user.role === "LEARNER") {
        redirect("/dashboard/learner")
    }

    // Get course
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: {
            id: true,
            title: true,
            slug: true,
            deliveryMode: true,
            instructorId: true,
            syncConfig: true
        }
    })

    if (!course) notFound()

    // Check permission
    if (course.instructorId !== session.user.id &&
        session.user.role !== "SUPER_ADMIN" &&
        session.user.role !== "ADMIN_UNIT") {
        redirect("/dashboard/instructor")
    }

    const existingConfig = await getSyncCourseConfig(course.id)

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
            {/* Header */}
            <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 px-4 md:px-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button asChild variant="ghost" size="sm">
                        <Link href="/dashboard/instructor">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Kembali
                        </Link>
                    </Button>
                    <div className="border-l border-slate-200 dark:border-slate-700 pl-4">
                        <h1 className="text-sm font-bold text-slate-900 dark:text-white">
                            {course.title}
                        </h1>
                        <p className="text-xs text-slate-500">Sync Course Configuration</p>
                    </div>
                </div>
                <Badge variant={course.deliveryMode === "SYNC_ONLINE" ? "default" : "outline"} className="text-xs">
                    <Video className="w-3 h-3 mr-1" />
                    {course.deliveryMode}
                </Badge>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="mb-8">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                        Konfigurasi Sync Course
                    </h2>
                    <p className="text-slate-500">
                        Upload dokumen KAP untuk mengekstrak informasi course dan generate soal validasi secara otomatis.
                    </p>
                </div>

                <KAPUploadForm
                    courseId={course.id}
                    courseName={course.title}
                    existingConfig={existingConfig}
                />
            </main>
        </div>
    )
}
