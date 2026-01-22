"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Image, Wand2, Save, Loader2, ExternalLink, AlertCircle } from "lucide-react"
import { updateCourseThumbnail } from "@/lib/actions/courses"
import { cn } from "@/lib/utils"

interface ThumbnailManagerProps {
    courseId: string
    courseTitle: string
    courseDescription?: string | null
    currentThumbnail?: string | null
}

export function ThumbnailManager({
    courseId,
    courseTitle,
    courseDescription,
    currentThumbnail
}: ThumbnailManagerProps) {
    const [thumbnailUrl, setThumbnailUrl] = useState(currentThumbnail || "")
    const [isGenerating, setIsGenerating] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [previewUrl, setPreviewUrl] = useState(currentThumbnail || "")

    const handleSave = async () => {
        if (!thumbnailUrl.trim()) {
            setError("URL thumbnail tidak boleh kosong")
            return
        }

        setIsSaving(true)
        setError(null)
        setSuccess(null)

        try {
            const result = await updateCourseThumbnail(courseId, thumbnailUrl)
            if (result.error) {
                setError(result.error)
            } else {
                setSuccess("Thumbnail berhasil disimpan!")
                setPreviewUrl(thumbnailUrl)
                setTimeout(() => setSuccess(null), 3000)
            }
        } catch (err) {
            setError("Gagal menyimpan thumbnail")
        } finally {
            setIsSaving(false)
        }
    }

    const handleGenerate = async () => {
        setIsGenerating(true)
        setError(null)
        setSuccess(null)

        try {
            const response = await fetch("/api/generate-thumbnail", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    courseTitle,
                    courseDescription
                })
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.error || "Gagal generate thumbnail")
                return
            }

            // Handle successful image generation
            if (data.imageUrl) {
                setThumbnailUrl(data.imageUrl)
                setPreviewUrl(data.imageUrl)
                setSuccess("Thumbnail berhasil di-generate! Klik Simpan untuk menyimpan.")
                return
            }

            // Handle suggestion fallback
            if (data.suggestion) {
                setThumbnailUrl(data.suggestion)
                setPreviewUrl(data.suggestion)
                setSuccess("Gambar dari Unsplash digunakan. Klik Simpan untuk menyimpan.")
                return
            }

            // No image available
            setError(data.message || "Tidak bisa generate thumbnail")
        } catch (err) {
            setError("Gagal terhubung ke server AI")
        } finally {
            setIsGenerating(false)
        }
    }

    const handlePreview = () => {
        if (thumbnailUrl.trim()) {
            setPreviewUrl(thumbnailUrl)
        }
    }

    return (
        <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                    <Image className="w-5 h-5" />
                    Thumbnail Kursus
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Current Thumbnail Preview */}
                <div className="relative aspect-video w-full max-w-md rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                    {previewUrl ? (
                        <img
                            src={previewUrl}
                            alt="Course thumbnail"
                            className="w-full h-full object-cover"
                            onError={() => setPreviewUrl("")}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <Image className="w-12 h-12 mb-2" />
                            <span className="text-sm">Belum ada thumbnail</span>
                        </div>
                    )}
                </div>

                {/* URL Input */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        URL Thumbnail
                    </label>
                    <div className="flex gap-2">
                        <Input
                            type="url"
                            placeholder="https://example.com/image.jpg"
                            value={thumbnailUrl}
                            onChange={(e) => setThumbnailUrl(e.target.value)}
                            className="flex-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"
                        />
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handlePreview}
                            className="border-slate-300 dark:border-slate-600"
                            title="Preview"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </Button>
                    </div>
                    <p className="text-xs text-slate-500">
                        Masukkan URL gambar langsung (format: .jpg, .png, .webp)
                    </p>
                </div>

                {/* Error & Success Messages */}
                {error && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </div>
                )}
                {success && (
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm">
                        {success}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || !thumbnailUrl.trim()}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        Simpan Thumbnail
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="border-purple-500/50 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                    >
                        {isGenerating ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Wand2 className="w-4 h-4 mr-2" />
                        )}
                        Generate dengan AI
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
