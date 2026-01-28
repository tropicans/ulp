"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RatingInput } from "./rating-input"
import { submitFeedbackResponse } from "@/lib/actions/feedback"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Loader2, Send } from "lucide-react"
import { cn } from "@/lib/utils"

interface FeedbackFormProps {
    surveyId: string
    surveyTitle: string
    surveyDescription?: string | null
    courseTitle: string
    onSuccess?: () => void
}

export function FeedbackForm({
    surveyId,
    surveyTitle,
    surveyDescription,
    courseTitle,
    onSuccess
}: FeedbackFormProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form state
    const [overallRating, setOverallRating] = useState(0)
    const [instructorRating, setInstructorRating] = useState(0)
    const [materialRating, setMaterialRating] = useState(0)
    const [facilityRating, setFacilityRating] = useState(0)
    const [strengths, setStrengths] = useState("")
    const [improvements, setImprovements] = useState("")
    const [suggestions, setSuggestions] = useState("")
    const [isAnonymous, setIsAnonymous] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (overallRating === 0) {
            setError("Silakan berikan penilaian keseluruhan")
            return
        }

        setIsSubmitting(true)
        setError(null)

        const result = await submitFeedbackResponse({
            surveyId,
            overallRating,
            instructorRating: instructorRating || undefined,
            materialRating: materialRating || undefined,
            facilityRating: facilityRating || undefined,
            strengths: strengths || undefined,
            improvements: improvements || undefined,
            suggestions: suggestions || undefined,
            isAnonymous
        })

        setIsSubmitting(false)

        if (result.success) {
            setIsSubmitted(true)
            onSuccess?.()
            setTimeout(() => {
                router.refresh()
            }, 2000)
        } else {
            setError(result.error || "Gagal mengirim feedback")
        }
    }

    if (isSubmitted) {
        return (
            <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                        <h3 className="text-xl font-semibold text-green-700 mb-2">
                            Terima Kasih!
                        </h3>
                        <p className="text-green-600">
                            Feedback Anda telah berhasil dikirim dan akan membantu kami meningkatkan kualitas pembelajaran.
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">📝</span>
                    {surveyTitle}
                </CardTitle>
                <CardDescription>
                    {surveyDescription || `Berikan penilaian Anda untuk "${courseTitle}"`}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Overall Rating - Required */}
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                        <RatingInput
                            value={overallRating}
                            onChange={setOverallRating}
                            label="Penilaian Keseluruhan"
                            description="Bagaimana penilaian Anda secara umum terhadap pelatihan ini?"
                            required
                        />
                    </div>

                    {/* Category Ratings */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <RatingInput
                                value={instructorRating}
                                onChange={setInstructorRating}
                                label="Instruktur/Fasilitator"
                                description="Penguasaan materi dan penyampaian"
                            />
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <RatingInput
                                value={materialRating}
                                onChange={setMaterialRating}
                                label="Materi Pembelajaran"
                                description="Kualitas dan relevansi materi"
                            />
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <RatingInput
                                value={facilityRating}
                                onChange={setFacilityRating}
                                label="Fasilitas & Penyelenggaraan"
                                description="Ruangan, perlengkapan, konsumsi"
                            />
                        </div>
                    </div>

                    {/* Text Feedback */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">
                                💪 Apa yang menurut Anda sudah baik?
                            </label>
                            <Textarea
                                value={strengths}
                                onChange={(e) => setStrengths(e.target.value)}
                                placeholder="Misal: Materi sangat relevan dengan pekerjaan sehari-hari..."
                                rows={3}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">
                                🔧 Apa yang perlu diperbaiki?
                            </label>
                            <Textarea
                                value={improvements}
                                onChange={(e) => setImprovements(e.target.value)}
                                placeholder="Misal: Waktu pelatihan terlalu singkat..."
                                rows={3}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">
                                💡 Saran untuk penyelenggaraan berikutnya
                            </label>
                            <Textarea
                                value={suggestions}
                                onChange={(e) => setSuggestions(e.target.value)}
                                placeholder="Misal: Sebaiknya diadakan sesi tanya jawab yang lebih lama..."
                                rows={3}
                            />
                        </div>
                    </div>

                    {/* Anonymous Toggle */}
                    <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                        <Checkbox
                            id="anonymous"
                            checked={isAnonymous}
                            onCheckedChange={(checked) => setIsAnonymous(checked === true)}
                        />
                        <label
                            htmlFor="anonymous"
                            className="text-sm text-gray-600 cursor-pointer"
                        >
                            Kirim sebagai anonim (nama Anda tidak akan ditampilkan)
                        </label>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        disabled={isSubmitting || overallRating === 0}
                        className={cn(
                            "w-full",
                            overallRating > 0 && "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        )}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Mengirim...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Kirim Feedback
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
