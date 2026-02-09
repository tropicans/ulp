"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Plus,
    Trash2,
    Edit2,
    GripVertical,
    FileText,
    Sparkles,
    Loader2
} from "lucide-react"
import { QuestionForm } from "./question-form"
import { BulkUploadDialog } from "./bulk-upload-dialog"
import { deleteQuestion, reorderQuestions, normalizeQuizPoints } from "@/lib/actions/questions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

// DnD Kit imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core"
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface QuizBuilderProps {
    quiz: any
}

// Sortable Question Card Component
function SortableQuestionCard({
    question,
    index,
    onEdit,
    onDelete,
    deleting,
}: {
    question: any
    index: number
    onEdit: () => void
    onDelete: () => void
    deleting: boolean
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: question.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 1,
    }

    return (
        <div ref={setNodeRef} style={style}>
            <Card className={`border-slate-700 bg-slate-800/30 ${isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''}`}>
                <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                        <div
                            {...attributes}
                            {...listeners}
                            className="mt-1 text-slate-500 cursor-grab active:cursor-grabbing hover:text-slate-300 transition-colors"
                        >
                            <GripVertical className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-bold text-blue-400">#{index + 1}</span>
                                <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
                                    {question.type.replace('_', ' ')}
                                </Badge>
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                                    {question.points} Poin
                                </span>
                            </div>
                            <p className="text-white font-medium mb-3">{question.text}</p>

                            {question.type === "MULTIPLE_CHOICE" && (() => {
                                // Handle both formats: array directly or { choices: [...], correctIndex: number }
                                const choices = Array.isArray(question.options)
                                    ? question.options
                                    : question.options?.choices || []

                                // Calculate correctIndex - check multiple sources
                                let correctIndex = Array.isArray(question.options)
                                    ? question.correctIndex
                                    : question.options?.correctIndex

                                // If correctIndex is still undefined/null, try to find from isCorrect property
                                if (correctIndex === undefined || correctIndex === null) {
                                    const correctIdx = choices.findIndex((c: any) =>
                                        typeof c === 'object' && c !== null && c.isCorrect === true
                                    )
                                    if (correctIdx >= 0) correctIndex = correctIdx
                                }

                                // Helper to get choice text - handles both string and object formats
                                const getChoiceText = (choice: any): string => {
                                    if (typeof choice === 'string') return choice
                                    if (choice && typeof choice === 'object' && 'text' in choice) return choice.text
                                    return String(choice)
                                }

                                return choices.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-2">
                                        {choices.map((choice: any, i: number) => (
                                            <div
                                                key={i}
                                                className={`text-xs p-2 rounded border ${correctIndex === i
                                                    ? "bg-green-600 border-green-600 text-white font-medium"
                                                    : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                                                    }`}
                                            >
                                                {String.fromCharCode(65 + i)}. {getChoiceText(choice)}
                                            </div>
                                        ))}
                                    </div>
                                ) : null
                            })()}

                            {question.type === "TRUE_FALSE" && (() => {
                                const correctIndex = Array.isArray(question.options)
                                    ? question.correctIndex
                                    : question.options?.correctIndex
                                return (
                                    <div className="flex gap-2 ml-2">
                                        <Badge className={correctIndex === 0 ? "bg-green-600" : "bg-slate-800"}>Benar</Badge>
                                        <Badge className={correctIndex === 1 ? "bg-red-600" : "bg-slate-800"}>Salah</Badge>
                                    </div>
                                )
                            })()}
                        </div>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={onEdit} className="text-slate-400 hover:text-white">
                                <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onDelete}
                                disabled={deleting}
                                className="text-slate-400 hover:text-red-400"
                            >
                                {deleting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export function QuizBuilder({ quiz }: QuizBuilderProps) {
    const [questions, setQuestions] = useState(quiz.Question || [])
    const [editingId, setEditingId] = useState<string | null>(null)
    const [isAdding, setIsAdding] = useState(false)
    const [generating, setGenerating] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [deletingAll, setDeletingAll] = useState(false)
    const [normalizing, setNormalizing] = useState(false)
    const router = useRouter()

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = questions.findIndex((q: any) => q.id === active.id)
            const newIndex = questions.findIndex((q: any) => q.id === over.id)

            const newQuestions = arrayMove(questions, oldIndex, newIndex)
            setQuestions(newQuestions)

            // Save new order to database
            const result = await reorderQuestions(quiz.id, newQuestions.map((q: any) => q.id))
            if (result.success) {
                toast.success("Urutan soal diperbarui")
            } else {
                toast.error(result.error || "Gagal memperbarui urutan")
                // Revert on error
                setQuestions(questions)
            }
        }
    }

    const handleGenerateAI = async () => {
        console.log('[GenerateAI] Button clicked, quizId:', quiz.id)
        setGenerating(true)
        try {
            console.log('[GenerateAI] Sending request to /api/generate-quiz-questions')
            const response = await fetch("/api/generate-quiz-questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quizId: quiz.id })
            })

            console.log('[GenerateAI] Response status:', response.status)
            const data = await response.json()
            console.log('[GenerateAI] Response data:', data)

            if (!response.ok) {
                throw new Error(data.error || "Gagal generate soal")
            }

            if (data.success) {
                toast.success(data.message || `Berhasil generate ${data.questionsCreated} soal!`)
                window.location.reload()
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Gagal generate soal dengan AI"
            toast.error(message)
        } finally {
            setGenerating(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus pertanyaan ini?")) return

        setDeleting(id)
        try {
            const result = await deleteQuestion(id)
            if (result.success) {
                setQuestions((prev: any[]) => prev.filter((q: any) => q.id !== id))
                toast.success("Pertanyaan dihapus")
            } else {
                toast.error(result.error || "Gagal menghapus")
            }
        } catch (err) {
            toast.error("Gagal menghapus pertanyaan")
        } finally {
            setDeleting(null)
        }
    }

    const handleDeleteAll = async () => {
        if (!confirm(`Hapus SEMUA ${questions.length} pertanyaan? Tindakan ini tidak dapat dibatalkan.`)) return

        setDeletingAll(true)
        try {
            let deleted = 0
            for (const q of questions) {
                const result = await deleteQuestion(q.id)
                if (result.success) deleted++
            }
            setQuestions([])
            toast.success(`${deleted} pertanyaan dihapus`)
        } catch (err) {
            toast.error("Gagal menghapus beberapa pertanyaan")
        } finally {
            setDeletingAll(false)
        }
    }

    const handleNormalizePoints = async () => {
        setNormalizing(true)
        try {
            const result = await normalizeQuizPoints(quiz.id)
            if (result.success) {
                toast.success(result.message || "Poin berhasil didistribusi!")
                window.location.reload()
            } else {
                toast.error(result.error || "Gagal mendistribusi poin")
            }
        } catch (err) {
            toast.error("Gagal mendistribusi poin")
        } finally {
            setNormalizing(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pertanyaan ({questions.length})</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Drag untuk mengubah urutan soal</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {questions.length > 0 && (
                        <>
                            <Button
                                onClick={handleDeleteAll}
                                disabled={deletingAll || generating || isAdding || normalizing}
                                variant="outline"
                                className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                            >
                                {deletingAll ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Menghapus...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Hapus Semua
                                    </>
                                )}
                            </Button>
                            <Button
                                onClick={handleNormalizePoints}
                                disabled={normalizing || generating || isAdding || deletingAll}
                                variant="outline"
                                className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                            >
                                {normalizing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Distribusi...
                                    </>
                                ) : (
                                    "= 100 Poin"
                                )}
                            </Button>
                        </>
                    )}
                    <BulkUploadDialog
                        quizId={quiz.id}
                        quizType={quiz.type}
                        onSuccess={() => window.location.reload()}
                    />
                    <Button
                        onClick={handleGenerateAI}
                        disabled={generating || isAdding || deletingAll}
                        variant="outline"
                        className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Generate by AI
                            </>
                        )}
                    </Button>
                    <Button onClick={() => setIsAdding(true)} disabled={isAdding || generating || deletingAll} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah Pertanyaan
                    </Button>
                </div>
            </div>

            {isAdding && (
                <QuestionForm
                    quizId={quiz.id}
                    onSave={() => {
                        setIsAdding(false)
                        window.location.reload()
                    }}
                    onCancel={() => setIsAdding(false)}
                />
            )}

            <div className="space-y-4">
                {questions.length > 0 ? (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={questions.map((q: any) => q.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {questions.map((q: any, idx: number) => (
                                <div key={q.id}>
                                    {editingId === q.id ? (
                                        <QuestionForm
                                            quizId={quiz.id}
                                            question={q}
                                            onSave={() => {
                                                setEditingId(null)
                                                window.location.reload()
                                            }}
                                            onCancel={() => setEditingId(null)}
                                        />
                                    ) : (
                                        <SortableQuestionCard
                                            question={q}
                                            index={idx}
                                            onEdit={() => setEditingId(q.id)}
                                            onDelete={() => handleDelete(q.id)}
                                            deleting={deleting === q.id}
                                        />
                                    )}
                                </div>
                            ))}
                        </SortableContext>
                    </DndContext>
                ) : !isAdding && (
                    <div className="text-center py-12 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
                        <FileText className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-500">Belum ada pertanyaan. Mulai tambahkan sekarang.</p>
                        <Button variant="outline" onClick={() => setIsAdding(true)} className="mt-4 border-slate-300 dark:border-slate-700">
                            Tambah Pertanyaan Pertama
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
