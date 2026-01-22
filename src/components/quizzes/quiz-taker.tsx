"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
    Timer,
    ChevronRight,
    ChevronLeft,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Flag
} from "lucide-react"
import { toast } from "sonner"
import { submitQuizAttempt } from "@/lib/actions/quizzes"
import { useRouter } from "next/navigation"

interface QuizTakerProps {
    quiz: any
    courseSlug: string
}

export function QuizTaker({ quiz, courseSlug }: QuizTakerProps) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, any>>({})
    const [timeLeft, setTimeLeft] = useState<number | null>(
        quiz.timeLimit ? quiz.timeLimit * 60 : null
    )
    const [isSubmitting, setIsSubmitting] = useState(false)
    const router = useRouter()

    const questions = quiz.Question || []
    const currentQuestion = questions[currentQuestionIndex]

    // Timer logic
    useEffect(() => {
        if (timeLeft === null) return

        if (timeLeft <= 0) {
            handleSubmit()
            return
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev !== null ? prev - 1 : null))
        }, 1000)

        return () => clearInterval(timer)
    }, [timeLeft])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    const handleAnswerChange = (questionId: string, value: any) => {
        setAnswers((prev) => ({ ...prev, [questionId]: value }))
    }

    const handleSubmit = useCallback(async () => {
        if (isSubmitting) return
        setIsSubmitting(true)

        const submissionData = {
            quizId: quiz.id,
            answers: Object.entries(answers).map(([questionId, value]) => ({
                questionId,
                selectedOptions: typeof value === "number" ? value : undefined,
                answerText: typeof value === "string" ? value : undefined,
            })),
        }

        const result = await submitQuizAttempt(submissionData)

        if (result.error) {
            toast.error(result.error)
            setIsSubmitting(false)
        } else {
            toast.success("Kuis berhasil dikirim!")
            router.push(`/courses/${courseSlug}/learn?quiz=${quiz.id}&attempt=${result.attemptId}`)
        }
    }, [quiz.id, answers, courseSlug, isSubmitting, router])

    if (!currentQuestion) {
        return (
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <CardContent className="py-20 text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-purple-500 mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-400">Menyiapkan kuis...</p>
                </CardContent>
            </Card>
        )
    }

    const progress = ((currentQuestionIndex + 1) / questions.length) * 100

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-20">
            {/* Header Info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-16 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md z-10 py-4 border-b border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white truncate max-w-md">
                        {quiz.title}
                    </h2>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 dark:text-slate-500 font-medium">
                            PERTANYAAN {currentQuestionIndex + 1} DARI {questions.length}
                        </span>
                        <Badge variant="outline" className="text-[10px] border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                            {currentQuestion.points} POIN
                        </Badge>
                    </div>
                </div>

                {timeLeft !== null && (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${timeLeft < 60 ? "bg-red-50 dark:bg-red-500/10 border-red-500 text-red-600 dark:text-red-500 animate-pulse" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                        }`}>
                        <Timer className="w-4 h-4" />
                        <span className="font-mono font-bold text-lg">{formatTime(timeLeft)}</span>
                    </div>
                )}
            </div>

            <Progress value={progress} className="h-2 bg-slate-200 dark:bg-slate-900" />

            {/* Question Card */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                <CardContent className="p-8">
                    <div className="space-y-8">
                        <h3 className="text-xl text-slate-900 dark:text-white font-medium leading-relaxed">
                            {currentQuestion.text}
                        </h3>

                        {/* Multiple Choice / True False */}
                        {(currentQuestion.type === "MULTIPLE_CHOICE" || currentQuestion.type === "TRUE_FALSE") && (
                            <div className="space-y-3">
                                {currentQuestion.options?.map((choice: string, idx: number) => {
                                    const isSelected = answers[currentQuestion.id] === idx
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleAnswerChange(currentQuestion.id, idx)}
                                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group ${isSelected
                                                ? "bg-purple-50 dark:bg-purple-600/10 border-purple-500 text-slate-900 dark:text-white"
                                                : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${isSelected ? "bg-purple-600 text-white" : "bg-slate-200 dark:bg-slate-900 text-slate-600 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300"
                                                }`}>
                                                {String.fromCharCode(65 + idx)}
                                            </div>
                                            <span className="flex-1 font-medium">{choice}</span>
                                            {isSelected && <CheckCircle2 className="w-5 h-5 text-purple-500" />}
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        {/* Essay */}
                        {currentQuestion.type === "ESSAY" && (
                            <div className="space-y-2">
                                <textarea
                                    className="w-full h-64 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none"
                                    placeholder="Tuliskan jawaban Anda di sini..."
                                    value={answers[currentQuestion.id] || ""}
                                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                                />
                                <p className="text-xs text-slate-500 dark:text-slate-500">Jawaban Anda akan disimpan otomatis saat berpindah soal.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between">
                <Button
                    variant="outline"
                    onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                    disabled={currentQuestionIndex === 0}
                    className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Sebelumnya
                </Button>

                <div className="flex gap-2">
                    {currentQuestionIndex === questions.length - 1 ? (
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="bg-green-600 hover:bg-green-700 text-white px-8"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Flag className="w-4 h-4 mr-2" />}
                            Selesai & Kirim
                        </Button>
                    ) : (
                        <Button
                            onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Selanjutnya
                            <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Summary Status */}
            <div className="pt-8 border-t border-slate-200 dark:border-slate-900 grid grid-cols-5 sm:grid-cols-10 gap-2">
                {questions.map((_: any, idx: number) => {
                    const isAnswered = answers[questions[idx].id] !== undefined && answers[questions[idx].id] !== ""
                    const isCurrent = idx === currentQuestionIndex
                    return (
                        <button
                            key={idx}
                            onClick={() => setCurrentQuestionIndex(idx)}
                            className={`h-10 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${isCurrent
                                ? "bg-purple-600 text-white ring-2 ring-purple-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 scale-110"
                                : isAnswered
                                    ? "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                                    : "bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-800"
                                }`}
                        >
                            {idx + 1}
                        </button>
                    )
                })}</div>
        </div>
    )
}
