"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { Pencil, Loader2 } from "lucide-react"
import { updateCourse } from "@/lib/actions/courses"
import { DeliveryMode, Difficulty } from "@/generated/prisma"

interface EditCourseInfoDialogProps {
    course: {
        id: string
        title: string
        description: string | null
        deliveryMode: DeliveryMode
        difficulty: Difficulty
        category: string | null
        duration: number | null
    }
}

const deliveryModeLabels: Record<DeliveryMode, string> = {
    ASYNC_ONLINE: "E-Learning (Asinkron)",
    SYNC_ONLINE: "Live Online (Zoom/Streaming)",
    HYBRID: "Hybrid (Online + Tatap Muka)",
    ON_CLASSROOM: "Tatap Muka (Classroom)",
}

const difficultyLabels: Record<Difficulty, string> = {
    BEGINNER: "Pemula",
    INTERMEDIATE: "Menengah",
    ADVANCED: "Lanjutan",
}

export function EditCourseInfoDialog({ course }: EditCourseInfoDialogProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        title: course.title,
        description: course.description || "",
        deliveryMode: course.deliveryMode,
        difficulty: course.difficulty,
        category: course.category || "",
        duration: course.duration || 0,
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const result = await updateCourse(course.id, {
            ...formData,
            category: formData.category || null,
            duration: formData.duration || null,
        })

        setLoading(false)

        if (result.error) {
            setError(result.error)
            return
        }

        setOpen(false)
        router.refresh()
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300">
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-slate-900 dark:text-white">Edit Informasi Kursus</DialogTitle>
                        <DialogDescription className="text-slate-500 dark:text-slate-400">
                            Ubah informasi dasar kursus Anda
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-6">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-slate-700 dark:text-slate-300">Judul Kursus</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                placeholder="Contoh: Administrasi Publik Modern"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-slate-700 dark:text-slate-300">Deskripsi</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white min-h-[100px]"
                                placeholder="Jelaskan tentang kursus ini..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-700 dark:text-slate-300">Metode Pengiriman</Label>
                                <Select
                                    value={formData.deliveryMode}
                                    onValueChange={(value: DeliveryMode) => setFormData({ ...formData, deliveryMode: value })}
                                >
                                    <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                        {Object.entries(deliveryModeLabels).map(([value, label]) => (
                                            <SelectItem key={value} value={value} className="text-slate-900 dark:text-white">
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-700 dark:text-slate-300">Tingkat Kesulitan</Label>
                                <Select
                                    value={formData.difficulty}
                                    onValueChange={(value: Difficulty) => setFormData({ ...formData, difficulty: value })}
                                >
                                    <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                        {Object.entries(difficultyLabels).map(([value, label]) => (
                                            <SelectItem key={value} value={value} className="text-slate-900 dark:text-white">
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="category" className="text-slate-700 dark:text-slate-300">Kategori</Label>
                                <Input
                                    id="category"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                    placeholder="Contoh: Manajemen"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="duration" className="text-slate-700 dark:text-slate-300">Durasi (jam)</Label>
                                <Input
                                    id="duration"
                                    type="number"
                                    value={formData.duration || ""}
                                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                    placeholder="16"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            className="border-slate-300 dark:border-slate-600"
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                "Simpan Perubahan"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
