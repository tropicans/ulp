"use client"

import { useState } from "react"
import { Target, RotateCcw, Pencil, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateQuiz } from "@/lib/actions/quizzes"
import { toast } from "sonner"

interface EditableStatsCardsProps {
    quiz: {
        id: string
        passingScore: number
        maxAttempts: number
    }
}

export function EditableStatsCards({ quiz }: EditableStatsCardsProps) {
    const [passingScore, setPassingScore] = useState(quiz.passingScore)
    const [maxAttempts, setMaxAttempts] = useState(quiz.maxAttempts)
    const [editingField, setEditingField] = useState<string | null>(null)
    const [tempValue, setTempValue] = useState("")

    const handleEdit = (field: string, currentValue: number) => {
        setEditingField(field)
        setTempValue(currentValue.toString())
    }

    const handleCancel = () => {
        setEditingField(null)
        setTempValue("")
    }

    const handleSave = async (field: string) => {
        const value = parseFloat(tempValue)

        if (field === 'passingScore' && (value < 0 || value > 100)) {
            toast.error("Passing score harus antara 0-100%")
            return
        }

        if (field === 'maxAttempts' && (value < 1 || value > 99)) {
            toast.error("Max percobaan harus antara 1-99")
            return
        }

        try {
            const result = await updateQuiz(quiz.id, { [field]: value })
            if (result.error) {
                toast.error(result.error)
            } else {
                if (field === 'passingScore') setPassingScore(value)
                if (field === 'maxAttempts') setMaxAttempts(value)
                toast.success("Berhasil diperbarui")
            }
        } catch (err) {
            toast.error("Gagal memperbarui")
        }

        setEditingField(null)
        setTempValue("")
    }

    return (
        <>
            {/* Passing Score Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 shadow-sm group relative">
                {editingField === 'passingScore' ? (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-green-500/10 text-green-500">
                                <Target className="w-5 h-5" />
                            </div>
                            <Input
                                type="number"
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                className="w-20 h-9 text-xl font-bold"
                                min={0}
                                max={100}
                                autoFocus
                            />
                            <span className="text-xl font-bold text-slate-900 dark:text-white">%</span>
                        </div>
                        <div className="flex gap-1">
                            <Button size="sm" onClick={() => handleSave('passingScore')} className="h-7 px-2 bg-green-600 hover:bg-green-700">
                                <Check className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancel} className="h-7 px-2">
                                <X className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-green-500/10 text-green-500">
                                    <Target className="w-5 h-5" />
                                </div>
                                <span className="text-2xl font-black text-slate-900 dark:text-white">{passingScore}%</span>
                            </div>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-slate-400 hover:text-blue-500"
                                onClick={() => handleEdit('passingScore', passingScore)}
                            >
                                <Pencil className="w-4 h-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Passing Score</p>
                    </>
                )}
            </div>

            {/* Max Attempts Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 shadow-sm group relative">
                {editingField === 'maxAttempts' ? (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                                <RotateCcw className="w-5 h-5" />
                            </div>
                            <Input
                                type="number"
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                className="w-16 h-9 text-xl font-bold"
                                min={1}
                                max={99}
                                autoFocus
                            />
                            <span className="text-xl font-bold text-slate-900 dark:text-white">x</span>
                        </div>
                        <div className="flex gap-1">
                            <Button size="sm" onClick={() => handleSave('maxAttempts')} className="h-7 px-2 bg-green-600 hover:bg-green-700">
                                <Check className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancel} className="h-7 px-2">
                                <X className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                                    <RotateCcw className="w-5 h-5" />
                                </div>
                                <span className="text-2xl font-black text-slate-900 dark:text-white">{maxAttempts}x</span>
                            </div>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-slate-400 hover:text-blue-500"
                                onClick={() => handleEdit('maxAttempts', maxAttempts)}
                            >
                                <Pencil className="w-4 h-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Max Percobaan</p>
                    </>
                )}
            </div>
        </>
    )
}
