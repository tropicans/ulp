"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
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
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createQuiz } from "@/lib/actions/quizzes"
import { useRouter } from "next/navigation"

interface CreateQuizDialogProps {
    moduleId: string
}

export function CreateQuizDialog({ moduleId }: CreateQuizDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleSubmit(formData: FormData) {
        setLoading(true)

        const data = {
            moduleId,
            title: formData.get("title") as string,
            description: formData.get("description") as string || undefined,
            type: formData.get("type") as any,
            passingScore: parseInt(formData.get("passingScore") as string) || 70,
            timeLimit: formData.get("timeLimit") ? parseInt(formData.get("timeLimit") as string) : null,
            maxAttempts: parseInt(formData.get("maxAttempts") as string) || 1,
            shuffleQuestions: true,
            showCorrectAnswers: true,
        }

        const result = await createQuiz(data)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Kuis berhasil dibuat!")
            setOpen(false)
            router.refresh()
            if (result.quiz) {
                router.push(`/dashboard/quizzes/${result.quiz.id}/edit`)
            }
        }

        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full mt-2 border-slate-700 text-slate-400 hover:text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Kuis
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <form action={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Buat Kuis Baru</DialogTitle>
                        <DialogDescription>
                            Tambahkan kuis evaluasi ke dalam modul ini
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Judul Kuis *</Label>
                            <Input
                                id="title"
                                name="title"
                                placeholder="contoh: Quiz Pengenalan"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="type">Tipe</Label>
                            <Select name="type" defaultValue="QUIZ" disabled={loading}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="QUIZ">Kuis Reguler</SelectItem>
                                    <SelectItem value="PRETEST">Pre-test</SelectItem>
                                    <SelectItem value="POSTTEST">Post-test</SelectItem>
                                    <SelectItem value="EXAM">Ujian Akhir</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="passingScore">Passing Score (%)</Label>
                                <Input
                                    id="passingScore"
                                    name="passingScore"
                                    type="number"
                                    defaultValue="70"
                                    min="0"
                                    max="100"
                                    disabled={loading}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="maxAttempts">Max Attempts</Label>
                                <Input
                                    id="maxAttempts"
                                    name="maxAttempts"
                                    type="number"
                                    defaultValue="1"
                                    min="1"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="timeLimit">Time Limit (menit - opsional)</Label>
                            <Input
                                id="timeLimit"
                                name="timeLimit"
                                type="number"
                                placeholder="Kosongkan jika tidak ada batas waktu"
                                min="1"
                                disabled={loading}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Deskripsi</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Instruksi kuis..."
                                rows={3}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={loading}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Buat Kuis
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
