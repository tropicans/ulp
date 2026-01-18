"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { getPostDetail, addComment, moderatePost } from "@/lib/actions/forums"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
    MessageCircle,
    MessageSquare,
    Pin,
    Lock,
    ArrowLeft,
    Send,
    Clock,
    ShieldCheck,
    MoreVertical,
    Trash,
    Reply
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { UserAvatar } from "@/components/ui/user-avatar"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function PostDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { data: session } = useSession()
    const postId = params.id as string

    const [post, setPost] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [comment, setComment] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        fetchPostDetail()
    }, [postId])

    async function fetchPostDetail() {
        setIsLoading(true)
        const result = await getPostDetail(postId)
        if (result.post) {
            setPost(result.post)
        }
        setIsLoading(false)
    }

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!comment.trim()) return

        setIsSubmitting(true)
        const result = await addComment(postId, comment)
        if (result.success) {
            toast.success("Komentar ditambahkan")
            setComment("")
            fetchPostDetail()
        } else {
            toast.error(result.error || "Gagal menambahkan komentar")
        }
        setIsSubmitting(false)
    }

    const handleModeration = async (action: "pin" | "lock") => {
        const data = action === "pin" ? { isPinned: !post.isPinned } : { isLocked: !post.isLocked }
        const result = await moderatePost(postId, data)
        if (result.success) {
            toast.success("Status post diperbarui")
            fetchPostDetail()
        } else {
            toast.error(result.error || "Gagal memperbarui status")
        }
    }

    const isModerator = session?.user && ["SUPER_ADMIN", "ADMIN_UNIT", "INSTRUCTOR"].includes(session.user.role)

    if (isLoading) return (
        <div className="container mx-auto px-4 py-12 animate-pulse">
            <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded mb-8" />
            <div className="h-[400px] bg-slate-100 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 mb-8" />
            <div className="space-y-4">
                <div className="h-24 bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800" />
                <div className="h-24 bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800" />
            </div>
        </div>
    )

    if (!post) return <div className="text-center py-20 text-slate-500">Diskusi tidak ditemukan</div>

    return (
        <div className="container max-w-4xl mx-auto px-4 py-12">
            <Link href={`/dashboard/forums/${post.forumId}`} className="flex items-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors text-sm mb-6 w-fit group">
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Kembali ke Forum {post.Forum.title}
            </Link>

            {/* Main Post */}
            <Card className={cn(
                "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl rounded-3xl overflow-hidden relative mb-12",
                post.isPinned && "ring-1 ring-blue-500/30 border-blue-400/50 dark:border-blue-900/50 shadow-blue-900/10"
            )}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[120px] -mr-32 -mt-32 rounded-full" />

                <CardHeader className="p-8 pb-4 relative">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            <UserAvatar name={post.User.name} image={post.User.image} className="w-12 h-12 ring-2 ring-slate-200 dark:ring-slate-800" />
                            <div>
                                <h4 className="font-bold text-slate-900 dark:text-white mb-0.5">{post.User.name}</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                                    <Clock className="w-3 h-3" />
                                    {format(new Date(post.createdAt), "d MMMM yyyy, HH:mm", { locale: localeId })}
                                    {post.User.unitKerja && <span>• {post.User.unitKerja}</span>}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {post.isPinned && (
                                <Badge className="bg-blue-600/10 text-blue-400 border-blue-600/20 px-3 py-1 text-[10px] uppercase font-black">
                                    <Pin className="w-3 h-3 mr-1" /> Tersemat
                                </Badge>
                            )}
                            {post.isLocked && (
                                <Badge className="bg-red-600/10 text-red-500 border-red-600/20 px-3 py-1 text-[10px] uppercase font-black">
                                    <Lock className="w-3 h-3 mr-1" /> Terkunci
                                </Badge>
                            )}

                            {isModerator && (
                                <div className="flex gap-1 ml-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                                        onClick={() => handleModeration("pin")}
                                        title={post.isPinned ? "Unpin" : "Pin"}
                                    >
                                        <Pin className={cn("w-4 h-4", post.isPinned && "fill-blue-400 text-blue-400")} />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                                        onClick={() => handleModeration("lock")}
                                        title={post.isLocked ? "Unlock" : "Lock"}
                                    >
                                        <Lock className={cn("w-4 h-4", post.isLocked && "fill-red-500 text-red-500")} />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    <CardTitle className="text-3xl font-black text-slate-900 dark:text-white leading-tight mb-4">
                        {post.title}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-0 relative">
                    <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 mb-10 leading-relaxed text-lg whitespace-pre-wrap">
                        {post.content}
                    </div>

                    <div className="flex items-center gap-4 text-slate-500 border-t border-slate-200 dark:border-slate-800 pt-6">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            <span className="text-sm font-bold">{post.ForumComment.length} Komentar</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Comments List */}
            <div className="space-y-6 mb-12">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 px-2">
                    <Reply className="w-5 h-5 text-blue-500" />
                    Komentar ({post.ForumComment.length})
                </h3>

                {post.ForumComment.length === 0 ? (
                    <div className="text-center py-20 bg-slate-100 dark:bg-slate-900/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 mx-2">
                        <MessageCircle className="w-12 h-12 text-slate-300 dark:text-slate-800 mx-auto mb-3" />
                        <p className="text-slate-500 italic">Belum ada komentar. Jadilah yang pertama menjawab!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {post.ForumComment.map((comment: any) => (
                            <div key={comment.id} className="group flex gap-4 p-6 rounded-3xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                                <UserAvatar name={comment.User.name} image={comment.User.image} className="w-10 h-10 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900 dark:text-white text-sm">{comment.User.name}</span>
                                            {comment.userId === post.userId && (
                                                <Badge className="bg-blue-600/20 text-blue-500 dark:text-blue-400 border-none text-[8px] h-4 px-1.5 uppercase font-bold">OP</Badge>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-wider">
                                            {format(new Date(comment.createdAt), "d MMM, HH:mm", { locale: localeId })}
                                        </span>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">
                                        {comment.content}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Reply Form */}
            {post.isLocked ? (
                <div className="p-8 rounded-3xl bg-red-900/5 border border-red-900/20 flex flex-col items-center justify-center text-center">
                    <Lock className="w-10 h-10 text-red-500 opacity-30 mb-4" />
                    <h4 className="text-lg font-bold text-red-400/80 mb-1">Diskusi Dikunci</h4>
                    <p className="text-slate-500 text-sm">Postingan ini telah dikunci oleh instruktur atau administrator.</p>
                </div>
            ) : (
                <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl rounded-3xl overflow-hidden border-t-4 border-t-blue-600">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-slate-900 dark:text-white text-lg">Tulis Jawaban Anda</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <form onSubmit={handleAddComment}>
                            <Textarea
                                placeholder="Tuliskan komentar atau jawaban Anda di sini..."
                                className="bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-500 text-slate-900 dark:text-white min-h-[120px] rounded-2xl mb-4 p-4 shadow-inner"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                disabled={isSubmitting}
                            />
                            <div className="flex justify-between items-center">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    Harap gunakan bahasa yang sopan dan relevan
                                </p>
                                <Button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 font-bold px-10 rounded-xl h-11 transition-all shadow-lg shadow-blue-900/30"
                                    disabled={isSubmitting || !comment.trim()}
                                >
                                    {isSubmitting ? "Mengirim..." : (
                                        <>
                                            Kirim Komentar
                                            <Send className="w-4 h-4 ml-2" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
