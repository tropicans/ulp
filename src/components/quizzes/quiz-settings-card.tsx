"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Clock, Shuffle, Info, ListOrdered, Settings } from "lucide-react"
import { updateQuiz } from "@/lib/actions/quizzes"
import { toast } from "sonner"

interface QuizSettingsCardProps {
    quiz: {
        id: string
        timeLimit: number | null
        shuffleQuestions: boolean
        shuffleOptions?: boolean
        showCorrectAnswers: boolean
    }
}

export function QuizSettingsCard({ quiz }: QuizSettingsCardProps) {
    const [shuffleQuestions, setShuffleQuestions] = useState(quiz.shuffleQuestions)
    const [shuffleOptions, setShuffleOptions] = useState(quiz.shuffleOptions ?? false)
    const [showCorrectAnswers, setShowCorrectAnswers] = useState(quiz.showCorrectAnswers)
    const [updating, setUpdating] = useState<string | null>(null)

    const handleToggle = async (field: string, value: boolean) => {
        setUpdating(field)

        // Optimistic update
        if (field === 'shuffleQuestions') setShuffleQuestions(value)
        if (field === 'shuffleOptions') setShuffleOptions(value)
        if (field === 'showCorrectAnswers') setShowCorrectAnswers(value)

        try {
            const result = await updateQuiz(quiz.id, { [field]: value })
            if (result.error) {
                // Revert on error
                if (field === 'shuffleQuestions') setShuffleQuestions(!value)
                if (field === 'shuffleOptions') setShuffleOptions(!value)
                if (field === 'showCorrectAnswers') setShowCorrectAnswers(!value)
                toast.error(result.error)
            } else {
                toast.success("Pengaturan diperbarui")
            }
        } catch (err) {
            // Revert on error
            if (field === 'shuffleQuestions') setShuffleQuestions(!value)
            if (field === 'shuffleOptions') setShuffleOptions(!value)
            if (field === 'showCorrectAnswers') setShowCorrectAnswers(!value)
            toast.error("Gagal memperbarui pengaturan")
        } finally {
            setUpdating(null)
        }
    }

    return (
        <Card className="border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/30 rounded-2xl shadow-sm overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50">
                <CardTitle className="text-slate-900 dark:text-white text-sm font-bold flex items-center gap-2">
                    <Settings className="w-4 h-4 text-slate-400" />
                    Pengaturan
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-sm">
                {/* Time Limit - Display only */}
                <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600 dark:text-slate-400">Time Limit</span>
                    </div>
                    <span className="text-slate-900 dark:text-white font-semibold">
                        {quiz.timeLimit ? `${quiz.timeLimit} Menit` : 'Tanpa Batas'}
                    </span>
                </div>

                {/* Shuffle Questions */}
                <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center gap-2">
                        <Shuffle className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600 dark:text-slate-400">Acak Soal</span>
                    </div>
                    <Switch
                        checked={shuffleQuestions}
                        onCheckedChange={(checked) => handleToggle('shuffleQuestions', checked)}
                        disabled={updating === 'shuffleQuestions'}
                    />
                </div>

                {/* Shuffle Options */}
                <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center gap-2">
                        <ListOrdered className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600 dark:text-slate-400">Acak Pilihan Jawaban</span>
                    </div>
                    <Switch
                        checked={shuffleOptions}
                        onCheckedChange={(checked) => handleToggle('shuffleOptions', checked)}
                        disabled={updating === 'shuffleOptions'}
                    />
                </div>

                {/* Show Correct Answers */}
                <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600 dark:text-slate-400">Tampil Jawaban</span>
                    </div>
                    <Switch
                        checked={showCorrectAnswers}
                        onCheckedChange={(checked) => handleToggle('showCorrectAnswers', checked)}
                        disabled={updating === 'showCorrectAnswers'}
                    />
                </div>
            </CardContent>
        </Card>
    )
}
