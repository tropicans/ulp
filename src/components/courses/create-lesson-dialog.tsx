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
import { createLesson } from "@/lib/actions/modules"
import { useRouter } from "next/navigation"

interface CreateLessonDialogProps {
    moduleId: string
    nextOrder: number
}

export function CreateLessonDialog({ moduleId, nextOrder }: CreateLessonDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [contentType, setContentType] = useState("ARTICLE")
    const router = useRouter()

    async function handleSubmit(formData: FormData) {
        setLoading(true)

        const data = {
            title: formData.get("title") as string,
            description: formData.get("description") as string || null,
            contentType: formData.get("contentType") as "VIDEO" | "DOCUMENT" | "ARTICLE" | "SCORM" | "EXTERNAL_LINK" | "ASSIGNMENT",
            content: formData.get("content") as string || null,
            videoUrl: formData.get("videoUrl") as string || null,
            fileUrl: formData.get("fileUrl") as string || null,
            duration: parseInt(formData.get("duration") as string) || null,
            order: nextOrder,
        }

        const result = await createLesson(moduleId, data)

        if (result.error) {
            toast.error("Gagal membuat lesson", {
                description: result.error,
            })
        } else {
            toast.success("Lesson berhasil dibuat!")
            setOpen(false)
            router.refresh()
        }

        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Lesson
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <form action={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Buat Lesson Baru</DialogTitle>
                        <DialogDescription>
                            Tambahkan lesson baru ke module ini.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* Basic Info */}
                        <div className="grid gap-2">
                            <Label htmlFor="title">Judul Lesson *</Label>
                            <Input
                                id="title"
                                name="title"
                                placeholder="contoh: Pengenalan Materi"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Deskripsi (Opsional)</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Penjelasan singkat..."
                                rows={2}
                                disabled={loading}
                            />
                        </div>

                        {/* Content Type */}
                        <div className="grid gap-2">
                            <Label htmlFor="contentType">Tipe Konten *</Label>
                            <Select
                                name="contentType"
                                value={contentType}
                                onValueChange={setContentType}
                                disabled={loading}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ARTICLE">Artikel/Teks</SelectItem>
                                    <SelectItem value="VIDEO">Video</SelectItem>
                                    <SelectItem value="DOCUMENT">Dokumen/File</SelectItem>
                                    <SelectItem value="QUIZ">Quiz</SelectItem>
                                    <SelectItem value="INTERACTIVE">Interaktif</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Duration */}
                        <div className="grid gap-2">
                            <Label htmlFor="duration">Durasi (menit)</Label>
                            <Input
                                id="duration"
                                name="duration"
                                type="number"
                                placeholder="30"
                                min="1"
                                disabled={loading}
                            />
                        </div>

                        {/* Content-specific fields */}
                        {contentType === "ARTICLE" && (
                            <div className="grid gap-2">
                                <Label htmlFor="content">Konten Artikel *</Label>
                                <Textarea
                                    id="content"
                                    name="content"
                                    placeholder="Tulis konten artikel di sini..."
                                    rows={6}
                                    required
                                    disabled={loading}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Mendukung HTML sederhana untuk formatting
                                </p>
                            </div>
                        )}

                        {contentType === "VIDEO" && (
                            <div className="grid gap-2">
                                <Label htmlFor="videoUrl">URL Video *</Label>
                                <Input
                                    id="videoUrl"
                                    name="videoUrl"
                                    type="url"
                                    placeholder="https://youtube.com/embed/..."
                                    required
                                    disabled={loading}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Gunakan URL embed untuk YouTube, Vimeo, dll
                                </p>
                            </div>
                        )}

                        {contentType === "DOCUMENT" && (
                            <div className="grid gap-2">
                                <Label htmlFor="fileUrl">URL File/Dokumen *</Label>
                                <Input
                                    id="fileUrl"
                                    name="fileUrl"
                                    type="url"
                                    placeholder="https://..."
                                    required
                                    disabled={loading}
                                />
                                <p className="text-xs text-muted-foreground">
                                    URL file PDF, Word, atau dokumen lainnya
                                </p>
                            </div>
                        )}

                        {(contentType === "QUIZ" || contentType === "INTERACTIVE") && (
                            <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">
                                    Tipe konten ini akan tersedia di update mendatang.
                                </p>
                            </div>
                        )}
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
                            Buat Lesson
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
