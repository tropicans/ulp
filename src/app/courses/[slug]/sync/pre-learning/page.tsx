import { redirect, notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getSyncCourseProgress, getSyncCourseConfig } from "@/lib/actions/sync-course"
import { PreLearningView } from "@/components/sync-course"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface PreLearningPageProps {
    params: Promise<{ slug: string }>
}

export default async function PreLearningPage({ params }: PreLearningPageProps) {
    const { slug } = await params
    const session = await auth()

    if (!session?.user) {
        redirect(`/login?callbackUrl=/courses/${slug}/sync/pre-learning`)
    }

    // Get course
    const course = await prisma.course.findUnique({
        where: { slug },
        include: {
            Enrollment: {
                where: { userId: session.user.id }
            }
        }
    })

    if (!course) notFound()

    // Check enrollment
    if (course.Enrollment.length === 0 && session.user.role === "LEARNER") {
        redirect(`/courses/${slug}`)
    }

    // Get sync config
    const config = await getSyncCourseConfig(course.id)

    if (!config) {
        // Default config for testing
        const defaultConfig = {
            advanceOrganizer: {
                title: "Persiapan Pembelajaran",
                content: `<p>Selamat datang di sesi pembelajaran <strong>${course.title}</strong>.</p>
                <p>Sebelum mengikuti sesi live, penting bagi Anda untuk memahami kerangka konseptual berikut:</p>
                <ul>
                    <li>Tujuan pembelajaran dari sesi ini</li>
                    <li>Konsep-konsep kunci yang akan dibahas</li>
                    <li>Bagaimana menghubungkan materi dengan pengetahuan yang sudah dimiliki</li>
                </ul>`,
                videoUrl: undefined
            },
            learningFocus: [
                "Memahami konsep dasar yang akan disampaikan",
                "Mengidentifikasi poin-poin penting selama sesi",
                "Menghubungkan materi dengan konteks pekerjaan"
            ],
            youtubeStreamUrl: "",
            conceptValidation: { questions: [] }
        }

        return (
            <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
                <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 px-4 md:px-6 flex items-center">
                    <Button asChild variant="ghost" size="sm">
                        <Link href={`/courses/${slug}`}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Kembali
                        </Link>
                    </Button>
                </header>
                <main className="container mx-auto px-4 py-8">
                    <PreLearningView
                        courseId={course.id}
                        courseSlug={slug}
                        courseTitle={course.title}
                        config={defaultConfig}
                        alreadyAccessed={false}
                    />
                </main>
            </div>
        )
    }

    // Get progress
    const progress = await getSyncCourseProgress(course.id)
    const alreadyAccessed = !("error" in progress) && !!progress.preLearnAccessedAt

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
            <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 px-4 md:px-6 flex items-center">
                <Button asChild variant="ghost" size="sm">
                    <Link href={`/courses/${slug}`}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Kembali
                    </Link>
                </Button>
            </header>

            <main className="container mx-auto px-4 py-8">
                <PreLearningView
                    courseId={course.id}
                    courseSlug={slug}
                    courseTitle={course.title}
                    config={config}
                    alreadyAccessed={alreadyAccessed}
                />
            </main>
        </div>
    )
}
