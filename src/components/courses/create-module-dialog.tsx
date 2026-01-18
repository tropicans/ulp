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
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createModule } from "@/lib/actions/modules"
import { useRouter } from "next/navigation"

interface CreateModuleDialogProps {
    courseId: string
    nextOrder: number
}

export function CreateModuleDialog({ courseId, nextOrder }: CreateModuleDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleSubmit(formData: FormData) {
        setLoading(true)

        const title = formData.get("title") as string
        const description = formData.get("description") as string

        const result = await createModule(courseId, {
            title,
            description,
            order: nextOrder,
        })

        if (result.error) {
            toast.error("Gagal membuat module", {
                description: result.error,
            })
        } else {
            toast.success("Module berhasil dibuat!")
            setOpen(false)
            router.refresh()
        }

        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Module
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <form action={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Buat Module Baru</DialogTitle>
                        <DialogDescription>
                            Tambahkan module baru ke course ini. Module akan ditambahkan di urutan terakhir.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Judul Module *</Label>
                            <Input
                                id="title"
                                name="title"
                                placeholder="contoh: Pendahuluan"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Deskripsi (Opsional)</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Penjelasan singkat tentang module ini..."
                                rows={3}
                                disabled={loading}
                            />
                        </div>

                        <p className="text-sm text-muted-foreground">
                            Urutan: <span className="font-medium">#{nextOrder}</span>
                        </p>
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
                            Buat Module
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
