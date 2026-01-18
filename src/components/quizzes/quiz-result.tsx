"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    CheckCircle2,
    XCircle,
    RotateCcw,
    ChevronRight,
    Trophy,
    AlertCircle,
    Clock,
    LayoutDashboard
} from "lucide-react"
import Link from "next/link"

interface QuizResultProps {
    attempt: any
    quiz: any
    courseSlug: string
}

export function QuizResult({ attempt, quiz, courseSlug }: QuizResultProps) {
    const isPassed = attempt.score >= quiz.passingScore

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Result Hero */}
            <Card className={`border-none shadow-2xl overflow-hidden ${isPassed
                    ? "bg-gradient-to-br from-green-600/20 to-emerald-600/10"
                    : "bg-gradient-to-br from-red-600/20 to-orange-600/10"
                }`}>
                <CardContent className="p-10 text-center">
                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg ${isPassed ? "bg-green-600 shadow-green-900/20" : "bg-red-600 shadow-red-900/20"
                        }`}>
                        {isPassed ? <Trophy className="w-10 h-10 text-white" /> : <AlertCircle className="w-10 h-10 text-white" />}
                    </div>

                    <h2 className="text-3xl font-black text-white mb-2">
                        {isPassed ? "Selamat! Anda Lulus" : "Maaf, Anda Belum Lulus"}
                    </h2>
                    <p className="text-slate-400 mb-8 max-w-sm mx-auto">
                        {isPassed
                            ? "Anda telah berhasil melewati ambang batas nilai minimum untuk kuis ini."
                            : "Jangan menyerah! Anda dapat mempelajari kembali materi dan mencoba lagi."}
                    </p>

                    <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-10">
                        <div className="text-center">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Skor Anda</p>
                            <p className={`text-5xl font-black ${isPassed ? "text-green-500" : "text-red-500"}`}>
                                {attempt.score}%
                            </p>
                        </div>
                        <div className="w-px h-12 bg-slate-700 hidden md:block" />
                        <div className="text-center">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Target</p>
                            <p className="text-3xl font-black text-white">{quiz.passingScore}%</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-200 font-bold px-8 rounded-2xl" asChild>
                            <Link href={`/courses/${courseSlug}/learn`}>
                                <LayoutDashboard className="w-4 h-4 mr-2" />
                                Kembali Belajar
                            </Link>
                        </Button>
                        {!isPassed && (
                            <Button size="lg" variant="outline" className="border-slate-700 text-white hover:bg-slate-800 font-bold px-8 rounded-2xl" asChild>
                                <Link href={`/courses/${courseSlug}/quizzes/${quiz.id}/take`}>
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Coba Lagi
                                </Link>
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Stats Table */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Waktu Selesai</p>
                            <p className="text-sm font-bold text-white">
                                {new Date(attempt.finishedAt).toLocaleTimeString()}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Status Penilaian</p>
                            <p className="text-sm font-bold text-white">
                                {attempt.gradingStatus === "GRADED" ? "Sudah Dinilai" : "Menunggu Penilaian"}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                            <RotateCcw className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Percobaan Ke</p>
                            <p className="text-sm font-bold text-white">1 (placeholder)</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Question Review */}
            {quiz.showCorrectAnswers && (
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <ChevronRight className="w-5 h-5 text-purple-500" />
                        Tinjauan Pertanyaan
                    </h3>

                    <div className="space-y-4">
                        {quiz.Question.map((q: any, idx: number) => {
                            const studentAnswer = attempt.QuizAnswer.find((a: any) => a.questionId === q.id)
                            const isCorrect = studentAnswer?.isCorrect

                            return (
                                <Card key={q.id} className="bg-slate-900 border-slate-800 overflow-hidden">
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start gap-4 mb-4">
                                            <div className="flex gap-3">
                                                <span className="text-sm font-black text-slate-700">#{idx + 1}</span>
                                                <p className="text-white font-medium">{q.text}</p>
                                            </div>
                                            <Badge variant={isCorrect ? "default" : "destructive"} className={isCorrect ? "bg-green-600" : "bg-red-600"}>
                                                {isCorrect ? "Benar" : "Salah"}
                                            </Badge>
                                        </div>

                                        {q.type === "MULTIPLE_CHOICE" && (
                                            <div className="grid gap-2 ml-7">
                                                {q.options.choices.map((choice: string, cIdx: number) => {
                                                    const isStudentChoice = studentAnswer?.selectedOptions === cIdx
                                                    const isCorrectPath = q.options.correctIndex === cIdx

                                                    let bgColor = "bg-slate-800/30"
                                                    let borderColor = "border-slate-800"

                                                    if (isCorrectPath) {
                                                        bgColor = "bg-green-500/10"
                                                        borderColor = "border-green-500/30"
                                                    } else if (isStudentChoice && !isCorrect) {
                                                        bgColor = "bg-red-500/10"
                                                        borderColor = "border-red-500/30"
                                                    }

                                                    return (
                                                        <div
                                                            key={cIdx}
                                                            className={`p-3 rounded-xl border text-sm flex items-center justify-between ${bgColor} ${borderColor}`}
                                                        >
                                                            <span className={isCorrectPath ? "text-green-400 font-medium" : isStudentChoice ? "text-red-400" : "text-slate-500"}>
                                                                {choice}
                                                            </span>
                                                            {isCorrectPath && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                                            {isStudentChoice && !isCorrect && <XCircle className="w-4 h-4 text-red-500" />}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}

                                        {q.type === "ESSAY" && (
                                            <div className="ml-7 space-y-4">
                                                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Jawaban Anda</p>
                                                    <p className="text-sm text-slate-300 italic">
                                                        {studentAnswer?.answerText || "Tidak ada jawaban."}
                                                    </p>
                                                </div>
                                                {q.modelAnswer && (
                                                    <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                                                        <p className="text-[10px] text-blue-500 uppercase tracking-widest font-bold mb-2">Kunci / Referensi</p>
                                                        <p className="text-sm text-slate-400">
                                                            {q.modelAnswer}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {q.explanation && (
                                            <div className="mt-4 ml-7 flex gap-3 text-xs text-slate-500 p-3 rounded-lg bg-slate-950 border border-slate-900">
                                                <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                                <p><span className="font-bold text-slate-400">Penjelasan:</span> {q.explanation}</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
