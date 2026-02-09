import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { QuizTaker } from "@/components/quizzes/quiz-taker"

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

    // Check if verification is required
    const verificationSetting = await prisma.systemSetting.findUnique({
        where: { key: "require_email_verification" }
    })

    if (verificationSetting?.value === "true") {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { emailVerified: true, phoneVerified: true }
        })

        // Redirect to verify page if not verified
        if (!user?.emailVerified && !user?.phoneVerified) {
            redirect("/verify")
        }
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
    const enrollment = await prisma.enrollment.findUnique({
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
            {/* Quiz Info Bar - simplified without logo */}
            <div className="h-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 fixed top-[80px] left-0 right-0 z-20 px-4 md:px-6 flex items-center gap-4">
                <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                    Mengerjakan: <span className="text-slate-900 dark:text-white font-semibold">{quiz.type === 'PRETEST' ? 'Pretest' : quiz.type === 'POSTTEST' ? 'Posttest' : 'Quiz'}</span>
                </span>
            </div>

            <main className="flex-1 overflow-y-auto px-4 pt-[100px] pb-4">
                <QuizTaker quiz={quiz} courseSlug={slug} />
            </main>
        </div>
    )
}
