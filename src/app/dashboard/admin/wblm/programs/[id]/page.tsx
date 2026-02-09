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
    Settings,
    Target,
    Users,
    Clock,
    ChevronRight,
    Play,
    Pause,
    Archive,
    Plus,
    BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getWblmProgramById, startWblmProgram, closeWblmProgram, publishWblmProgram } from "@/lib/actions/wblm-program";
import { getWblmProgramStats } from "@/lib/actions/wblm-program";
import { motion } from "framer-motion";
import { WblmProgramStatus } from "@/generated/prisma";

export default function AdminProgramDetailPage() {
    const { data: session, status } = useSession();
    const params = useParams();
    const programId = params.id as string;

    const [program, setProgram] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActioning, setIsActioning] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") {
            redirect("/login");
        }

        async function fetchData() {
            if (!session?.user?.id || !programId) return;

            // Check admin access
            if (!["SUPER_ADMIN", "ADMIN_UNIT", "INSTRUCTOR"].includes(session.user.role)) {
                redirect("/dashboard");
            }

            setIsLoading(true);
            try {
                const [programResult, statsResult] = await Promise.all([
                    getWblmProgramById(programId),
                    getWblmProgramStats(programId)
                ]);
                setProgram(programResult);
                setStats(statsResult);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [session, status, programId]);

    const handleStatusAction = async (action: 'publish' | 'start' | 'close') => {
        setIsActioning(true);
        try {
            let result;
            switch (action) {
                case 'publish':
                    result = await publishWblmProgram(programId);
                    break;
                case 'start':
                    result = await startWblmProgram(programId);
                    break;
                case 'close':
                    result = await closeWblmProgram(programId);
                    break;
            }

            if (result && "error" in result) {
                alert(result.error);
            } else {
                const updated = await getWblmProgramById(programId);
                setProgram(updated);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsActioning(false);
        }
    };

    if (status === "loading" || isLoading) {
        return (
            <div className="container mx-auto px-4 py-32 flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">
                    Memuat Program...
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
                    <Link href="/dashboard/admin/wblm">Kembali</Link>
                </Button>
            </div>
        );
    }

    const getStatusBadge = (status: WblmProgramStatus) => {
        const styles = {
            [WblmProgramStatus.DRAFT]: "bg-slate-100 text-slate-600",
            [WblmProgramStatus.PUBLISHED]: "bg-blue-100 text-blue-600",
            [WblmProgramStatus.RUNNING]: "bg-emerald-100 text-emerald-600",
            [WblmProgramStatus.CLOSED]: "bg-orange-100 text-orange-600",
            [WblmProgramStatus.ARCHIVED]: "bg-gray-100 text-gray-500"
        };
        return (
            <Badge className={cn("font-bold text-xs uppercase tracking-wider px-3 py-1", styles[status])}>
                {status}
            </Badge>
        );
    };

    const quickActions = [
        { label: "Enrollment", href: `/dashboard/admin/wblm/programs/${programId}/enrollments`, icon: Users },
        { label: "Milestones", href: `/dashboard/admin/wblm/programs/${programId}/milestones`, icon: Target },
        { label: "Settings", href: `/dashboard/admin/wblm/programs/${programId}/settings`, icon: Settings },
    ];

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
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Back Button */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <Button asChild variant="ghost" className="mb-4 -ml-2">
                    <Link href="/dashboard/admin/wblm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Kembali
                    </Link>
                </Button>
            </motion.div>

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
                            {program.title}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">
                            {program.description || "Tidak ada deskripsi"}
                        </p>
                    </div>
                    {getStatusBadge(program.status)}
                </div>

                {/* Status Actions */}
                <div className="flex gap-3 flex-wrap">
                    {program.status === WblmProgramStatus.DRAFT && (
                        <Button
                            onClick={() => handleStatusAction('publish')}
                            disabled={isActioning}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-500 text-white"
                        >
                            <Play className="w-4 h-4 mr-2" />
                            Publish
                        </Button>
                    )}
                    {program.status === WblmProgramStatus.PUBLISHED && (
                        <Button
                            onClick={() => handleStatusAction('start')}
                            disabled={isActioning}
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                            <Play className="w-4 h-4 mr-2" />
                            Start Program
                        </Button>
                    )}
                    {program.status === WblmProgramStatus.RUNNING && (
                        <Button
                            onClick={() => handleStatusAction('close')}
                            disabled={isActioning}
                            size="sm"
                            variant="outline"
                        >
                            <Pause className="w-4 h-4 mr-2" />
                            Close Program
                        </Button>
                    )}
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="lg:col-span-2 space-y-6"
                >
                    {/* Stats */}
                    {stats && (
                        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card className="border-slate-200 dark:border-white/5">
                                <CardContent className="p-4">
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1">Peserta</p>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalEnrollments}</p>
                                </CardContent>
                            </Card>
                            <Card className="border-slate-200 dark:border-white/5">
                                <CardContent className="p-4">
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1">Submissions</p>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalSubmissions}</p>
                                </CardContent>
                            </Card>
                            <Card className="border-slate-200 dark:border-white/5">
                                <CardContent className="p-4">
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1">Completion</p>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.completionRate}%</p>
                                </CardContent>
                            </Card>
                            <Card className="border-slate-200 dark:border-white/5">
                                <CardContent className="p-4">
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1">Pending</p>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.pendingReviews}</p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Milestones */}
                    <motion.div variants={item}>
                        <Card className="border-slate-200 dark:border-white/5">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <Target className="w-5 h-5 text-blue-500" />
                                    Milestones ({program.Milestones?.length || 0})
                                </CardTitle>
                                <Button asChild variant="outline" size="sm">
                                    <Link href={`/dashboard/admin/wblm/programs/${programId}/milestones/new`}>
                                        <Plus className="w-4 h-4 mr-1" />
                                        Add
                                    </Link>
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {program.Milestones?.length > 0 ? (
                                    program.Milestones.map((milestone: any) => (
                                        <Link key={milestone.id} href={`/dashboard/admin/wblm/programs/${programId}/milestones/${milestone.id}`}>
                                            <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-white/5 hover:border-blue-300 dark:hover:border-blue-500/30 transition-all group">
                                                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold text-sm">
                                                    {milestone.orderIndex + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                                        {milestone.name}
                                                    </h4>
                                                    <p className="text-sm text-slate-500 truncate">
                                                        {milestone.requiredArtifactTypes?.join(", ") || "No artifacts defined"}
                                                    </p>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500" />
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-xl">
                                        <Target className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                        <p className="text-sm text-slate-400">Belum ada milestone</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>

                {/* Sidebar */}
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="space-y-6"
                >
                    {/* Quick Actions */}
                    <motion.div variants={item}>
                        <Card className="border-slate-200 dark:border-white/5">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">
                                    Quick Actions
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {quickActions.map((action) => (
                                    <Button key={action.label} asChild variant="outline" className="w-full justify-start">
                                        <Link href={action.href}>
                                            <action.icon className="w-4 h-4 mr-2" />
                                            {action.label}
                                        </Link>
                                    </Button>
                                ))}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Program Info */}
                    <motion.div variants={item}>
                        <Card className="border-slate-200 dark:border-white/5">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">
                                    Program Info
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div className="flex items-center gap-3">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    <div>
                                        <p className="text-xs text-slate-400">Durasi</p>
                                        <p className="font-bold text-slate-900 dark:text-white">{program.durationWeeks} Minggu</p>
                                    </div>
                                </div>
                                {program.startDate && (
                                    <div className="flex items-center gap-3">
                                        <Clock className="w-4 h-4 text-slate-400" />
                                        <div>
                                            <p className="text-xs text-slate-400">Tanggal Mulai</p>
                                            <p className="font-bold text-slate-900 dark:text-white">
                                                {new Date(program.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}
