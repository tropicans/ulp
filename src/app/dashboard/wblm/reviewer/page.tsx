"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ClipboardCheck,
    LayoutDashboard,
    MessageSquare,
    Clock,
    ChevronRight,
    User,
    FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getWblmReviewerQueue } from "@/lib/actions/wblm-review";
import { getWblmPrograms } from "@/lib/actions/wblm-program";
import { motion } from "framer-motion";

export default function ReviewerDashboard() {
    const { data: session, status } = useSession();
    const [queue, setQueue] = useState<any[]>([]);
    const [programs, setPrograms] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (status === "unauthenticated") {
            redirect("/login");
        }

        async function fetchData() {
            if (!session?.user?.id) return;

            setIsLoading(true);
            try {
                const [queueResult, programsResult] = await Promise.all([
                    getWblmReviewerQueue(),
                    getWblmPrograms({ role: "reviewer" })
                ]);
                setQueue(queueResult);
                setPrograms(programsResult);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [session, status]);

    if (status === "loading" || isLoading) {
        return (
            <div className="container mx-auto px-4 py-32 flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">
                    Memuat Reviewer Dashboard...
                </p>
            </div>
        );
    }

    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="container mx-auto px-4 py-8 relative">
            {/* Background */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-10"
            >
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-purple-600/10 text-purple-500">
                        <LayoutDashboard className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-purple-500/80">
                        Reviewer Dashboard
                    </span>
                </div>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                    Queue Review
                </h1>
                <p className="text-slate-400 font-medium">
                    Submission yang perlu direview
                </p>
            </motion.div>

            {/* Stats */}
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10"
            >
                <Card className="border-slate-200 dark:border-white/5">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1">Pending Review</p>
                                <p className="text-4xl font-black text-slate-900 dark:text-white">{queue.length}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-500">
                                <ClipboardCheck className="w-7 h-7" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 dark:border-white/5">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1">Program Assigned</p>
                                <p className="text-4xl font-black text-slate-900 dark:text-white">{programs.length}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-500">
                                <MessageSquare className="w-7 h-7" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Review Queue */}
            <Card className="border-slate-200 dark:border-white/5">
                <CardHeader>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <ClipboardCheck className="w-5 h-5 text-purple-500" />
                        Submission Menunggu Review
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {queue.length > 0 ? (
                        queue.map((submission) => (
                            <motion.div key={submission.id} variants={item}>
                                <Link href={`/dashboard/wblm/review/${submission.id}`}>
                                    <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/5 hover:border-purple-300 dark:hover:border-purple-500/30 transition-all group">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors mb-1">
                                                    {submission.Milestone?.name}
                                                </h4>
                                                <p className="text-sm text-slate-500">
                                                    {submission.Milestone?.Program?.title}
                                                </p>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-purple-500" />
                                        </div>
                                        <div className="flex items-center gap-6 text-xs text-slate-500">
                                            <span className="flex items-center gap-1.5">
                                                <User className="w-3.5 h-3.5" />
                                                {submission.Participant?.name}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <FileText className="w-3.5 h-3.5" />
                                                Versi {submission.versionNumber}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                {new Date(submission.createdAt).toLocaleDateString('id-ID', {
                                                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))
                    ) : (
                        <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl">
                            <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                Tidak Ada Review Pending
                            </h3>
                            <p className="text-sm text-slate-400">
                                Semua submission telah direview
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
