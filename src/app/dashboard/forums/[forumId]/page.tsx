"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { getForumPosts, createPost } from "@/lib/actions/forums"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    MessageCircle,
    Pin,
    Lock,
    ArrowLeft,
    Plus,
    User as UserIcon,
    Clock,
    MessageSquare,
    ChevronRight,
    Search
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { UserAvatar } from "@/components/ui/user-avatar"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function ForumDetailPage() {
    const params = useParams()
    const forumId = params.forumId as string

    const [forum, setForum] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [search, setSearch] = useState("")

    useEffect(() => {
        fetchPosts()
    }, [forumId])

    async function fetchPosts() {
        setIsLoading(true)
        const result = await getForumPosts(forumId)
        if (result.forum) {
            setForum(result.forum)
        }
        setIsLoading(false)
    }

    const handleCreatePost = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const title = formData.get("title") as string
        const content = formData.get("content") as string

        const result = await createPost(forumId, title, content)
        if (result.success) {
            toast.success("Diskusi berhasil dibuat")
            setIsCreateOpen(false)
            fetchPosts()
        } else {
            toast.error(result.error || "Gagal membuat diskusi")
        }
    }

    const filteredPosts = forum?.ForumPost.filter((p: any) =>
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.content.toLowerCase().includes(search.toLowerCase()) ||
        p.User.name.toLowerCase().includes(search.toLowerCase())
    )

    if (isLoading) return (
        <div className="container mx-auto px-4 py-12 animate-pulse">
            <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded mb-8" />
            <div className="space-y-4">
                {Array(5).fill(0).map((_, i) => (
                    <div key={i} className="h-32 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800" />
                ))}
            </div>
        </div>
    )

    if (!forum) return <div className="text-center py-20 text-slate-500">Forum tidak ditemukan</div>

    return (
        <div className="container mx-auto px-4 py-12">
            <Link href="/dashboard/forums" className="flex items-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors text-sm mb-6 w-fit group">
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Kembali ke Daftar Forum
            </Link>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{forum.title}</h1>
                    <p className="text-slate-500 dark:text-slate-400">{forum.description || "Ruang diskusi peserta diklat"}</p>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 font-bold rounded-xl px-6 h-12 shadow-lg shadow-blue-900/20">
                            <Plus className="w-5 h-5 mr-2" />
                            Mulai Diskusi Baru
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white sm:max-w-[600px]">
                        <form onSubmit={handleCreatePost}>
                            <DialogHeader>
                                <DialogTitle>Buat Diskusi Baru</DialogTitle>
                                <DialogDescription className="text-slate-500">
                                    Bagikan pertanyaan, ide, atau informasi kepada peserta lain.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-500 dark:text-slate-400">Judul Diskusi</label>
                                    <Input
                                        name="title"
                                        placeholder="Tuliskan subjek diskusi..."
                                        className="bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-500 text-slate-900 dark:text-white"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-500 dark:text-slate-400">Konten / Isi</label>
                                    <Textarea
                                        name="content"
                                        placeholder="Jelaskan secara detail apa yang ingin Anda diskusikan..."
                                        className="bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-500 text-slate-900 dark:text-white min-h-[150px]"
                                        required
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Batal</Button>
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 font-bold px-8">Kirim Post</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filter & Search */}
            <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <Input
                    placeholder="Cari topik diskusi, pertanyaan, atau nama peserta..."
                    className="pl-12 h-14 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl focus:ring-blue-500 shadow-xl shadow-black/10 dark:shadow-black/20"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Posts List */}
            <div className="space-y-4">
                {filteredPosts.length === 0 ? (
                    <div className="text-center py-20 bg-slate-100 dark:bg-slate-900/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                        <MessageSquare className="w-16 h-16 text-slate-300 dark:text-slate-800 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-500 dark:text-slate-400 mb-2">Belum ada diskusi</h3>
                        <p className="text-slate-400 dark:text-slate-600">Klik tombol "Mulai Diskusi Baru" untuk mengawali percakapan.</p>
                    </div>
                ) : (
                    filteredPosts.map((post: any) => (
                        <Link href={`/dashboard/forums/posts/${post.id}`} key={post.id} className="block group">
                            <Card className={cn(
                                "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 backdrop-blur hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-blue-500/40 transition-all rounded-2xl shadow-lg relative",
                                post.isPinned && "border-blue-400/50 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/5 ring-1 ring-blue-500/20"
                            )}>
                                {post.isPinned && (
                                    <div className="absolute top-4 right-4 text-blue-400 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded border border-blue-400/20">
                                        <Pin className="w-3 h-3" /> Pinned
                                    </div>
                                )}
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-4">
                                        <UserAvatar name={post.User.name} image={post.User.image} className="w-10 h-10 ring-1 ring-slate-800" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-slate-900 dark:text-white text-lg truncate group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                                                    {post.title}
                                                </h3>
                                                {post.isLocked && <Lock className="w-3.5 h-3.5 text-red-500" />}
                                            </div>
                                            <p className="text-sm text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                                                {post.content}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                <div className="flex items-center gap-1.5">
                                                    <UserIcon className="w-3 h-3" /> {post.User.name}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3 h-3" /> {format(new Date(post.createdAt), "d MMM yyyy", { locale: localeId })}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-blue-400">
                                                    <MessageCircle className="w-3 h-3" /> {post._count.ForumComment} Komentar
                                                </div>
                                            </div>
                                        </div>
                                        <div className="self-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                                                <ChevronRight className="w-6 h-6" />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))
                )}
            </div>
        </div>
    )
}
