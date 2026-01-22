"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, ArrowRight, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface KnowledgeCheckQuestion {
    question: string
    options: string[]
    correct: number // 0-indexed
}

interface KnowledgeCheckModalProps {
    isOpen: boolean
    question: KnowledgeCheckQuestion | null
    onComplete: () => void
    onClose: () => void
}

export function KnowledgeCheckModal({
    isOpen,
    question,
    onComplete,
    onClose
}: KnowledgeCheckModalProps) {
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
    const [hasSubmitted, setHasSubmitted] = useState(false)
    const [autoNavigateCountdown, setAutoNavigateCountdown] = useState<number | null>(null)

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedAnswer(null)
            setHasSubmitted(false)
            setAutoNavigateCountdown(null)
        }
    }, [isOpen])

    // Auto-navigate countdown after answering
    useEffect(() => {
        if (autoNavigateCountdown !== null && autoNavigateCountdown > 0) {
            const timer = setTimeout(() => {
                setAutoNavigateCountdown(autoNavigateCountdown - 1)
            }, 1000)
            return () => clearTimeout(timer)
        } else if (autoNavigateCountdown === 0) {
            onComplete()
        }
    }, [autoNavigateCountdown, onComplete])

    if (!question) return null

    const isCorrect = selectedAnswer === question.correct

    function handleSubmit() {
        if (selectedAnswer === null) return
        setHasSubmitted(true)
        setAutoNavigateCountdown(3) // 3 second countdown
    }

    function handleSkip() {
        onComplete()
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-600/20">
                            <HelpCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        Knowledge Check
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Question */}
                    <p className="text-lg font-medium text-slate-900 dark:text-white leading-relaxed">
                        {question.question}
                    </p>

                    {/* Options */}
                    <div className="space-y-3">
                        {question.options.map((option, idx) => {
                            const isThisCorrect = idx === question.correct
                            const isSelected = selectedAnswer === idx

                            let buttonClass = "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"

                            if (hasSubmitted) {
                                if (isThisCorrect) {
                                    buttonClass = "bg-green-50 dark:bg-green-600/10 border-green-500 text-green-700 dark:text-green-400"
                                } else if (isSelected && !isThisCorrect) {
                                    buttonClass = "bg-red-50 dark:bg-red-600/10 border-red-500 text-red-700 dark:text-red-400"
                                }
                            } else if (isSelected) {
                                buttonClass = "bg-purple-50 dark:bg-purple-600/10 border-purple-500"
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => !hasSubmitted && setSelectedAnswer(idx)}
                                    disabled={hasSubmitted}
                                    className={cn(
                                        "w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left",
                                        buttonClass,
                                        !hasSubmitted && "hover:border-slate-300 dark:hover:border-slate-600"
                                    )}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                                        hasSubmitted && isThisCorrect
                                            ? "bg-green-500 text-white"
                                            : hasSubmitted && isSelected && !isThisCorrect
                                                ? "bg-red-500 text-white"
                                                : isSelected
                                                    ? "bg-purple-600 text-white"
                                                    : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                                    )}>
                                        {hasSubmitted && isThisCorrect ? (
                                            <CheckCircle2 className="w-5 h-5" />
                                        ) : hasSubmitted && isSelected && !isThisCorrect ? (
                                            <XCircle className="w-5 h-5" />
                                        ) : (
                                            String.fromCharCode(65 + idx)
                                        )}
                                    </div>
                                    <span className={cn(
                                        "flex-1 font-medium",
                                        hasSubmitted && isThisCorrect
                                            ? "text-green-700 dark:text-green-400"
                                            : "text-slate-700 dark:text-slate-300"
                                    )}>
                                        {option}
                                    </span>
                                </button>
                            )
                        })}
                    </div>

                    {/* Feedback */}
                    {hasSubmitted && (
                        <div className={cn(
                            "p-4 rounded-xl",
                            isCorrect
                                ? "bg-green-50 dark:bg-green-600/10 border border-green-200 dark:border-green-500/30"
                                : "bg-amber-50 dark:bg-amber-600/10 border border-amber-200 dark:border-amber-500/30"
                        )}>
                            <p className={cn(
                                "font-semibold",
                                isCorrect ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"
                            )}>
                                {isCorrect ? "🎉 Jawaban Benar!" : "Jawaban kurang tepat"}
                            </p>
                            {!isCorrect && (
                                <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                                    Jawaban yang benar adalah: <strong>{question.options[question.correct]}</strong>
                                </p>
                            )}
                            <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                                Melanjutkan ke lesson berikutnya dalam {autoNavigateCountdown} detik...
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-between">
                        <Button
                            variant="ghost"
                            onClick={handleSkip}
                            className="text-slate-500"
                        >
                            Lewati
                        </Button>

                        {!hasSubmitted ? (
                            <Button
                                onClick={handleSubmit}
                                disabled={selectedAnswer === null}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                Kirim Jawaban
                            </Button>
                        ) : (
                            <Button
                                onClick={onComplete}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <ArrowRight className="w-4 h-4 mr-2" />
                                Lanjutkan Sekarang
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
