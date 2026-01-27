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
    Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { parseKAPDocument, applyKAPToSyncCourse } from "@/lib/actions/kap-parser"
import { SyncCourseConfig } from "@/lib/types/sync-course"
import { KAPData } from "@/lib/types/kap"

interface KAPUploadFormProps {
    courseId: string
    courseName: string
    existingConfig?: SyncCourseConfig | null
}

export function KAPUploadForm({ courseId, courseName, existingConfig }: KAPUploadFormProps) {
    const [step, setStep] = useState<"upload" | "review" | "complete">(existingConfig ? "review" : "upload")
    const [isProcessing, setIsProcessing] = useState(false)
    const [documentText, setDocumentText] = useState("")
    const [youtubeUrl, setYoutubeUrl] = useState(existingConfig?.youtubeStreamUrl || "")

    // Editable fields for review
    const [editableTitle, setEditableTitle] = useState("")
    const [editableShortDesc, setEditableShortDesc] = useState("")
    const [editableFullDesc, setEditableFullDesc] = useState("")

    // Parsed KAP data
    const [kapData, setKapData] = useState<KAPData | null>(existingConfig ? {
        courseTitle: courseName,
        courseDescription: "",
        courseFullDescription: "",
        deliveryMode: "SYNC_ONLINE",
        advanceOrganizer: existingConfig.advanceOrganizer,
        learningObjectives: existingConfig.learningFocus,
        conceptValidationQuestions: existingConfig.conceptValidation.questions
    } : null)

    const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsProcessing(true)

        try {
            // Read file content
            // For DOCX, we'd need a library like mammoth.js
            // For now, support plain text and paste
            if (file.type === "text/plain" || file.name.endsWith(".txt")) {
                const text = await file.text()
                setDocumentText(text)

                // Parse with AI
                const result = await parseKAPDocument(courseId, text)
                if (result.success && result.data) {
                    setKapData(result.data)
                    setEditableTitle(result.data.courseTitle)
                    setEditableShortDesc(result.data.courseDescription)
                    setEditableFullDesc(result.data.courseFullDescription)
                    setStep("review")
                }
            } else {
                // For DOCX, show paste option
                alert("Untuk file DOCX, silakan copy-paste konten dokumen ke text area di bawah.")
            }
        } catch (error) {
            console.error("Error processing file:", error)
        } finally {
            setIsProcessing(false)
        }
    }, [courseId])

    const handleTextParse = useCallback(async () => {
        if (!documentText.trim()) return

        setIsProcessing(true)
        try {
            const result = await parseKAPDocument(courseId, documentText)
            if (result.success && result.data) {
                setKapData(result.data)
                setEditableTitle(result.data.courseTitle)
                setEditableShortDesc(result.data.courseDescription)
                setEditableFullDesc(result.data.courseFullDescription)
                setStep("review")
            }
        } catch (error) {
            console.error("Error parsing:", error)
        } finally {
            setIsProcessing(false)
        }
    }, [courseId, documentText])

    const handleApplyConfig = useCallback(async () => {
        if (!kapData || !youtubeUrl) {
            alert("Pastikan YouTube Live URL sudah diisi")
            return
        }

        setIsProcessing(true)
        try {
            // Use editable values instead of raw kapData
            const updatedKapData: KAPData = {
                ...kapData,
                courseTitle: editableTitle,
                courseDescription: editableShortDesc,
                courseFullDescription: editableFullDesc
            }
            const result = await applyKAPToSyncCourse(courseId, updatedKapData, youtubeUrl)
            if (result.success) {
                setStep("complete")
            } else {
                alert(result.error || "Gagal menyimpan konfigurasi")
            }
        } catch (error) {
            console.error("Error applying config:", error)
        } finally {
            setIsProcessing(false)
        }
    }, [courseId, kapData, youtubeUrl])

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
                                {/* File Upload */}
                                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
                                    <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                        Upload file KAP (.txt) atau paste konten dokumen di bawah
                                    </p>
                                    <input
                                        type="file"
                                        accept=".txt,.docx"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        id="kap-upload"
                                    />
                                    <Button asChild variant="outline" disabled={isProcessing}>
                                        <label htmlFor="kap-upload" className="cursor-pointer">
                                            {isProcessing ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <Upload className="w-4 h-4 mr-2" />
                                            )}
                                            Pilih File
                                        </label>
                                    </Button>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-slate-200 dark:border-slate-800" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-white dark:bg-slate-950 px-2 text-slate-500">atau</span>
                                    </div>
                                </div>

                                {/* Paste Text Area */}
                                <div className="space-y-2">
                                    <Label>Paste Konten KAP</Label>
                                    <Textarea
                                        placeholder="Copy-paste isi dokumen KAP di sini..."
                                        value={documentText}
                                        onChange={(e) => setDocumentText(e.target.value)}
                                        rows={10}
                                        className="font-mono text-sm"
                                    />
                                </div>

                                <Button
                                    onClick={handleTextParse}
                                    disabled={!documentText.trim() || isProcessing}
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Mengolah dengan AI...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            Parse dengan AI
                                        </>
                                    )}
                                </Button>
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
                                    Review Hasil AI
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

                        {/* YouTube URL */}
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

                        {/* Advance Organizer Preview */}
                        <Card className="border-slate-200 dark:border-slate-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-blue-500" />
                                    Advance Organizer (Pre-Learning)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border">
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-2">
                                        {kapData.advanceOrganizer.title}
                                    </h4>
                                    <div
                                        className="text-sm text-slate-600 dark:text-slate-300 prose prose-sm prose-slate dark:prose-invert max-w-none prose-ul:list-disc prose-ul:pl-5 prose-li:my-1 prose-li:marker:text-green-500"
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
                                                {q.options.map((opt: any) => (
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
                                onClick={handleApplyConfig}
                                disabled={!youtubeUrl || isProcessing}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                                {isProcessing ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                Simpan Konfigurasi
                            </Button>
                        </div>
                    </motion.div>
                )}

                {/* Step 3: Complete */}
                {step === "complete" && (
                    <motion.div
                        key="complete"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10">
                            <CardContent className="p-8 text-center">
                                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                    Sync Course Siap!
                                </h2>
                                <p className="text-slate-600 dark:text-slate-400 mb-6">
                                    Konfigurasi berhasil disimpan. Learner dapat mulai mengakses course ini.
                                </p>
                                <Badge className="bg-green-600 text-white">
                                    <Video className="w-3 h-3 mr-1" />
                                    SYNC_ONLINE
                                </Badge>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
