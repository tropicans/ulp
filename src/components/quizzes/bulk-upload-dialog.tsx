"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Upload, FileSpreadsheet, Download, Loader2, AlertCircle, CheckCircle, FileJson } from "lucide-react"
import { toast } from "sonner"
import * as XLSX from "xlsx"

interface BulkUploadDialogProps {
    quizId: string
    quizType: string
    onSuccess: () => void
}

// Excel template data
const EXCEL_TEMPLATE = [
    {
        "Soal": "Apa kepanjangan dari HTML?",
        "Pilihan A": "Hyper Text Markup Language",
        "Pilihan B": "High Tech Modern Language",
        "Pilihan C": "Hyper Transfer Markup Language",
        "Pilihan D": "Home Tool Markup Language",
        "Jawaban Benar": "A",
        "Poin": 1,
        "Penjelasan": "HTML adalah singkatan dari Hyper Text Markup Language"
    },
    {
        "Soal": "Manakah yang merupakan bahasa pemrograman?",
        "Pilihan A": "HTML",
        "Pilihan B": "CSS",
        "Pilihan C": "JavaScript",
        "Pilihan D": "XML",
        "Jawaban Benar": "C",
        "Poin": 2,
        "Penjelasan": "JavaScript adalah bahasa pemrograman"
    }
]

