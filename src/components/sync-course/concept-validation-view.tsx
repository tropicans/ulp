"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import {
    FileQuestion,
    CheckCircle2,
    Award,
    Loader2,
    AlertCircle,
    Clock
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
    submitConceptValidation
} from "@/lib/actions/sync-course"
import { SyncCourseConfig, ValidationResponse } from "@/lib/types/sync-course"
import { useRouter } from "next/navigation"

interface ConceptValidationViewProps {
    courseId: string
    courseSlug: string
    courseTitle: string
    config: SyncCourseConfig
    preLearnCompleted: boolean
    liveCompleted: boolean
    alreadySubmitted: boolean
    existingScore?: number | null
}

export function ConceptValidationView({
    courseId,
    courseSlug,
    courseTitle,
    config,
    preLearnCompleted,
    liveCompleted,
    alreadySubmitted,
    existingScore
}: ConceptValidationViewProps) {
    const router = useRouter()
    const [responses, setResponses] = useState<Record<string, string>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isCompleted, setIsCompleted] = useState(alreadySubmitted)
    const [finalScore, setFinalScore] = useState<number | null>(existingScore ?? null)
    const [showResult, setShowResult] = useState(alreadySubmitted)

    const questions = config.conceptValidation?.questions || []

    // Guard: Must complete pre-learning and live session first
    if (!preLearnCompleted || !liveCompleted) {
        return (
            <div className="max-w-2xl mx-auto text-center py-20">
                <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Clock className="w-10 h-10 text-yellow-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                    Langkah Sebelumnya Belum Selesai
                </h2>
                <p className="text-slate-500 mb-8">
                    Anda perlu menyelesaikan Pre-Learning dan Live Session terlebih dahulu.
                </p>
                <div className="flex gap-4 justify-center">
                    {!preLearnCompleted && (
                        <Button asChild className="bg-blue-600 hover:bg-blue-700">
                            <Link href={`/courses/${courseSlug}/sync/pre-learning`}>
                                Ke Pre-Learning
                            </Link>
                        </Button>
                    )}
                    {preLearnCompleted && !liveCompleted && (
                        <Button asChild className="bg-red-600 hover:bg-red-700">
                            <Link href={`/courses/${courseSlug}/sync/live`}>
                                Ke Live Session
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
        )
    }

    const handleResponseChange = (questionId: string, optionId: string) => {
        setResponses(prev => ({
            ...prev,
            [questionId]: optionId
        }))
    }

    const handleSubmit = async () => {
        // Validate all questions answered
        const unanswered = questions.filter(q => !responses[q.id])
        if (unanswered.length > 0) {
            alert(`Silakan jawab semua ${unanswered.length} pertanyaan yang belum dijawab.`)
            return
        }

        setIsSubmitting(true)

        const formattedResponses: ValidationResponse[] = Object.entries(responses).map(
            ([questionId, selectedOptionId]) => ({
                questionId,
                selectedOptionId
            })
        )

        const result = await submitConceptValidation(courseId, formattedResponses, config)

        if (result.success) {
            setFinalScore(result.score ?? 0)
            setIsCompleted(true)
            setShowResult(true)
        } else {
            alert(result.error || "Terjadi kesalahan saat menyimpan jawaban")
        }

        setIsSubmitting(false)
    }

    const allAnswered = questions.length > 0 && questions.every(q => responses[q.id])

    // Show completion result
    if (showResult) {
        return (
            <div className="max-w-2xl mx-auto text-center py-12">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="space-y-8"
                >
                    <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-green-500/20">
                        <Award className="w-12 h-12 text-white" />
                    </div>

                    <div>
                        <Badge className="mb-4 bg-green-600 text-white text-xs font-bold uppercase tracking-widest">
                            Completed
                        </Badge>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
                            Selamat! 🎉
                        </h2>
                        <p className="text-slate-500 max-w-md mx-auto">
                            Anda telah menyelesaikan seluruh rangkaian pembelajaran sinkronus berbasis pengetahuan pada course ini.
                        </p>
                    </div>

                    <Card className="border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                        <CardContent className="p-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">
                                        Skor Assessment
                                    </p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white">
                                        {finalScore}%
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">
                                        Status
                                    </p>
                                    <p className="text-3xl font-black text-green-600">
                                        LULUS
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                            <strong>Catatan:</strong> Sertifikat Anda akan segera tersedia di halaman "My Certificates".
                            Assessment ini bersifat non-selektif - skor dicatat untuk evaluasi, namun tidak memengaruhi kelulusan.
                        </p>
                    </div>

                    <div className="flex gap-4 justify-center">
                        <Button asChild variant="outline" className="rounded-xl">
                            <Link href={`/courses/${courseSlug}`}>
                                Kembali ke Course
                            </Link>
                        </Button>
                        <Button asChild className="bg-green-600 hover:bg-green-700 rounded-xl">
                            <Link href="/dashboard/learner">
                                Dashboard
                            </Link>
                        </Button>
                    </div>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center">
                <Badge
                    variant="outline"
                    className="mb-4 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 text-[10px] font-black uppercase tracking-widest"
                >
                    Post-Learning: Concept Validation
                </Badge>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
                    Validasi Pemahaman Konsep
                </h1>
                <p className="text-slate-500">
                    Jawab pertanyaan berikut untuk memvalidasi pemahaman Anda.
                    <span className="text-purple-600 font-medium"> Assessment ini bersifat auto-pass.</span>
                </p>
            </div>

            {/* Info Card */}
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10">
                <CardContent className="p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div className="text-sm text-blue-700 dark:text-blue-400">
                        <strong>Catatan Penting:</strong> Skor assessment akan dicatat untuk evaluasi program,
                        namun tidak memengaruhi status kelulusan Anda. Semua peserta yang menyelesaikan
                        assessment akan mendapat status COMPLETED.
                    </div>
                </CardContent>
            </Card>

            {/* Questions */}
            <div className="space-y-6">
                {questions.map((question, qIndex) => (
                    <motion.div
                        key={question.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: qIndex * 0.1 }}
                    >
                        <Card className={cn(
                            "border-slate-200 dark:border-slate-800 transition-all",
                            responses[question.id] && "border-green-300 dark:border-green-800"
                        )}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-start gap-3">
                                    <span className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center text-sm font-black flex-shrink-0">
                                        {qIndex + 1}
                                    </span>
                                    <span>{question.text}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <RadioGroup
                                    value={responses[question.id] || ""}
                                    onValueChange={(value) => handleResponseChange(question.id, value)}
                                    className="space-y-3"
                                >
                                    {question.options.map((option) => (
                                        <div
                                            key={option.id}
                                            className={cn(
                                                "flex items-center space-x-3 p-4 rounded-xl border transition-all cursor-pointer",
                                                responses[question.id] === option.id
                                                    ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                                                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                                            )}
                                            onClick={() => handleResponseChange(question.id, option.id)}
                                        >
                                            <RadioGroupItem value={option.id} id={option.id} />
                                            <Label
                                                htmlFor={option.id}
                                                className="flex-1 cursor-pointer text-slate-700 dark:text-slate-300"
                                            >
                                                {option.text}
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Submit Button */}
            <div className="pt-4">
                <Button
                    onClick={handleSubmit}
                    disabled={!allAnswered || isSubmitting}
                    size="lg"
                    className={cn(
                        "w-full h-14 font-bold rounded-2xl shadow-xl transition-all",
                        allAnswered
                            ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-500/20"
                            : "bg-slate-300 dark:bg-slate-800 cursor-not-allowed"
                    )}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Menyimpan...
                        </>
                    ) : allAnswered ? (
                        <>
                            <CheckCircle2 className="w-5 h-5 mr-2" />
                            Submit & Selesaikan Course
                        </>
                    ) : (
                        <>
                            Jawab Semua Pertanyaan ({Object.keys(responses).length}/{questions.length})
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}
