import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { QuizTaker } from "@/components/quizzes/quiz-taker"
import { GraduationCap } from "lucide-react"

interface QuizTakePageProps {
    params: Promise<{
        slug: string
        id: string
    }>
}

export default async function QuizTakePage({ params }: QuizTakePageProps) {
    const { slug, id: quizId } = await params
    const session = await auth()
    if (!session?.user) {
        redirect(`/login?callbackUrl=/courses/${slug}/quizzes/${quizId}/take`)
    }

    const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: {
            Question: {
                orderBy: { order: "asc" }
            }
        }
    })

    if (!quiz) notFound()

    // Verify enrollment
    const enrollment = await prisma.courseEnrollment.findUnique({
        where: {
            userId_courseId: {
                userId: session.user.id,
                courseId: (await prisma.module.findUnique({
                    where: { id: quiz.moduleId },
                    select: { courseId: true }
                }))?.courseId || ""
            }
        }
    })

    if (!enrollment && session.user.role === "LEARNER") {
        redirect(`/courses/${slug}`)
    }

    // Check attempts
    const attemptCount = await prisma.quizAttempt.count({
        where: { quizId: quiz.id, userId: session.user.id }
    })

    if (attemptCount >= quiz.maxAttempts) {
        redirect(`/courses/${slug}/learn?quiz=${quiz.id}&error=max_attempts`)
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
            <header className="h-16 bg-slate-900 border-b border-slate-800 sticky top-0 z-20 px-4 md:px-6 flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-white hidden sm:inline-block">LXP ASN</span>
                </div>
                <div className="h-4 w-[1px] bg-slate-800 mx-2 hidden sm:block" />
                <span className="text-sm text-slate-400 font-medium truncate">
                    Mengerjakan: {quiz.title}
                </span>
            </header>

            <main className="flex-1 overflow-y-auto px-4 py-8">
                <QuizTaker quiz={quiz} courseSlug={slug} />
            </main>
        </div>
    )
}
