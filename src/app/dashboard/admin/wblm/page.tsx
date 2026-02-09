"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Briefcase,
    LayoutDashboard,
    Users,
    Target,
    ChevronRight,
    Plus,
    Clock,
    Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getWblmPrograms } from "@/lib/actions/wblm-program";
import { motion } from "framer-motion";
import { WblmProgramStatus } from "@/generated/prisma";

type WblmProgramWithStats = Awaited<ReturnType<typeof getWblmPrograms>>[number];

export default function AdminWblmDashboard() {
    const { data: session, status } = useSession();
    const [programs, setPrograms] = useState<WblmProgramWithStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (status === "unauthenticated") {
            redirect("/login");
        }

        async function fetchData() {
            if (!session?.user?.id) return;

            // Check admin access
            if (!["SUPER_ADMIN", "ADMIN_UNIT", "INSTRUCTOR"].includes(session.user.role)) {
                redirect("/dashboard");
            }

            setIsLoading(true);
            try {
                const result = await getWblmPrograms({ role: "owner" });
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
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">
                    Memuat Admin Dashboard...
                </p>
            </div>
        );
    }

    // Stats
    const draftPrograms = programs.filter(p => p.status === WblmProgramStatus.DRAFT).length;
    const runningPrograms = programs.filter(p => p.status === WblmProgramStatus.RUNNING).length;
    const totalEnrollments = programs.reduce((acc, p) => acc + (p._count?.Enrollments || 0), 0);

    const summaryStats = [
        { label: "Draft", value: draftPrograms.toString(), icon: Clock, color: "text-slate-500" },
        { label: "Berjalan", value: runningPrograms.toString(), icon: Briefcase, color: "text-emerald-500" },
        { label: "Total Peserta", value: totalEnrollments.toString(), icon: Users, color: "text-blue-500" },
    ];

    const getStatusBadge = (status: WblmProgramStatus) => {
        const styles = {
            [WblmProgramStatus.DRAFT]: "bg-slate-100 text-slate-600",
            [WblmProgramStatus.PUBLISHED]: "bg-blue-100 text-blue-600",
            [WblmProgramStatus.RUNNING]: "bg-emerald-100 text-emerald-600",
            [WblmProgramStatus.CLOSED]: "bg-orange-100 text-orange-600",
            [WblmProgramStatus.ARCHIVED]: "bg-gray-100 text-gray-500"
        };
        return (
            <Badge className={cn("font-bold text-[10px] uppercase tracking-wider px-2 py-0.5", styles[status])}>
                {status}
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
        <div className="container mx-auto px-4 py-8 relative">
            {/* Background */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6"
            >
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-blue-600/10 text-blue-500">
                            <LayoutDashboard className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] uppercase font-black tracking-widest text-blue-500/80">
                            Admin PBGM
                        </span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                        Kelola Project PBGM
                    </h1>
                    Buat dan kelola project pertumbuhan berbasis kerja
                </div>
                <Button asChild className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 rounded-xl">
                    <Link href="/dashboard/admin/wblm/programs/new">
                        <Plus className="w-4 h-4 mr-2" />
                        Buat Program
                    </Link>
                </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10"
            >
                {summaryStats.map((stat) => (
                    <motion.div key={stat.label} variants={item}>
                        <Card className="border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-950/50">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1">{stat.label}</p>
                                        <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{stat.value}</p>
                                    </div>
                                    <div className={cn("p-4 rounded-2xl bg-slate-100 dark:bg-slate-950", stat.color)}>
                                        <stat.icon className="w-7 h-7" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </motion.div>

            {/* Programs List */}
            <Card className="border-slate-200 dark:border-white/5">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-blue-500" />
                        Program Saya
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {programs.length > 0 ? (
                        programs.map((program) => (
                            <motion.div key={program.id} variants={item}>
                                <Link href={`/dashboard/admin/wblm/programs/${program.id}`}>
                                    <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/5 hover:border-blue-300 dark:hover:border-blue-500/30 transition-all group">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                                    {program.title}
                                                </h4>
                                                {getStatusBadge(program.status)}
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500" />
                                        </div>
                                        <div className="flex items-center gap-6 text-xs text-slate-500">
                                            <span className="flex items-center gap-1.5">
                                                <Target className="w-3.5 h-3.5" />
                                                {program._count?.Milestones || 0} Milestone
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Users className="w-3.5 h-3.5" />
                                                {program._count?.Enrollments || 0} Peserta
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                {program.durationWeeks} Minggu
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))
                    ) : (
                        <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl">
                            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                Belum Ada Program
                            </h3>
                            <p className="text-sm text-slate-400 mb-6">
                                Buat project PBGM pertama Anda
                            </p>
                            <Button asChild>
                                <Link href="/dashboard/admin/wblm/programs/new">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Buat Program
                                </Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
