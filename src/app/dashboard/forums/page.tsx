"use client"

import { useState, useEffect } from "react"
import { getForums } from "@/lib/actions/forums"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    MessageCircle,
    ArrowRight,
    Users,
    MessageSquare,
    BookOpen,
    ExternalLink,
    Search
} from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function ForumsPage() {
    const [forums, setForums] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState("")

    useEffect(() => {
        fetchForums()
    }, [])

    async function fetchForums() {
        setIsLoading(true)
        const result = await getForums()
        if (result.forums) {
            setForums(result.forums)
        }
        setIsLoading(false)
    }

    const filteredForums = forums.filter(f =>
        f.title.toLowerCase().includes(search.toLowerCase()) ||
        f.Course?.title.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-900/20">
                            <MessageCircle className="w-8 h-8 text-white" />
                        </div>
                        Forum Diskusi
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Ruang kolaborasi dan tanya jawab antar peserta dan instruktur</p>
                </div>
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <Input
                        placeholder="Cari forum atau mata diklat..."
                        className="pl-10 h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-blue-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-900/50 animate-pulse border border-slate-200 dark:border-slate-800" />
                    ))
                ) : filteredForums.length === 0 ? (
                    <div className="col-span-full py-20 text-center">
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-800" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Tidak ada forum ditemukan</h3>
                        <p className="text-slate-500 italic">Coba gunakan kata kunci pencarian yang berbeda</p>
                    </div>
                ) : (
                    filteredForums.map((forum) => (
                        <Card
                            key={forum.id}
                            className="group border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500/50 transition-all shadow-xl overflow-hidden relative"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-3xl -mr-12 -mt-12 rounded-full" />
                            <CardHeader className="pb-4 relative">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge className="bg-blue-500/10 text-blue-500 dark:text-blue-400 border-blue-500/20">
                                        Forum {forum.Course ? "Mata Diklat" : "Umum"}
                                    </Badge>
                                </div>
                                <CardTitle className="text-xl text-slate-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors line-clamp-1">{forum.title}</CardTitle>
                                {forum.Course && (
                                    <CardDescription className="flex items-center gap-1.5 text-slate-500 font-medium">
                                        <BookOpen className="w-3.5 h-3.5" />
                                        {forum.Course.title}
                                    </CardDescription>
                                )}
                            </CardHeader>
                            <CardContent className="relative">
                                <div className="flex items-center gap-6 mb-6">
                                    <div className="flex flex-col">
                                        <span className="text-2xl font-black text-slate-900 dark:text-white">{forum._count.ForumPost}</span>
                                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Diskusi</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-2xl font-black text-slate-900 dark:text-white">
                                            {/* Placeholder for total members, would need another count in real usage */}
                                            {Math.floor(Math.random() * 50) + 10}
                                        </span>
                                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Aktif</span>
                                    </div>
                                </div>

                                <Link href={`/dashboard/forums/${forum.id}`}>
                                    <Button className="w-full bg-slate-200 dark:bg-slate-800 hover:bg-blue-600 text-slate-900 dark:text-white hover:text-white font-bold rounded-xl h-12 transition-all group-hover:shadow-lg group-hover:shadow-blue-900/20">
                                        Masuk Forum
                                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
