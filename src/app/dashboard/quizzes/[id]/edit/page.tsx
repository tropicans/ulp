import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { getQuizById } from "@/lib/actions/quizzes"
import { QuizBuilder } from "@/components/quizzes/quiz-builder"
import { QuizSettingsCard } from "@/components/quizzes/quiz-settings-card"
import { EditableStatsCards } from "@/components/quizzes/editable-stats-cards"
import { ArrowLeft, FileQuestion, Award } from "lucide-react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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

    const totalPoints = quiz.Question.reduce((acc: number, q: any) => acc + q.points, 0)
    const quizTypeLabels: Record<string, string> = {
        'PRETEST': 'Pretest',
        'POSTTEST': 'Posttest',
        'QUIZ': 'Quiz'
    }
    const quizTypeColors: Record<string, string> = {
        'PRETEST': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        'POSTTEST': 'bg-green-500/20 text-green-400 border-green-500/30',
        'QUIZ': 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 pt-4 pb-20">
            <div className="container max-w-6xl mx-auto px-4">
                {/* Header Section */}
                <div className="mb-8">
                    <Link
                        href={`/dashboard/courses/${quiz.Module.courseId}/edit`}
                        className="inline-flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm mb-6 group"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Kembali ke Edit Kursus
                    </Link>

                    <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 flex-wrap">
                                <Badge className={`${quizTypeColors[quiz.type] || quizTypeColors['QUIZ']} border px-3 py-1 text-xs font-bold uppercase tracking-wider`}>
                                    {quizTypeLabels[quiz.type] || quiz.type}
                                </Badge>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    Modul: {quiz.Module.title}
                                </span>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                {quizTypeLabels[quiz.type] || quiz.type}: {quiz.Module.Course.title}
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400">
                                Kelola pertanyaan dan pengaturan {quizTypeLabels[quiz.type]?.toLowerCase() || 'kuis'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                                <FileQuestion className="w-5 h-5" />
                            </div>
                            <span className="text-2xl font-black text-slate-900 dark:text-white">{quiz.Question.length}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Pertanyaan</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                                <Award className="w-5 h-5" />
                            </div>
                            <span className="text-2xl font-black text-slate-900 dark:text-white">{totalPoints}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Poin</p>
                    </div>
                    <EditableStatsCards quiz={quiz} />
                </div>

                {/* Main Content */}
                <div className="grid lg:grid-cols-4 gap-8">
                    {/* Questions Section - Main Area */}
                    <div className="lg:col-span-3">
                        <div className="bg-white dark:bg-slate-800/30 rounded-3xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-sm">
                            <QuizBuilder quiz={quiz} />
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Settings Card */}
                        <QuizSettingsCard quiz={quiz} />

                        {/* Course Info */}
                        <Card className="border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/30 rounded-2xl shadow-sm overflow-hidden">
                            <CardContent className="p-4">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Kursus</p>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2">
                                    {quiz.Module.Course.title}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
