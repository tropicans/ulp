"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Award, Download, Loader2 } from "lucide-react"
import { downloadCertificatePDF, generateCourseCertificate } from "@/lib/actions/certificates"
import { toast } from "sonner"

interface CertificateButtonProps {
    courseId: string
    courseTitle: string
}

export function CertificateButton({ courseId, courseTitle }: CertificateButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false)

    const handleDownload = async () => {
        setIsGenerating(true)
        try {
            // 1. Ensure certificate record exists
            const genResult = await generateCourseCertificate(courseId)
            if ("error" in genResult) {
                toast.error(genResult.error)
                return
            }

            // 2. Generate PDF
            const pdfResult = await downloadCertificatePDF(genResult.certificateId!)
            if ("error" in pdfResult) {
                toast.error(pdfResult.error)
                return
            }

            // 3. Trigger download
            const linkSource = `data:application/pdf;base64,${pdfResult.pdfBase64}`
            const downloadLink = document.createElement("a")
            const fileName = `Sertifikat_${courseTitle.replace(/\s+/g, '_')}.pdf`

            downloadLink.href = linkSource
            downloadLink.download = fileName
            downloadLink.click()

            toast.success("Sertifikat berhasil diunduh!")
        } catch (error) {
            console.error(error)
            toast.error("Gagal mengunduh sertifikat")
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <Button
            onClick={handleDownload}
            disabled={isGenerating}
            className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black rounded-xl h-10 px-6 gap-2 shadow-lg shadow-yellow-900/20"
        >
            {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <Award className="w-4 h-4" />
            )}
            UNDUH SERTIFIKAT
        </Button>
    )
}
