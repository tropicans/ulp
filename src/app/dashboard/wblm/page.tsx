"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Briefcase,
    CheckCircle2,
    Clock,
    LayoutDashboard,
    FileCheck,
    Target,
    ChevronRight,
    Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getWblmPrograms } from "@/lib/actions/wblm-program";
import { motion } from "framer-motion";
import { WblmProgramStatus } from "@/generated/prisma";

type WblmProgramWithStats = Awaited<ReturnType<typeof getWblmPrograms>>[number];

export default function WblmDashboard() {
    const { data: session, status } = useSession();
    const [programs, setPrograms] = useState<WblmProgramWithStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (status === "unauthenticated") {
            redirect("/login");
        }

        async function fetchData() {
            if (!session?.user?.id) return;

            setIsLoading(true);
            try {
                const result = await getWblmPrograms({ role: "participant" });
                setPrograms(result);
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
                <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">
                    Memuat WBLM Dashboard...
                </p>
            </div>
        );
    }

    const user = session?.user;

    // Calculate stats
    const activePrograms = programs.filter(
        p => p.status === WblmProgramStatus.RUNNING
    ).length;
    const completedPrograms = programs.filter(
        p => p.status === WblmProgramStatus.CLOSED || p.status === WblmProgramStatus.ARCHIVED
    ).length;
    const totalMilestones = programs.reduce((acc, p) => acc + (p._count?.Milestones || 0), 0);

    const summaryStats = [
        { label: "Program Aktif", value: activePrograms.toString(), icon: Briefcase, color: "text-emerald-500", shadow: "shadow-emerald-500/10" },
        { label: "Program Selesai", value: completedPrograms.toString(), icon: CheckCircle2, color: "text-blue-500", shadow: "shadow-blue-500/10" },
        { label: "Total Milestone", value: totalMilestones.toString(), icon: Target, color: "text-purple-500", shadow: "shadow-purple-500/10" },
    ];

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    const getStatusBadge = (status: WblmProgramStatus) => {
        const styles = {
            [WblmProgramStatus.DRAFT]: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
            [WblmProgramStatus.PUBLISHED]: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
            [WblmProgramStatus.RUNNING]: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
            [WblmProgramStatus.CLOSED]: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
            [WblmProgramStatus.ARCHIVED]: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
        };
        const labels = {
            [WblmProgramStatus.DRAFT]: "Draft",
            [WblmProgramStatus.PUBLISHED]: "Terbuka",
            [WblmProgramStatus.RUNNING]: "Berlangsung",
            [WblmProgramStatus.CLOSED]: "Selesai",
            [WblmProgramStatus.ARCHIVED]: "Arsip"
        };
        return (
            <Badge className={cn("font-bold text-[10px] uppercase tracking-wider px-2 py-0.5", styles[status])}>
                {labels[status]}
            </Badge>
        );
    };

    return (
        <div className="container mx-auto px-4 py-8 relative">
            {/* Background Decoration */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6"
            >
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-emerald-600/10 text-emerald-500">
                            <LayoutDashboard className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] uppercase font-black tracking-widest text-emerald-500/80">
                            Work-Based Learning
                        </span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                        WBLM Dashboard
                    </h1>
                    <p className="text-slate-400 font-medium">
                        Kelola program pembelajaran berbasis kerja Anda
                    </p>
                </div>
                <div className="hidden md:block text-right">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Peserta</p>
                    <Badge variant="outline" className="border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 px-4 py-1.5 rounded-xl font-bold">
                        {user?.name || "Learner"}
                    </Badge>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10"
            >
                {summaryStats.map((stat) => (
                    <motion.div key={stat.label} variants={item}>
                        <Card className="border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors group bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
                                        <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums">{stat.value}</p>
                                    </div>
                                    <div className={cn(
                                        "p-4 rounded-2xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-2xl",
                                        stat.color,
                                        stat.shadow
                                    )}>
                                        <stat.icon className="w-7 h-7" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </motion.div>

            {/* Programs List */}
            <motion.div variants={container} initial="hidden" animate="show">
                <Card className="border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-emerald-600/10 text-emerald-500">
                                <Briefcase className="w-5 h-5" />
                            </div>
                            Program Saya
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {programs.length > 0 ? (
                            programs.map((program) => (
                                <motion.div key={program.id} variants={item}>
                                    <Link
                                        href={`/dashboard/wblm/programs/${program.id}`}
                                        className="block"
                                    >
                                        <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 hover:bg-emerald-50 dark:hover:bg-emerald-500/5 hover:border-emerald-300 dark:hover:border-emerald-500/20 transition-all group">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                            {program.title}
                                                        </h4>
                                                        {getStatusBadge(program.status)}
                                                    </div>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">
                                                        {program.description || "Tidak ada deskripsi"}
                                                    </p>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors flex-shrink-0 mt-1" />
                                            </div>
                                            <div className="flex items-center gap-6 text-xs text-slate-500 dark:text-slate-400">
                                                <span className="flex items-center gap-1.5">
                                                    <Target className="w-3.5 h-3.5" />
                                                    {program._count?.Milestones || 0} Milestone
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {program.durationWeeks} Minggu
                                                </span>
                                                {program.startDate && (
                                                    <span className="flex items-center gap-1.5">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {new Date(program.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))
                        ) : (
                            <div className="text-center py-16 px-4 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl">
                                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-200 dark:border-white/5">
                                    <Briefcase className="w-10 h-10 text-slate-400 dark:text-slate-600" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                    Belum Ada Program
                                </h3>
                                <p className="text-sm text-slate-400 mb-8 max-w-xs mx-auto">
                                    Anda belum terdaftar di program WBLM. Hubungi admin untuk mendaftar.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
