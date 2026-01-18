"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createCourse } from "@/lib/actions/courses"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { DeliveryMode, Difficulty } from "@/generated/prisma"

export default function NewCoursePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const data = {
            title: formData.get("title") as string,
            description: formData.get("description") as string,
            deliveryMode: formData.get("deliveryMode") as DeliveryMode,
            difficulty: formData.get("difficulty") as Difficulty,
            category: formData.get("category") as string,
            duration: formData.get("duration") ? parseInt(formData.get("duration") as string) : null,
        }

        const result = await createCourse(data)

        if (result.error) {
            toast.error(result.error)
            setLoading(false)
        } else {
            toast.success("Kursus berhasil dibuat!")
            router.push(`/dashboard/courses/${result.course?.id}/edit`)
        }
    }

    return (
        <div className="min-h-screen bg-white dark:bg-slate-900 pt-24 pb-20">
            <div className="container max-w-3xl mx-auto px-4">
                <Link href="/dashboard/courses" className="flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm mb-6 w-fit group">
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Kembali ke Daftar Kursus
                </Link>

                <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-2xl text-slate-900 dark:text-white">Buat Kursus Baru</CardTitle>
                        <CardDescription className="text-slate-500 dark:text-slate-400">
                            Isi informasi dasar kursus. Anda dapat menambahkan modul dan materi setelah kursus dibuat.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-slate-700 dark:text-white">Judul Kursus *</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    required
                                    placeholder="e.g., Kepemimpinan Digital ASN"
                                    className="bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-slate-700 dark:text-white">Deskripsi *</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    required
                                    rows={4}
                                    placeholder="Jelaskan tujuan dan materi yang akan dipelajari..."
                                    className="bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="deliveryMode" className="text-slate-700 dark:text-white">Metode Pembelajaran *</Label>
                                    <Select name="deliveryMode" required defaultValue="ASYNC_ONLINE">
                                        <SelectTrigger className="bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ON_CLASSROOM">On-Classroom (Tatap Muka)</SelectItem>
                                            <SelectItem value="HYBRID">Hybrid (Campuran)</SelectItem>
                                            <SelectItem value="ASYNC_ONLINE">Async Online (E-Learning)</SelectItem>
                                            <SelectItem value="SYNC_ONLINE">Sync Online (Live Webinar)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="difficulty" className="text-slate-700 dark:text-white">Tingkat Kesulitan *</Label>
                                    <Select name="difficulty" required defaultValue="BEGINNER">
                                        <SelectTrigger className="bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="BEGINNER">Pemula</SelectItem>
                                            <SelectItem value="INTERMEDIATE">Menengah</SelectItem>
                                            <SelectItem value="ADVANCED">Lanjutan</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="category" className="text-slate-700 dark:text-white">Kategori</Label>
                                    <Input
                                        id="category"
                                        name="category"
                                        placeholder="e.g., Leadership, IT, Administration"
                                        className="bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="duration" className="text-slate-700 dark:text-white">Durasi (jam)</Label>
                                    <Input
                                        id="duration"
                                        name="duration"
                                        type="number"
                                        placeholder="e.g., 20"
                                        className="bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <Link href="/dashboard/courses">
                                    <Button type="button" variant="outline" className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300">
                                        Batal
                                    </Button>
                                </Link>
                                <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Buat Kursus
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
