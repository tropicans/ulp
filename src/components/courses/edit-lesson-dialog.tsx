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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Pencil } from "lucide-react"
import { toast } from "sonner"
import { updateLesson } from "@/lib/actions/modules"
import { useRouter } from "next/navigation"

interface EditLessonDialogProps {
    lesson: {
        id: string
        title: string
        description?: string | null
        contentType: string
        content?: string | null
        videoUrl?: string | null
    }
}

const contentTypes = [
    { value: "VIDEO", label: "Video" },
    { value: "ARTICLE", label: "Artikel" },
    { value: "DOCUMENT", label: "Dokumen" },
    { value: "SCORM", label: "SCORM" },
    { value: "EXTERNAL_LINK", label: "Link Eksternal" },
    { value: "ASSIGNMENT", label: "Tugas" },
]

export function EditLessonDialog({ lesson }: EditLessonDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [title, setTitle] = useState(lesson.title)
    const [description, setDescription] = useState(lesson.description || "")
    const [contentType, setContentType] = useState(lesson.contentType)
    const [content, setContent] = useState(lesson.content || "")
    const [videoUrl, setVideoUrl] = useState(lesson.videoUrl || "")
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        const result = await updateLesson(lesson.id, {
            title,
            description: description || null,
            contentType: contentType as any,
            content: content || null,
            videoUrl: videoUrl || null,
        })

        if (result.error) {
            toast.error("Gagal mengupdate materi", {
                description: result.error,
            })
        } else {
            toast.success("Materi berhasil diupdate!")
            setOpen(false)
            router.refresh()
        }

        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300">
                    Edit
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Edit Materi</DialogTitle>
                        <DialogDescription>
                            Ubah informasi materi pembelajaran ini.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Judul Materi *</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="contoh: Pengenalan Materi"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Deskripsi (Opsional)</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Penjelasan singkat tentang materi ini..."
                                rows={2}
                                disabled={loading}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Tipe Konten *</Label>
                            <Select value={contentType} onValueChange={setContentType} disabled={loading}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {contentTypes.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {contentType === "VIDEO" && (
                            <div className="grid gap-2">
                                <Label htmlFor="videoUrl">URL Video</Label>
                                <Input
                                    id="videoUrl"
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    placeholder="https://youtube.com/watch?v=..."
                                    disabled={loading}
                                />
                            </div>
                        )}

                        {contentType === "ARTICLE" && (
                            <div className="grid gap-2">
                                <Label htmlFor="content">Konten Artikel</Label>
                                <Textarea
                                    id="content"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Tulis konten artikel di sini..."
                                    rows={6}
                                    disabled={loading}
                                />
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
                            Simpan Perubahan
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
