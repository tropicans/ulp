"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, RefreshCw, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface SyncTitlesButtonProps {
    moduleId: string
}

export function RefineAllTitlesButton({ moduleId }: SyncTitlesButtonProps) {
    const [loadingRefine, setLoadingRefine] = useState(false)
    const [loadingSync, setLoadingSync] = useState(false)
    const router = useRouter()

    async function handleRefineAI() {
        if (!confirm("Generate judul baru dengan AI? Ini akan mengupdate YtPlaylistItem.refinedTitle.")) {
            return
        }

        setLoadingRefine(true)

        try {
            const response = await fetch("/api/refine-lesson-title", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ moduleId })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Gagal refine judul")
            }

            toast.success(data.message)

            // Ask to sync after refine
            if (confirm("Judul berhasil di-refine. Sync ke Lesson.title sekarang?")) {
                await handleSync()
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Gagal refine judul")
        } finally {
            setLoadingRefine(false)
        }
    }

    async function handleSync() {
        setLoadingSync(true)

        try {
            const response = await fetch("/api/sync-lesson-titles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ moduleId })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Gagal sync judul")
            }

            toast.success(data.message)
            router.refresh()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Gagal sync judul")
        } finally {
            setLoadingSync(false)
        }
    }

    const isLoading = loadingRefine || loadingSync

    return (
        <div className="flex items-center gap-1">
            <Button
                variant="outline"
                size="sm"
                onClick={handleRefineAI}
                disabled={isLoading}
                className="h-7 px-2 text-xs border-purple-500/50 text-purple-500 hover:bg-purple-500/10"
            >
                {loadingRefine ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                    <>
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI
                    </>
                )}
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={isLoading}
                className="h-7 px-2 text-xs border-blue-500/50 text-blue-500 hover:bg-blue-500/10"
            >
                {loadingSync ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                    <>
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Sync
                    </>
                )}
            </Button>
        </div>
    )
}


