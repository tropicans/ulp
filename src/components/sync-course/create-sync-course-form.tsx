"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
    Upload,
    FileText,
    Loader2,
    CheckCircle2,
    Video,
    BookOpen,
    Target,
    FileQuestion,
    Save,
    Sparkles,
    ExternalLink,
    Monitor,
    Users,
    Shuffle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { parseKAPText, createSyncCourseFromKAP } from "@/lib/actions/kap-parser"
import { KAPData } from "@/lib/types/kap"
import { useRouter } from "next/navigation"
import Link from "next/link"
import mammoth from "mammoth"

export function CreateSyncCourseForm() {
    const router = useRouter()
    const [step, setStep] = useState<"upload" | "review" | "complete">("upload")
    const [isProcessing, setIsProcessing] = useState(false)
    const [documentText, setDocumentText] = useState("")
    const [youtubeUrl, setYoutubeUrl] = useState("")
    const [createdCourse, setCreatedCourse] = useState<{ id: string; slug: string } | null>(null)
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)

    // Parsed KAP data
    const [kapData, setKapData] = useState<KAPData | null>(null)

    // Delivery mode override (admin can change AI suggestion)
    const [deliveryModeOverride, setDeliveryModeOverride] = useState<"SYNC_ONLINE" | "ASYNC_ONLINE" | "ON_CLASSROOM" | "HYBRID" | null>(null)

    // Editable fields for review
    const [editableTitle, setEditableTitle] = useState("")
    const [editableShortDesc, setEditableShortDesc] = useState("")
    const [editableFullDesc, setEditableFullDesc] = useState("")

    // Computed final delivery mode
    const finalDeliveryMode = deliveryModeOverride || kapData?.deliveryMode || "SYNC_ONLINE"

    // Handle DOCX file upload
    const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsProcessing(true)
        setUploadedFileName(file.name)

        try {
            let text = ""

            if (file.name.endsWith('.docx')) {
                // Parse DOCX using mammoth
                const arrayBuffer = await file.arrayBuffer()
                const result = await mammoth.extractRawText({ arrayBuffer })
                text = result.value
            } else if (file.name.endsWith('.txt')) {
                text = await file.text()
            } else {
                alert("Format file tidak didukung. Gunakan file .docx atau .txt")
                setIsProcessing(false)
                return
            }

            setDocumentText(text)

            // Auto-parse with AI
            const parseResult = await parseKAPText(text)
            if (parseResult.success && parseResult.data) {
                setKapData(parseResult.data)
                setEditableTitle(parseResult.data.courseTitle)
                setEditableShortDesc(parseResult.data.courseDescription)
                setEditableFullDesc(parseResult.data.courseFullDescription)
                setStep("review")
            } else {
                alert(parseResult.error || "Gagal memparse dokumen")
            }
        } catch (error) {
            console.error("Error processing file:", error)
            alert("Terjadi kesalahan saat memproses file")
        } finally {
            setIsProcessing(false)
        }
    }, [])

    const handleTextParse = useCallback(async () => {
        if (!documentText.trim()) return

        setIsProcessing(true)
        try {
            const result = await parseKAPText(documentText)
            if (result.success && result.data) {
                setKapData(result.data)
                setEditableTitle(result.data.courseTitle)
                setEditableShortDesc(result.data.courseDescription)
                setEditableFullDesc(result.data.courseFullDescription)
                setStep("review")
            } else {
                alert(result.error || "Gagal memparse dokumen")
            }
        } catch (error) {
            console.error("Error parsing:", error)
            alert("Terjadi kesalahan saat memparse dokumen")
        } finally {
            setIsProcessing(false)
        }
    }, [documentText])

    const handleCreateCourse = useCallback(async () => {
        if (!kapData || !youtubeUrl) {
            alert("Pastikan YouTube Live URL sudah diisi")
            return
        }

        setIsProcessing(true)
        try {
            // Use editable values instead of raw kapData
            const updatedKapData = {
                ...kapData,
                courseTitle: editableTitle,
                courseDescription: editableShortDesc,
                courseFullDescription: editableFullDesc
            }
            const result = await createSyncCourseFromKAP(updatedKapData, youtubeUrl, deliveryModeOverride || undefined)
            if (result.success && result.courseId && result.slug) {
                setCreatedCourse({ id: result.courseId, slug: result.slug })
                setStep("complete")
            } else {
                alert(result.error || "Gagal membuat course")
            }
        } catch (error) {
            console.error("Error creating course:", error)
            alert("Terjadi kesalahan saat membuat course")
        } finally {
            setIsProcessing(false)
        }
    }, [kapData, youtubeUrl, deliveryModeOverride, editableTitle, editableShortDesc, editableFullDesc])

    const DELIVERY_MODES = [
        { value: "SYNC_ONLINE", label: "Sync Online", icon: Video, desc: "YouTube Live / Webinar", color: "red" },
        { value: "ASYNC_ONLINE", label: "Async Online", icon: Monitor, desc: "E-learning Mandiri", color: "blue" },
        { value: "ON_CLASSROOM", label: "Tatap Muka", icon: Users, desc: "Kelas Offline", color: "green" },
        { value: "HYBRID", label: "Hybrid", icon: Shuffle, desc: "Kombinasi Online & Offline", color: "purple" }
    ] as const

    return (
        <div className="space-y-6">
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-4 mb-8">
                {[
                    { id: "upload", label: "Upload KAP" },
                    { id: "review", label: "Review & Edit" },
                    { id: "complete", label: "Selesai" }
                ].map((s, i) => (
                    <div key={s.id} className="flex items-center">
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all",
                            step === s.id
                                ? "bg-blue-600 border-blue-600 text-white"
                                : (["upload", "review", "complete"].indexOf(step) > i)
                                    ? "bg-green-500 border-green-500 text-white"
                                    : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500"
                        )}>
                            {["upload", "review", "complete"].indexOf(step) > i ? (
                                <CheckCircle2 className="w-4 h-4" />
                            ) : (i + 1)}
                        </div>
                        <span className={cn(
                            "ml-2 text-sm font-medium",
                            step === s.id ? "text-blue-600" : "text-slate-500"
                        )}>
                            {s.label}
                        </span>
                        {i < 2 && (
                            <div className={cn(
                                "w-12 h-0.5 mx-4",
                                ["upload", "review", "complete"].indexOf(step) > i
                                    ? "bg-green-500"
                                    : "bg-slate-200 dark:bg-slate-800"
                            )} />
                        )}
                    </div>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {/* Step 1: Upload */}
                {step === "upload" && (
                    <motion.div
                        key="upload"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <Card className="border-slate-200 dark:border-slate-800">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Upload className="w-5 h-5 text-blue-500" />
                                    Upload KAP Document
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* File Upload Area */}
                                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
                                    {uploadedFileName ? (
                                        <div className="flex flex-col items-center">
                                            <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
                                            <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                                                {uploadedFileName}
                                            </p>
                                            <p className="text-xs text-slate-500">File siap diproses</p>
                                        </div>
                                    ) : (
                                        <>
                                            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                                            <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                Upload Dokumen KAP
                                            </p>
                                            <p className="text-sm text-slate-500 mb-4">
                                                Pilih file .docx atau .txt
                                            </p>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        accept=".docx,.txt"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        id="kap-file-upload"
                                        disabled={isProcessing}
                                    />
                                    <Button asChild variant={uploadedFileName ? "outline" : "default"} disabled={isProcessing} className={uploadedFileName ? "" : "bg-blue-600 hover:bg-blue-700"}>
                                        <label htmlFor="kap-file-upload" className="cursor-pointer">
                                            {isProcessing ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Mengolah dengan AI...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-4 h-4 mr-2" />
                                                    {uploadedFileName ? "Pilih File Lain" : "Pilih File KAP"}
                                                </>
                                            )}
                                        </label>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Step 2: Review */}
                {step === "review" && kapData && (
                    <motion.div
                        key="review"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6"
                    >
                        {/* Course Title & Descriptions */}
                        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-blue-500" />
                                    Course Info (Hasil AI)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-slate-500">Judul Kursus</Label>
                                    <Input
                                        value={editableTitle}
                                        onChange={(e) => setEditableTitle(e.target.value)}
                                        className="bg-white dark:bg-slate-950 border-blue-200 dark:border-blue-800 font-bold"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-slate-500">Short Description (Hero)</Label>
                                        <Textarea
                                            value={editableShortDesc}
                                            onChange={(e) => setEditableShortDesc(e.target.value)}
                                            className="bg-white dark:bg-slate-950 border-blue-100 dark:border-blue-900/50 text-sm h-32"
                                            placeholder="Akan ditampilkan di bagian Hero..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-slate-500">Long Description (About)</Label>
                                        <Textarea
                                            value={editableFullDesc}
                                            onChange={(e) => setEditableFullDesc(e.target.value)}
                                            className="bg-white dark:bg-slate-950 border-blue-100 dark:border-blue-900/50 text-sm h-32"
                                            placeholder="Akan ditampilkan di tab 'Tentang Kursus'..."
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Delivery Mode Selector */}
                        <Card className="border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Shuffle className="w-5 h-5 text-purple-500" />
                                    Delivery Mode
                                    {kapData.deliveryMode && (
                                        <Badge variant="outline" className="ml-2 text-xs">
                                            AI: {kapData.deliveryMode.replace('_', ' ')}
                                        </Badge>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-3">
                                    {DELIVERY_MODES.map((mode) => {
                                        const Icon = mode.icon
                                        const isSelected = finalDeliveryMode === mode.value
                                        const isAISuggested = kapData.deliveryMode === mode.value && !deliveryModeOverride
                                        return (
                                            <button
                                                key={mode.value}
                                                onClick={() => setDeliveryModeOverride(mode.value)}
                                                className={cn(
                                                    "p-4 rounded-lg border-2 text-left transition-all",
                                                    isSelected
                                                        ? "border-purple-500 bg-purple-100 dark:bg-purple-900/30"
                                                        : "border-slate-200 dark:border-slate-700 hover:border-purple-300"
                                                )}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Icon className={cn("w-4 h-4", isSelected ? "text-purple-600" : "text-slate-500")} />
                                                    <span className={cn("font-medium text-sm", isSelected ? "text-purple-700 dark:text-purple-300" : "text-slate-700 dark:text-slate-300")}>
                                                        {mode.label}
                                                    </span>
                                                    {isAISuggested && (
                                                        <Badge className="text-[10px] bg-purple-600">AI</Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500">{mode.desc}</p>
                                            </button>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* YouTube URL - only show for sync/hybrid */}
                        {(finalDeliveryMode === "SYNC_ONLINE" || finalDeliveryMode === "HYBRID") && (
                            <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Video className="w-5 h-5 text-red-500" />
                                        YouTube Live URL *
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Input
                                        placeholder="https://youtube.com/live/..."
                                        value={youtubeUrl}
                                        onChange={(e) => setYoutubeUrl(e.target.value)}
                                        className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400"
                                    />
                                    <p className="text-xs text-slate-500 mt-2">
                                        Masukkan URL YouTube Live stream untuk sesi ini
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Advance Organizer Preview */}
                        <Card className="border-slate-200 dark:border-slate-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-blue-500" />
                                    Advance Organizer (Pre-Learning)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-2">
                                        {kapData.advanceOrganizer.title}
                                    </h4>
                                    <div
                                        className="text-sm text-slate-600 dark:text-slate-400 prose prose-sm dark:prose-invert max-w-none 
                                            prose-ul:list-disc prose-ul:ml-4 prose-li:mb-1"
                                        dangerouslySetInnerHTML={{ __html: kapData.advanceOrganizer.content }}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Learning Objectives */}
                        <Card className="border-slate-200 dark:border-slate-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Target className="w-5 h-5 text-green-500" />
                                    Fokus Pembelajaran
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {kapData.learningObjectives.map((obj, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
                                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                                            {obj}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        {/* Questions Preview */}
                        <Card className="border-slate-200 dark:border-slate-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <FileQuestion className="w-5 h-5 text-purple-500" />
                                    Soal Concept Validation ({kapData.conceptValidationQuestions.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {kapData.conceptValidationQuestions.map((q, i) => (
                                        <div key={q.id} className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800">
                                            <p className="font-medium text-sm text-slate-900 dark:text-white mb-2">
                                                {i + 1}. {q.text}
                                            </p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {q.options.map((opt) => (
                                                    <div
                                                        key={opt.id}
                                                        className={cn(
                                                            "text-xs p-2 rounded",
                                                            opt.id === q.correctOptionId
                                                                ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                                                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                                        )}
                                                    >
                                                        {opt.text}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Actions */}
                        <div className="flex gap-4">
                            <Button
                                variant="outline"
                                onClick={() => setStep("upload")}
                                className="flex-1"
                            >
                                Kembali
                            </Button>
                            <Button
                                onClick={handleCreateCourse}
                                disabled={(finalDeliveryMode === "SYNC_ONLINE" || finalDeliveryMode === "HYBRID") && !youtubeUrl || isProcessing}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                                {isProcessing ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                Buat Course
                            </Button>
                        </div>
                    </motion.div>
                )}

                {/* Step 3: Complete */}
                {step === "complete" && createdCourse && (
                    <motion.div
                        key="complete"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10">
                            <CardContent className="p-8 text-center">
                                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                    Sync Course Berhasil Dibuat! 🎉
                                </h2>
                                <p className="text-slate-600 dark:text-slate-400 mb-6">
                                    Course "{kapData?.courseTitle}" telah dibuat dengan status Draft.
                                </p>
                                <div className="flex gap-4 justify-center mb-6">
                                    <Badge className={cn(
                                        "text-white",
                                        finalDeliveryMode === "SYNC_ONLINE" ? "bg-red-600" :
                                            finalDeliveryMode === "ASYNC_ONLINE" ? "bg-blue-600" :
                                                finalDeliveryMode === "ON_CLASSROOM" ? "bg-green-600" : "bg-purple-600"
                                    )}>
                                        <Video className="w-3 h-3 mr-1" />
                                        {finalDeliveryMode.replace('_', ' ')}
                                    </Badge>
                                    <Badge variant="outline">
                                        Draft
                                    </Badge>
                                </div>
                                <div className="flex gap-4 justify-center">
                                    <Button asChild variant="outline">
                                        <Link href="/dashboard/instructor">
                                            Dashboard
                                        </Link>
                                    </Button>
                                    <Button asChild className="bg-blue-600 hover:bg-blue-700">
                                        <Link href={`/courses/${createdCourse.slug}/sync`}>
                                            <ExternalLink className="w-4 h-4 mr-2" />
                                            Lihat Course
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
