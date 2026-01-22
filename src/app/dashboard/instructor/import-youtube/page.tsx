"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { previewYouTubePlaylist, importYouTubePlaylist } from "@/lib/actions/youtube"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { ArrowLeft, Youtube, Loader2, CheckCircle2, Play, Clock, User } from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"

export default function ImportYouTubePage() {
    const router = useRouter()
    const { data: session } = useSession()
    const [url, setUrl] = useState("")
    const [loading, setLoading] = useState(false)
    const [importing, setImporting] = useState(false)
    const [metadata, setMetadata] = useState<any>(null)

    async function handlePreview() {
        if (!url) return
        setLoading(true)
        const result = await previewYouTubePlaylist(url)
        setLoading(false)

        if (result.error) {
            toast.error(result.error)
        } else {
            setMetadata(result.metadata)
            toast.success("Metadata playlist berhasil diambil!")
        }
    }

    async function handleImport() {
        if (!metadata || !session?.user?.id) return
        setImporting(true)
        const result = await importYouTubePlaylist(url, session.user.id)
        setImporting(false)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Kursus berhasil diimport! Memulai proses AI...")
            router.push(`/dashboard/courses/${result.courseId}/edit`)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-20">
            <div className="container max-w-4xl mx-auto px-4">
                <Link href="/dashboard/instructor" className="flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm mb-6 w-fit group">
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Kembali ke Dashboard
                </Link>

                <div className="flex flex-col gap-6">
                    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
                        <div className="h-2 bg-red-600 w-full" />
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                    <Youtube className="w-6 h-6 text-red-600" />
                                </div>
                                <CardTitle className="text-2xl font-bold">Import dari YouTube</CardTitle>
                            </div>
                            <CardDescription className="text-slate-500 dark:text-slate-400">
                                Ubah playlist YouTube menjadi kursus interaktif dengan AI. Kami akan mengekstrak transkrip, membuat ringkasan, dan menghasilkan kuis otomatis.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Tempel URL Playlist YouTube di sini..."
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="flex-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                />
                                <Button
                                    onClick={handlePreview}
                                    disabled={loading || !url}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Preview"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {metadata && (
                        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-xl mb-1">{metadata.title}</CardTitle>
                                        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {metadata.author}</span>
                                            <span className="flex items-center gap-1"><Play className="w-3 h-3" /> {metadata.totalVideos} Video</span>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleImport}
                                        disabled={importing}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                                    >
                                        {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                        Import Sekarang
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="max-h-[500px] overflow-y-auto">
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {metadata.items.map((item: any, idx: number) => (
                                            <div key={idx} className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-medium text-slate-500">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-medium text-slate-900 dark:text-white truncate">{item.title}</h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" /> {item.duration}
                                                    </p>
                                                </div>
                                                <div className="text-xs font-mono text-slate-400">
                                                    {item.videoId}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center">
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Seluruh video di atas akan diimport sebagai materi kursus. Proses ekstraksi audio dan AI akan berjalan di latar belakang.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
