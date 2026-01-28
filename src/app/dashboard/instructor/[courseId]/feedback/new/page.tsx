"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { createFeedbackSurvey } from "@/lib/actions/feedback"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2, Save } from "lucide-react"
import Link from "next/link"

export default function NewSurveyPage() {
    const router = useRouter()
    const params = useParams()
    const courseId = params.courseId as string

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [title, setTitle] = useState("Evaluasi Penyelenggaraan Pelatihan")
    const [description, setDescription] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!title.trim()) {
            setError("Judul survey wajib diisi")
            return
        }

        setIsSubmitting(true)
        setError(null)

        const result = await createFeedbackSurvey({
            courseId,
            title,
            description: description || undefined
        })

        setIsSubmitting(false)

        if (result.success) {
            router.push(`/dashboard/instructor/${courseId}/feedback`)
        } else {
            setError(result.error || "Gagal membuat survey")
        }
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-2xl">
            <div className="mb-8">
                <Link
                    href={`/dashboard/instructor/${courseId}/feedback`}
                    className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center gap-1"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Kembali ke Feedback
                </Link>
                <h1 className="text-2xl font-bold">Buat Survey Baru</h1>
                <p className="text-gray-600">Buat survey untuk mengumpulkan feedback dari peserta</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Detail Survey</CardTitle>
                    <CardDescription>
                        Tentukan judul dan deskripsi survey
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Judul Survey *</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Misal: Evaluasi Penyelenggaraan Pelatihan Batch 1"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Deskripsi (Opsional)</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Deskripsi singkat tentang survey ini..."
                                rows={3}
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Simpan Survey
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
