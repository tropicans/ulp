"use client";

import { useSession } from "next-auth/react";
import { redirect, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    ArrowLeft,
    Target,
    FileText,
    Clock,
    CheckCircle2,
    AlertCircle,
    Upload,
    MessageSquare,
    ChevronRight,
    Calendar,
    User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getWblmProgramById } from "@/lib/actions/wblm-program";
import { getWblmParticipantTimeline } from "@/lib/actions/wblm-submission";
import { motion } from "framer-motion";
import { WblmMilestoneStatus, WblmProgramStatus } from "@/generated/prisma";

export default function WblmProgramDetailPage() {
    const { data: session, status } = useSession();
    const params = useParams();
    const programId = params.id as string;

    const [program, setProgram] = useState<any>(null);
    const [timeline, setTimeline] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (status === "unauthenticated") {
            redirect("/login");
        }

        async function fetchData() {
            if (!session?.user?.id || !programId) return;

            setIsLoading(true);
            try {
                const [programResult, timelineResult] = await Promise.all([
                    getWblmProgramById(programId),
                    getWblmParticipantTimeline(programId)
                ]);
                setProgram(programResult);
                setTimeline(timelineResult);
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
                    Memuat Detail Program...
                </p>
            </div>
        );
    }

    if (!program) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                    Program Tidak Ditemukan
                </h1>
                <Button asChild variant="outline">
                    <Link href="/dashboard/wblm">Kembali ke Dashboard</Link>
                </Button>
            </div>
        );
    }

    const getStatusIcon = (status: WblmMilestoneStatus) => {
        const icons = {
            [WblmMilestoneStatus.NOT_STARTED]: <Clock className="w-5 h-5 text-slate-400" />,
            [WblmMilestoneStatus.IN_PROGRESS]: <AlertCircle className="w-5 h-5 text-blue-500" />,
            [WblmMilestoneStatus.SUBMITTED]: <Upload className="w-5 h-5 text-amber-500" />,
            [WblmMilestoneStatus.RESUBMITTED]: <Upload className="w-5 h-5 text-amber-500" />,
            [WblmMilestoneStatus.UNDER_REVIEW]: <MessageSquare className="w-5 h-5 text-purple-500" />,
            [WblmMilestoneStatus.REVISION_REQUESTED]: <AlertCircle className="w-5 h-5 text-orange-500" />,
            [WblmMilestoneStatus.APPROVED_FINAL]: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
            [WblmMilestoneStatus.LOCKED]: <CheckCircle2 className="w-5 h-5 text-slate-500" />,
        };
        return icons[status] || icons[WblmMilestoneStatus.NOT_STARTED];
    };

    const getStatusLabel = (status: WblmMilestoneStatus) => {
        const labels = {
            [WblmMilestoneStatus.NOT_STARTED]: "Belum Dimulai",
            [WblmMilestoneStatus.IN_PROGRESS]: "Sedang Dikerjakan",
            [WblmMilestoneStatus.SUBMITTED]: "Menunggu Review",
            [WblmMilestoneStatus.RESUBMITTED]: "Revisi Disubmit",
            [WblmMilestoneStatus.UNDER_REVIEW]: "Sedang Direview",
            [WblmMilestoneStatus.REVISION_REQUESTED]: "Perlu Revisi",
            [WblmMilestoneStatus.APPROVED_FINAL]: "Disetujui",
            [WblmMilestoneStatus.LOCKED]: "Terkunci",
        };
        return labels[status] || "Tidak Diketahui";
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
        <div className="container mx-auto px-4 py-8 relative">
            {/* Background */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Back Button */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <Button asChild variant="ghost" className="mb-4 -ml-2 text-slate-600 dark:text-slate-400">
                    <Link href="/dashboard/wblm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Kembali
                    </Link>
                </Button>
            </motion.div>

            {/* Program Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
                            {program.title}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 max-w-2xl">
                            {program.description || "Tidak ada deskripsi"}
                        </p>
                    </div>
                    <Badge className={cn(
                        "font-bold text-xs uppercase tracking-wider px-3 py-1",
                        program.status === WblmProgramStatus.RUNNING && "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                    )}>
                        {program.status}
                    </Badge>
                </div>

                {/* Progress Bar */}
                {timeline && (
                    <div className="mt-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-slate-700 dark:text-white">
                                Progress Keseluruhan
                            </span>
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                {timeline.progress.completed}/{timeline.progress.total} Milestone ({timeline.progress.percentage}%)
                            </span>
                        </div>
                        <Progress value={timeline.progress.percentage} className="h-3" />
                    </div>
                )}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Milestones Timeline */}
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="lg:col-span-2 space-y-4"
                >
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                        <Target className="w-5 h-5 text-emerald-500" />
                        Timeline Milestone
                    </h2>

                    {timeline?.milestones?.map((milestone: any, index: number) => (
                        <motion.div key={milestone.id} variants={item}>
                            <Link href={`/dashboard/wblm/programs/${programId}/milestones/${milestone.id}`}>
                                <Card className="border-slate-200 dark:border-white/5 hover:border-emerald-300 dark:hover:border-emerald-500/30 transition-all group cursor-pointer">
                                    <CardContent className="p-5">
                                        <div className="flex items-start gap-4">
                                            {/* Timeline indicator */}
                                            <div className="flex flex-col items-center">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center border-2",
                                                    milestone.status === WblmMilestoneStatus.APPROVED_FINAL
                                                        ? "bg-emerald-100 border-emerald-500 dark:bg-emerald-900/30"
                                                        : milestone.status === WblmMilestoneStatus.NOT_STARTED
                                                            ? "bg-slate-100 border-slate-300 dark:bg-slate-900/50 dark:border-slate-700"
                                                            : "bg-blue-100 border-blue-500 dark:bg-blue-900/30"
                                                )}>
                                                    {getStatusIcon(milestone.status)}
                                                </div>
                                                {index < (timeline?.milestones?.length || 0) - 1 && (
                                                    <div className="w-0.5 h-8 bg-slate-200 dark:bg-slate-800 mt-2" />
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-2">
                                                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                        {milestone.name}
                                                    </h3>
                                                    <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 flex-shrink-0" />
                                                </div>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
                                                    {milestone.description || "Tidak ada deskripsi"}
                                                </p>
                                                <div className="flex items-center gap-4 text-xs">
                                                    <Badge variant="outline" className={cn(
                                                        "font-medium",
                                                        milestone.status === WblmMilestoneStatus.APPROVED_FINAL && "border-emerald-500 text-emerald-600",
                                                        milestone.status === WblmMilestoneStatus.REVISION_REQUESTED && "border-orange-500 text-orange-600"
                                                    )}>
                                                        {getStatusLabel(milestone.status)}
                                                    </Badge>
                                                    {milestone.dueDate && (
                                                        <span className="text-slate-400 flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(milestone.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                        </span>
                                                    )}
                                                    {milestone.submissions?.length > 0 && (
                                                        <span className="text-slate-400 flex items-center gap-1">
                                                            <FileText className="w-3 h-3" />
                                                            {milestone.submissions.length} Submissions
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        </motion.div>
                    ))}

                    {(!timeline?.milestones || timeline.milestones.length === 0) && (
                        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-2xl">
                            <Target className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                            <p className="text-slate-500 dark:text-slate-400">Belum ada milestone</p>
                        </div>
                    )}
                </motion.div>

                {/* Sidebar */}
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="space-y-6"
                >
                    {/* Program Info */}
                    <motion.div variants={item}>
                        <Card className="border-slate-200 dark:border-white/5">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">
                                    Informasi Program
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium">Durasi</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{program.durationWeeks} Minggu</p>
                                    </div>
                                </div>
                                {program.Owner && (
                                    <div className="flex items-center gap-3">
                                        <User className="w-4 h-4 text-slate-400" />
                                        <div>
                                            <p className="text-xs text-slate-400 font-medium">Program Owner</p>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{program.Owner.name}</p>
                                        </div>
                                    </div>
                                )}
                                {program.startDate && (
                                    <div className="flex items-center gap-3">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        <div>
                                            <p className="text-xs text-slate-400 font-medium">Tanggal Mulai</p>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                {new Date(program.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Quick Actions */}
                    <motion.div variants={item}>
                        <Card className="border-slate-200 dark:border-white/5">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">
                                    Aksi Cepat
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {timeline?.evidence && (
                                    <Button asChild variant="outline" className="w-full justify-start">
                                        <Link href={`/dashboard/wblm/programs/${programId}/evidence`}>
                                            <FileText className="w-4 h-4 mr-2" />
                                            Lihat Evidence Package
                                        </Link>
                                    </Button>
                                )}
                                <Button asChild variant="outline" className="w-full justify-start">
                                    <Link href={`/dashboard/wblm/programs/${programId}/reflection`}>
                                        <MessageSquare className="w-4 h-4 mr-2" />
                                        Refleksi Akhir
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}
