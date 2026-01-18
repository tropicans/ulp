"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Plus,
    Trash2,
    Edit2,
    GripVertical,
    ChevronDown,
    ChevronUp,
    Settings,
    FileText
} from "lucide-react"
import { QuestionForm } from "./question-form"
import { deleteQuestion } from "@/lib/actions/questions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface QuizBuilderProps {
    quiz: any
}

export function QuizBuilder({ quiz }: QuizBuilderProps) {
    const [questions, setQuestions] = useState(quiz.Question || [])
    const [editingId, setEditingId] = useState<string | null>(null)
    const [isAdding, setIsAdding] = useState(false)
    const router = useRouter()

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus pertanyaan ini?")) return

        const result = await deleteQuestion(id)
        if (result.success) {
            toast.success("Pertanyaan dihapus")
            router.refresh()
        } else {
            toast.error(result.error)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-white">Pertanyaan ({questions.length})</h2>
                    <p className="text-sm text-slate-400">Kelola daftar pertanyaan dalam kuis ini</p>
                </div>
                <Button onClick={() => setIsAdding(true)} disabled={isAdding} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Pertanyaan
                </Button>
            </div>

            {isAdding && (
                <QuestionForm
                    quizId={quiz.id}
                    onSave={() => {
                        setIsAdding(false)
                        router.refresh()
                    }}
                    onCancel={() => setIsAdding(false)}
                />
            )}

            <div className="space-y-4">
                {questions.length > 0 ? (
                    questions.map((q: any, idx: number) => (
                        <div key={q.id}>
                            {editingId === q.id ? (
                                <QuestionForm
                                    quizId={quiz.id}
                                    question={q}
                                    onSave={() => {
                                        setEditingId(null)
                                        router.refresh()
                                    }}
                                    onCancel={() => setEditingId(null)}
                                />
                            ) : (
                                <Card className="border-slate-700 bg-slate-800/30">
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 text-slate-500">
                                                <GripVertical className="w-5 h-5 cursor-grab" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-sm font-bold text-blue-400">#{idx + 1}</span>
                                                    <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
                                                        {q.type.replace('_', ' ')}
                                                    </Badge>
                                                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                                                        {q.points} Poin
                                                    </span>
                                                </div>
                                                <p className="text-white font-medium mb-3">{q.text}</p>

                                                {q.type === "MULTIPLE_CHOICE" && q.options?.choices && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-2">
                                                        {q.options.choices.map((choice: string, i: number) => (
                                                            <div
                                                                key={i}
                                                                className={`text-xs p-2 rounded border ${q.options.correctIndex === i
                                                                        ? "bg-green-500/10 border-green-500/30 text-green-300"
                                                                        : "bg-slate-900/50 border-slate-800 text-slate-400"
                                                                    }`}
                                                            >
                                                                {String.fromCharCode(65 + i)}. {choice}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {q.type === "TRUE_FALSE" && (
                                                    <div className="flex gap-2 ml-2">
                                                        <Badge className={q.options?.correctIndex === 0 ? "bg-green-600" : "bg-slate-800"}>Benar</Badge>
                                                        <Badge className={q.options?.correctIndex === 1 ? "bg-red-600" : "bg-slate-800"}>Salah</Badge>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => setEditingId(q.id)} className="text-slate-400 hover:text-white">
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)} className="text-slate-400 hover:text-red-400">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    ))
                ) : !isAdding && (
                    <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-lg">
                        <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-500">Belum ada pertanyaan. Mulai tambahkan sekarang.</p>
                        <Button variant="outline" onClick={() => setIsAdding(true)} className="mt-4 border-slate-700">
                            Tambah Pertanyaan Pertama
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
