import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { getQuizById } from "@/lib/actions/quizzes"
import { QuizBuilder } from "@/components/quizzes/quiz-builder"
import { ArrowLeft, Settings, Info } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface QuizEditPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function QuizEditPage({ params }: QuizEditPageProps) {
    const { id: quizId } = await params
    const session = await auth()
    if (!session?.user) redirect("/login")

    const quiz = await getQuizById(quizId)
    if (!quiz) notFound()

    // Verify ownership
    if (
        quiz.Module.Course.instructorId !== session.user.id &&
        !["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)
    ) {
        redirect("/dashboard/courses")
    }

    return (
        <div className="min-h-screen bg-white dark:bg-slate-900 pt-24 pb-20">
            <div className="container max-w-5xl mx-auto px-4">
                <Link
                    href={`/dashboard/courses/${quiz.Module.courseId}/edit`}
                    className="flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm mb-6 w-fit group"
                >
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Kembali ke Edit Kursus
                </Link>

                <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{quiz.title}</h1>
                            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-500 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
                                {quiz.type}
                            </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400">Kelola pertanyaan dan pengaturan kuis kuis</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                            <Settings className="w-4 h-4 mr-2" />
                            Pengaturan Kuis
                        </Button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <QuizBuilder quiz={quiz} />
                    </div>

                    <div className="space-y-6">
                        <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                            <CardHeader>
                                <CardTitle className="text-slate-900 dark:text-white text-lg flex items-center gap-2">
                                    <Info className="w-5 h-5 text-blue-400" />
                                    Ringkasan Pengaturan
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500 dark:text-slate-400">Passing Score</span>
                                    <span className="text-slate-900 dark:text-white font-semibold">{quiz.passingScore}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 dark:text-slate-400">Time Limit</span>
                                    <span className="text-slate-900 dark:text-white font-semibold">{quiz.timeLimit ? `${quiz.timeLimit} Menit` : 'Tanpa Batas'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 dark:text-slate-400">Max Attempts</span>
                                    <span className="text-slate-900 dark:text-white font-semibold">{quiz.maxAttempts}x Percobaan</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 dark:text-slate-400">Acak Soal</span>
                                    <span className="text-slate-900 dark:text-white font-semibold">{quiz.shuffleQuestions ? 'Ya' : 'Tidak'}</span>
                                </div>
                                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-slate-500 dark:text-slate-400">Total Pertanyaan</span>
                                        <span className="text-slate-900 dark:text-white">{quiz.Question.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">Total Poin</span>
                                        <span className="text-slate-900 dark:text-white">
                                            {quiz.Question.reduce((acc: number, q: any) => acc + q.points, 0)}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
