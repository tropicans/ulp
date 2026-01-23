"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Search,
    Library,
    Video,
    FileText,
    ExternalLink,
    Plus,
    Loader2,
    Calendar,
    BookOpen
} from "lucide-react"
import { getLibraryLessons, LibraryLesson } from "@/lib/actions/library"
import { addLessonFromLibrary } from "@/lib/actions/modules"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface LessonLibraryProps {
    moduleId: string
}

export function LessonLibrary({ moduleId }: LessonLibraryProps) {
    const [open, setOpen] = useState(false)
    const [lessons, setLessons] = useState<LibraryLesson[]>([])
    const [loading, setLoading] = useState(false)
    const [adding, setAdding] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const router = useRouter()

    useEffect(() => {
        if (open) {
            fetchLessons()
        }
    }, [open, searchQuery])

    async function fetchLessons() {
        setLoading(true)
        try {
            const data = await getLibraryLessons(searchQuery)
            setLessons(data)
        } catch (error) {
            toast.error("Gagal mengambil data library")
        } finally {
            setLoading(false)
        }
    }

    async function handleAdd(lesson: LibraryLesson) {
        setAdding(lesson.id)
        try {
            const result = await addLessonFromLibrary(moduleId, lesson.id)
            if (result.success) {
                toast.success(`Berhasil menambahkan "${lesson.title}"`)
                setOpen(false)
                router.refresh()
            } else {
                toast.error(result.error || "Gagal menambahkan lesson")
            }
        } catch (error) {
            toast.error("Terjadi kesalahan")
        } finally {
            setAdding(null)
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case "VIDEO": return <Video className="w-4 h-4" />
            case "DOCUMENT": return <FileText className="w-4 h-4" />
            default: return <BookOpen className="w-4 h-4" />
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-all">
                    <Library className="w-4 h-4 mr-2" />
                    Ambil dari Library
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col p-6">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <Library className="w-6 h-6 text-blue-500" />
                        Lesson Library
                    </DialogTitle>
                    <DialogDescription>
                        Cari dan gunakan kembali materi (lesson) yang sudah ada di platform untuk kursus kustom Anda.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Cari judul materi, topik, atau kursus..."
                        className="pl-10 h-12 rounded-xl bg-slate-100 dark:bg-slate-800/50 border-transparent focus:border-blue-500 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                            <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-500" />
                            <p className="font-medium">Mencari di library...</p>
                        </div>
                    ) : lessons.length > 0 ? (
                        lessons.map((lesson) => (
                            <div
                                key={lesson.id}
                                className="group p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-blue-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all flex items-center justify-between gap-4"
                            >
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-blue-500 group-hover:bg-blue-500/10 transition-colors">
                                        {getIcon(lesson.contentType)}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h5 className="font-bold text-slate-900 dark:text-white leading-tight">
                                                {lesson.title}
                                            </h5>
                                            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 border-transparent">
                                                {lesson.contentType}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <BookOpen className="w-3 h-3" />
                                                {lesson.courseTitle}
                                            </span>
                                            {lesson.duration && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {lesson.duration} menit
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => handleAdd(lesson)}
                                    disabled={adding === lesson.id}
                                    className="rounded-lg font-bold px-4 hover:scale-105 active:scale-95 transition-all"
                                >
                                    {adding === lesson.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Tambah
                                        </>
                                    )}
                                </Button>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
                                <Search className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tidak ada hasil</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Coba kata kunci lain atau browse kategori materi.</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
