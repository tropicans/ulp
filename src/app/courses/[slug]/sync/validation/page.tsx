import { redirect, notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getSyncCourseProgress, getSyncCourseConfig } from "@/lib/actions/sync-course"
import { ConceptValidationView } from "@/components/sync-course"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface ValidationPageProps {
    params: Promise<{ slug: string }>
}

export default async function ValidationPage({ params }: ValidationPageProps) {
    const { slug } = await params
    const session = await auth()

    if (!session?.user) {
        redirect(`/login?callbackUrl=/courses/${slug}/sync/validation`)
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

    // Default config with sample questions for testing
    const effectiveConfig = config || {
        advanceOrganizer: {
            title: "Persiapan Pembelajaran",
            content: "",
            videoUrl: undefined
        },
        learningFocus: [],
        youtubeStreamUrl: "",
        conceptValidation: {
            questions: [
                {
                    id: "q1",
                    text: "Apa yang menjadi fokus utama dari sesi pembelajaran ini?",
                    options: [
                        { id: "q1a", text: "Penguasaan teknis operasional" },
                        { id: "q1b", text: "Pemahaman konseptual dan kerangka berpikir" },
                        { id: "q1c", text: "Praktik langsung di lapangan" },
                        { id: "q1d", text: "Penilaian kinerja individu" }
                    ],
                    correctOptionId: "q1b"
                },
                {
                    id: "q2",
                    text: "Bagaimana cara terbaik untuk mengaplikasikan pengetahuan dari sesi ini?",
                    options: [
                        { id: "q2a", text: "Menghafal semua materi presentasi" },
                        { id: "q2b", text: "Menghubungkan konsep dengan konteks pekerjaan sehari-hari" },
                        { id: "q2c", text: "Mengabaikan dan fokus pada tugas rutin" },
                        { id: "q2d", text: "Menunggu instruksi lebih lanjut dari atasan" }
                    ],
                    correctOptionId: "q2b"
                },
                {
                    id: "q3",
                    text: "Apa yang membedakan pembelajaran sinkronus dengan e-learning mandiri?",
                    options: [
                        { id: "q3a", text: "Tidak ada perbedaan" },
                        { id: "q3b", text: "Adanya jadwal tetap dan interaksi real-time" },
                        { id: "q3c", text: "Hanya berbeda dalam format video" },
                        { id: "q3d", text: "Sinkronus tidak memerlukan sertifikat" }
                    ],
                    correctOptionId: "q3b"
                }
            ]
        }
    }

    // Get progress
    const progress = await getSyncCourseProgress(course.id)

    if ("error" in progress) {
        redirect(`/courses/${slug}/sync/pre-learning`)
    }

    const preLearnCompleted = !!progress.preLearnAccessedAt
    const liveCompleted = !!progress.liveAccessedAt
    const alreadySubmitted = !!progress.postLearnSubmittedAt
    const existingScore = progress.assessmentScore

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
                <ConceptValidationView
                    courseId={course.id}
                    courseSlug={slug}
                    courseTitle={course.title}
                    config={effectiveConfig}
                    preLearnCompleted={preLearnCompleted}
                    liveCompleted={liveCompleted}
                    alreadySubmitted={alreadySubmitted}
                    existingScore={existingScore}
                />
            </main>
        </div>
    )
}