export function BulkUploadDialog({ quizId, quizType, onSuccess }: BulkUploadDialogProps) {
    const [open, setOpen] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [syncToPaired, setSyncToPaired] = useState(true)
    const [previewData, setPreviewData] = useState<any[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const isPretestOrPosttest = quizType === 'PRETEST' || quizType === 'POSTTEST'

    const handleDownloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet(EXCEL_TEMPLATE)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Template Soal")

        // Set column widths
        ws['!cols'] = [
            { wch: 50 }, // Soal
            { wch: 30 }, // Pilihan A
            { wch: 30 }, // Pilihan B
            { wch: 30 }, // Pilihan C
            { wch: 30 }, // Pilihan D
            { wch: 15 }, // Jawaban Benar
            { wch: 8 },  // Poin
            { wch: 40 }, // Penjelasan
        ]

        XLSX.writeFile(wb, "template-soal-quiz.xlsx")
    }

    const parseExcelFile = (file: File): Promise<any[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer)
                    const workbook = XLSX.read(data, { type: 'array' })
                    const sheetName = workbook.SheetNames[0]
                    const worksheet = workbook.Sheets[sheetName]
                    const jsonData = XLSX.utils.sheet_to_json(worksheet)

                    // Convert Excel format to API format
                    const questions = jsonData.map((row: any) => {
                        const answerMap: { [key: string]: number } = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 }
                        const answer = String(row['Jawaban Benar'] || '').toUpperCase().trim()

                        return {
                            text: row['Soal'] || '',
                            options: [
                                row['Pilihan A'] || '',
                                row['Pilihan B'] || '',
                                row['Pilihan C'] || '',
                                row['Pilihan D'] || '',
                            ].filter(opt => opt !== ''),
                            correctIndex: answerMap[answer] ?? 0,
                            points: parseInt(row['Poin']) || 1,
                            explanation: row['Penjelasan'] || null
                        }
                    })

                    resolve(questions)
                } catch (err) {
                    reject(new Error("Gagal membaca file Excel"))
                }
            }
            reader.onerror = () => reject(new Error("Gagal membaca file"))
            reader.readAsArrayBuffer(file)
        })
    }

    const parseJsonFile = (file: File): Promise<any[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string
                    const data = JSON.parse(content)
                    if (!Array.isArray(data)) {
                        reject(new Error("Format tidak valid. File harus berisi array soal."))
                        return
                    }
                    resolve(data)
                } catch (err) {
                    reject(new Error("Gagal membaca file JSON"))
                }
            }
            reader.onerror = () => reject(new Error("Gagal membaca file"))
            reader.readAsText(file)
        })
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setError(null)
        setPreviewData(null)

        try {
            let questions: any[]

            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                questions = await parseExcelFile(file)
            } else if (file.name.endsWith('.json')) {
                questions = await parseJsonFile(file)
            } else {
                setError("Format file tidak didukung. Gunakan .xlsx atau .json")
                return
            }

            if (questions.length === 0) {
                setError("File tidak berisi soal.")
                return
            }

            // Validate questions
            for (let i = 0; i < questions.length; i++) {
                const q = questions[i]
                if (!q.text || q.text.trim() === '') {
                    setError(`Baris ${i + 2}: Kolom 'Soal' tidak boleh kosong`)
                    return
                }
                if (!q.options || q.options.length < 2) {
                    setError(`Baris ${i + 2}: Minimal 2 pilihan jawaban diperlukan`)
                    return
                }
            }

            setPreviewData(questions)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal membaca file")
        }
    }

    const handleUpload = async () => {
        if (!previewData) return

        setUploading(true)
        setError(null)

        try {
            const response = await fetch("/api/bulk-upload-questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    quizId,
                    questions: previewData,
                    syncToPaired: isPretestOrPosttest ? syncToPaired : false
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Gagal upload soal")
            }

            toast.success(data.message)
            setOpen(false)
            setPreviewData(null)
            onSuccess()
        } catch (err) {
            const message = err instanceof Error ? err.message : "Gagal upload soal"
            setError(message)
        } finally {
            setUploading(false)
        }
    }

    const handleClose = () => {
        setOpen(false)
        setPreviewData(null)
        setError(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    return (
        <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                >
                    <Upload className="w-4 h-4 mr-2" />
                    Bulk Upload
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                        Bulk Upload Soal
                    </DialogTitle>
                    <DialogDescription>
                        Upload soal dalam format <strong>Excel (.xlsx)</strong> atau JSON. Download template untuk melihat format yang benar.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Download Template */}
                    <Button
                        variant="outline"
                        onClick={handleDownloadTemplate}
                        className="w-full justify-start bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Download Template Excel (.xlsx)
                    </Button>

                    {/* File Input */}
                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-6 text-center hover:border-emerald-400 transition-colors">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.json"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="bulk-upload-input"
                        />
                        <label
                            htmlFor="bulk-upload-input"
                            className="cursor-pointer flex flex-col items-center gap-2"
                        >
                            <div className="flex gap-2">
                                <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
                                <FileJson className="w-8 h-8 text-blue-400" />
                            </div>
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                Klik untuk pilih file <strong>.xlsx</strong> atau <strong>.json</strong>
                            </span>
                        </label>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Preview */}
                    {previewData && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
                                <CheckCircle className="w-4 h-4" />
                                <span><strong>{previewData.length}</strong> soal siap diupload</span>
                            </div>

                            {/* Sync Option for Pretest/Posttest */}
                            {isPretestOrPosttest && (
                                <div className="flex items-center space-x-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                    <Checkbox
                                        id="sync-paired"
                                        checked={syncToPaired}
                                        onCheckedChange={(checked) => setSyncToPaired(checked as boolean)}
                                    />
                                    <label
                                        htmlFor="sync-paired"
                                        className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer"
                                    >
                                        Sinkronkan ke {quizType === 'PRETEST' ? 'Posttest' : 'Pretest'}
                                    </label>
                                </div>
                            )}

                            {/* Preview List */}
                            <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-200 dark:divide-slate-700">
                                {previewData.slice(0, 5).map((q, i) => (
                                    <div key={i} className="p-2 text-sm">
                                        <span className="text-emerald-500 font-medium">#{i + 1}</span>{' '}
                                        <span className="text-slate-700 dark:text-slate-300 line-clamp-1">
                                            {q.text}
                                        </span>
                                    </div>
                                ))}
                                {previewData.length > 5 && (
                                    <div className="p-2 text-sm text-slate-500 text-center">
                                        ... dan {previewData.length - 5} soal lainnya
                                    </div>
                                )}
                            </div>

                            {/* Upload Button */}
                            <Button
                                onClick={handleUpload}
                                disabled={uploading}
                                className="w-full bg-emerald-600 hover:bg-emerald-700"
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Mengupload...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4 mr-2" />
                                        Upload {previewData.length} Soal
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
