"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Globe, FileEdit } from "lucide-react"
import { toast } from "sonner"
import { toggleCoursePublish } from "@/lib/actions/courses"
import { useRouter } from "next/navigation"

interface PublishToggleProps {
    courseId: string
    isPublished: boolean
}

export function PublishToggle({ courseId, isPublished }: PublishToggleProps) {
    const [loading, setLoading] = useState(false)
    const [published, setPublished] = useState(isPublished)
    const router = useRouter()

    async function handleToggle() {
        setLoading(true)

        const result = await toggleCoursePublish(courseId)

        if (result.error) {
            toast.error("Gagal mengubah status", {
                description: result.error,
            })
        } else {
            setPublished(result.isPublished ?? !published)
            toast.success(result.message)
            router.refresh()
        }

        setLoading(false)
    }

    return (
        <div className="flex items-center gap-3">
            {published ? (
                <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
                    <Globe className="w-3 h-3 mr-1" />
                    Published
                </Badge>
            ) : (
                <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30">
                    <FileEdit className="w-3 h-3 mr-1" />
                    Draft
                </Badge>
            )}
            <Button
                variant="outline"
                size="sm"
                onClick={handleToggle}
                disabled={loading}
                className="border-slate-300 dark:border-slate-600"
            >
                {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : published ? (
                    <FileEdit className="w-4 h-4 mr-2" />
                ) : (
                    <Globe className="w-4 h-4 mr-2" />
                )}
                {published ? "Jadikan Draft" : "Publish Kursus"}
            </Button>
        </div>
    )
}
