"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, CheckCircle2, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { createQuestion, updateQuestion } from "@/lib/actions/questions"

interface QuestionFormProps {
    quizId: string
    question?: any // For editing
    onSave?: () => void
    onCancel?: () => void
}

export function QuestionForm({ quizId, question, onSave, onCancel }: QuestionFormProps) {
    const [loading, setLoading] = useState(false)
    const [type, setType] = useState<string>(question?.type || "MULTIPLE_CHOICE")
    const [options, setOptions] = useState<any>(question?.options || { choices: ["", ""], correctIndex: 0 })

    const addOption = () => {
        setOptions({ ...options, choices: [...options.choices, ""] })
    }

    const removeOption = (index: number) => {
        if (options.choices.length <= 2) return
        const newChoices = options.choices.filter((_: any, i: number) => i !== index)
        setOptions({
            ...options,
            choices: newChoices,
            correctIndex: options.correctIndex >= index ? Math.max(0, options.correctIndex - 1) : options.correctIndex
        })
    }

    const updateOptionText = (index: number, text: string) => {
        const newChoices = [...options.choices]
        newChoices[index] = text
        setOptions({ ...options, choices: newChoices })
    }

    const handleSave = async (formData: FormData) => {
        setLoading(true)

        const data = {
            quizId,
            type: type as any,
            text: formData.get("text") as string,
            explanation: formData.get("explanation") as string || undefined,
            points: parseInt(formData.get("points") as string) || 1,
            order: question?.order || 0,
            options: (type === "MULTIPLE_CHOICE" || type === "TRUE_FALSE") ? options : undefined,
            modelAnswer: type === "ESSAY" ? formData.get("modelAnswer") as string : undefined,
        }

        const result = question
            ? await updateQuestion(question.id, data)
            : await createQuestion(data)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success(question ? "Pertanyaan diperbarui" : "Pertanyaan ditambahkan")
            if (onSave) onSave()
        }
        setLoading(false)
    }

    return (
        <form action={handleSave} className="space-y-4 p-6 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">
                    {question ? "Edit Pertanyaan" : "Tambah Pertanyaan"}
                </h3>
                <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
                        Batal
                    </Button>
                    <Button type="submit" size="sm" disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Simpan
                    </Button>
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="type">Tipe Pertanyaan</Label>
                <Select value={type} onValueChange={setType} disabled={loading}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="MULTIPLE_CHOICE">Pilihan Ganda</SelectItem>
                        <SelectItem value="TRUE_FALSE">Benar / Salah</SelectItem>
                        <SelectItem value="ESSAY">Esai (Text Area)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="text">Pertanyaan</Label>
                <Textarea
                    id="text"
                    name="text"
                    defaultValue={question?.text}
                    placeholder="Tuliskan pertanyaan di sini..."
                    required
                    disabled={loading}
                />
            </div>

            {type === "MULTIPLE_CHOICE" && (
                <div className="space-y-3">
                    <Label>Opsi Jawaban</Label>
                    {options.choices.map((choice: string, index: number) => (
                        <div key={index} className="flex gap-2 items-center">
                            <div
                                className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${options.correctIndex === index
                                        ? "bg-green-500 border-green-500"
                                        : "border-slate-600 hover:border-slate-500"
                                    }`}
                                onClick={() => setOptions({ ...options, correctIndex: index })}
                            >
                                {options.correctIndex === index && <CheckCircle2 className="w-4 h-4 text-white" />}
                            </div>
                            <Input
                                value={choice}
                                onChange={(e) => updateOptionText(index, e.target.value)}
                                placeholder={`Opsi ${index + 1}`}
                                className="bg-slate-900/50 border-slate-700"
                                disabled={loading}
                                required
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeOption(index)}
                                disabled={loading || options.choices.length <= 2}
                                className="text-slate-500 hover:text-red-400"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addOption}
                        disabled={loading}
                        className="mt-2 border-slate-700 text-slate-400"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah Opsi
                    </Button>
                </div>
            )}

            {type === "TRUE_FALSE" && (
                <div className="flex gap-4">
                    <Button
                        type="button"
                        variant={options.correctIndex === 0 ? "default" : "outline"}
                        className={options.correctIndex === 0 ? "bg-green-600 hover:bg-green-700" : "border-slate-700"}
                        onClick={() => setOptions({ choices: ["Benar", "Salah"], correctIndex: 0 })}
                        disabled={loading}
                    >
                        Benar
                    </Button>
                    <Button
                        type="button"
                        variant={options.correctIndex === 1 ? "default" : "outline"}
                        className={options.correctIndex === 1 ? "bg-red-600 hover:bg-red-700" : "border-slate-700"}
                        onClick={() => setOptions({ choices: ["Benar", "Salah"], correctIndex: 1 })}
                        disabled={loading}
                    >
                        Salah
                    </Button>
                </div>
            )}

            {type === "ESSAY" && (
                <div className="grid gap-2">
                    <Label htmlFor="modelAnswer">Kunci Jawaban / Referensi (opsional)</Label>
                    <Textarea
                        id="modelAnswer"
                        name="modelAnswer"
                        defaultValue={question?.modelAnswer}
                        placeholder="Referensi jawaban untuk membantu penilaian..."
                        rows={3}
                        disabled={loading}
                    />
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="points">Poin</Label>
                    <Input
                        id="points"
                        name="points"
                        type="number"
                        defaultValue={question?.points || 1}
                        min="1"
                        disabled={loading}
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="explanation">Penjelasan Jawaban (opsional)</Label>
                    <Input
                        id="explanation"
                        name="explanation"
                        defaultValue={question?.explanation}
                        placeholder="Kenapa jawaban ini benar?"
                        disabled={loading}
                    />
                </div>
            </div>
        </form>
    )
}
