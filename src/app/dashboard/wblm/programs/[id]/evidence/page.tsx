"use client";

import { useSession } from "next-auth/react";
import { redirect, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    Package,
    FileText,
    CheckCircle2,
    Download,
    Calendar,
    Target,
    MessageSquare,
    Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getWblmEvidencePackage } from "@/lib/actions/wblm-evidence";
import { motion } from "framer-motion";
import { WblmEvidenceStatus } from "@/generated/prisma";

export default function EvidencePackagePage() {
    const { data: session, status } = useSession();
    const params = useParams();
    const programId = params.id as string;

    const [evidence, setEvidence] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (status === "unauthenticated") {
            redirect("/login");
        }

        async function fetchData() {
            if (!session?.user?.id || !programId) return;

            setIsLoading(true);
            try {
                const result = await getWblmEvidencePackage(programId);
                if (result && !("error" in result)) {
                    setEvidence(result);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [session, status, programId]);

    if (status === "loading" || isLoading) {
        return (
            <div className="container mx-auto px-4 py-32 flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">
                    Memuat Evidence Package...
                </p>
            </div>
        );
    }

    const getStatusBadge = (status: WblmEvidenceStatus) => {
        const styles = {
            [WblmEvidenceStatus.NOT_READY]: { bg: "bg-slate-100 text-slate-600", label: "Belum Siap" },
            [WblmEvidenceStatus.READY]: { bg: "bg-amber-100 text-amber-600", label: "Siap" },
            [WblmEvidenceStatus.PUBLISHED]: { bg: "bg-emerald-100 text-emerald-600", label: "Terbit" },
            [WblmEvidenceStatus.EXPORTED]: { bg: "bg-blue-100 text-blue-500", label: "Diexport" }
        };
        const style = styles[status] || styles[WblmEvidenceStatus.NOT_READY];
        return (
            <Badge className={cn("font-bold text-xs uppercase tracking-wider", style.bg)}>
                {style.label}
            </Badge>
        );
    };

    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl relative">
            {/* Background */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Back Button */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <Button asChild variant="ghost" className="mb-4 -ml-2">
                    <Link href={`/dashboard/wblm/programs/${programId}`}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Kembali ke Program
                    </Link>
                </Button>
            </motion.div>

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                            <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                                Evidence Package
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                Kompilasi semua artifact dan hasil belajar Anda
                            </p>
                        </div>
                    </div>
                    {evidence && getStatusBadge(evidence.status)}
                </div>
            </motion.div>

            {evidence ? (
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="space-y-6"
                >
                    {/* Summary Stats */}
                    <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="border-slate-200 dark:border-white/5">
                            <CardContent className="p-4 text-center">
                                <Target className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                                <p className="text-2xl font-black text-slate-900 dark:text-white">
                                    {evidence.milestonesCompleted || 0}
                                </p>
                                <p className="text-xs text-slate-500">Milestone Selesai</p>
                            </CardContent>
                        </Card>
                        <Card className="border-slate-200 dark:border-white/5">
                            <CardContent className="p-4 text-center">
                                <FileText className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                                <p className="text-2xl font-black text-slate-900 dark:text-white">
                                    {evidence.artifactsCount || 0}
                                </p>
                                <p className="text-xs text-slate-500">Artifact</p>
                            </CardContent>
                        </Card>
                        <Card className="border-slate-200 dark:border-white/5">
                            <CardContent className="p-4 text-center">
                                <CheckCircle2 className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                                <p className="text-2xl font-black text-slate-900 dark:text-white">
                                    {evidence.reviewsCount || 0}
                                </p>
                                <p className="text-xs text-slate-500">Review</p>
                            </CardContent>
                        </Card>
                        <Card className="border-slate-200 dark:border-white/5">
                            <CardContent className="p-4 text-center">
                                <Calendar className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                    {evidence.publishedAt
                                        ? new Date(evidence.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                        : "-"
                                    }
                                </p>
                                <p className="text-xs text-slate-500">Tanggal Terbit</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Milestones Summary */}
                    <motion.div variants={item}>
                        <Card className="border-slate-200 dark:border-white/5">
                            <CardHeader>
                                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <Target className="w-4 h-4" />
                                    Milestone yang Diselesaikan
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {evidence.milestones?.map((milestone: any) => (
                                    <div
                                        key={milestone.id}
                                        className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50"
                                    >
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-900 dark:text-white">
                                                {milestone.name}
                                            </h4>
                                            <p className="text-sm text-slate-500 truncate">
                                                {milestone.submissions?.length || 0} submissions
                                            </p>
                                        </div>
                                        {milestone.completedAt && (
                                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(milestone.completedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                            </span>
                                        )}
                                    </div>
                                )) || (
                                        <p className="text-center text-slate-400 py-8">Belum ada milestone selesai</p>
                                    )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Reflection */}
                    {evidence.reflection && (
                        <motion.div variants={item}>
                            <Card className="border-slate-200 dark:border-white/5">
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4" />
                                        Refleksi Akhir
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                            {typeof evidence.reflection.contentRichtext === 'string'
                                                ? evidence.reflection.contentRichtext
                                                : JSON.stringify(evidence.reflection.contentRichtext, null, 2)
                                            }
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Actions */}
                    {(evidence.status === WblmEvidenceStatus.PUBLISHED || evidence.status === WblmEvidenceStatus.EXPORTED) && (
                        <motion.div variants={item} className="flex gap-4">
                            <Button variant="outline" className="flex-1">
                                <Download className="w-4 h-4 mr-2" />
                                Download PDF
                            </Button>
                        </motion.div>
                    )}
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <Card className="border-2 border-dashed border-slate-200 dark:border-white/5">
                        <CardContent className="py-16 text-center">
                            <Package className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                Evidence Package Belum Tersedia
                            </h3>
                            <p className="text-sm text-slate-400 max-w-md mx-auto">
                                Evidence package akan dibuat secara otomatis setelah Anda menyelesaikan semua milestone dan refleksi akhir.
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </div>
    );
}
