"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react"
import { exportStatementsToCSV } from "@/lib/actions/xapi-extended-analytics"
import { FilterState } from "./XAPIFilters"

interface ExportButtonsProps {
    filters?: FilterState
}

export function ExportButtons({ filters = {} }: ExportButtonsProps) {
    const [exporting, setExporting] = useState<string | null>(null)

    const handleExportCSV = async () => {
        setExporting("csv")
        try {
            const result = await exportStatementsToCSV({
                dateFrom: filters.dateFrom?.toISOString(),
                dateTo: filters.dateTo?.toISOString(),
                verb: filters.verb,
                courseId: filters.courseId,
                actorEmail: filters.actorEmail
            })

            if (result.csv && result.filename) {
                // Create and download file
                const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" })
                const url = URL.createObjectURL(blob)
                const link = document.createElement("a")
                link.href = url
                link.download = result.filename
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                URL.revokeObjectURL(url)
            }
        } catch (error) {
            console.error("Export failed:", error)
        }
        setExporting(null)
    }

    const handleExportExcel = async () => {
        setExporting("excel")
        // For now, use CSV with .xlsx extension (basic compatibility)
        // Could be enhanced with xlsx library for proper Excel format
        try {
            const result = await exportStatementsToCSV({
                dateFrom: filters.dateFrom?.toISOString(),
                dateTo: filters.dateTo?.toISOString(),
                verb: filters.verb,
                courseId: filters.courseId,
                actorEmail: filters.actorEmail
            })

            if (result.csv) {
                const filename = result.filename.replace(".csv", ".xlsx")
                const blob = new Blob([result.csv], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
                const url = URL.createObjectURL(blob)
                const link = document.createElement("a")
                link.href = url
                link.download = filename
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                URL.revokeObjectURL(url)
            }
        } catch (error) {
            console.error("Export failed:", error)
        }
        setExporting(null)
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={exporting !== null}>
                    {exporting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Download className="w-4 h-4 mr-2" />
                    )}
                    Export
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV} disabled={exporting !== null}>
                    <FileText className="w-4 h-4 mr-2" />
                    Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel} disabled={exporting !== null}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export Excel
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
