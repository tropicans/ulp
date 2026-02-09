"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    Rocket,
    FileText,
    MessageSquare,
    CheckCircle2,
    Clock,
    AlertCircle,
    ChevronRight,
    Sparkles,
    Archive
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getProjects, getExpertProjects } from "@/lib/actions/pbgm-project";
import { motion } from "framer-motion";
import { ProjectChallenge, ProjectStatus } from "@/lib/pbgm/types";

export default function PbgmDashboard() {
    const { data: session, status } = useSession();
    const [projects, setProjects] = useState<ProjectChallenge[]>([]);
    const [expertProjects, setExpertProjects] = useState<ProjectChallenge[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (status === "unauthenticated") {
            redirect("/login");
        }

        async function fetchData() {
            if (!session?.user?.id) return;

            setIsLoading(true);
            try {
                // Fetch own projects
                const result = await getProjects();
                if ("projects" in result && result.projects) {
                    setProjects(result.projects);
                }

                // Fetch projects where I'm an expert
                const expertResult = await getExpertProjects();
                if ("projects" in expertResult && expertResult.projects) {
                    setExpertProjects(expertResult.projects);
                }
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
                <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">
                    Memuat Project...
                </p>
            </div>
        );
    }

    const getStatusBadge = (status: ProjectStatus) => {
        const styles: Record<ProjectStatus, string> = {
            DRAFT: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
            ACTIVE: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
            UNDER_REVIEW: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
            REVISION: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
            FINAL: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
            ARCHIVED: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
        };

        const labels: Record<ProjectStatus, string> = {
            DRAFT: "Draft",
            ACTIVE: "Aktif",
            UNDER_REVIEW: "Dalam Review",
            REVISION: "Revisi",
            FINAL: "Selesai",
            ARCHIVED: "Diarsipkan"
        };

        return (
            <Badge className={cn("font-bold text-[10px] uppercase tracking-wider px-2 py-0.5", styles[status])}>
                {labels[status]}
            </Badge>
        );
    };

    const getStatusIcon = (status: ProjectStatus): React.ReactNode => {
        const icons: Record<ProjectStatus, React.ReactNode> = {
            DRAFT: <Clock className="w-5 h-5 text-slate-400" />,
            ACTIVE: <Rocket className="w-5 h-5 text-blue-500" />,
            UNDER_REVIEW: <MessageSquare className="w-5 h-5 text-purple-500" />,
            REVISION: <AlertCircle className="w-5 h-5 text-orange-500" />,
            FINAL: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
            ARCHIVED: <Archive className="w-5 h-5 text-gray-400" />
        };
        return icons[status];
    };

    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.08 } }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    const activeProjects = projects.filter(p => p.status !== "ARCHIVED");
    const archivedProjects = projects.filter(p => p.status === "ARCHIVED");

    return (
        <div className="container mx-auto px-4 py-8 relative">
            {/* Background Gradient */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8"
            >
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <Sparkles className="w-8 h-8 text-violet-500" />
                        Project Challenge
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Kelola project berbasis pertumbuhan Anda
                    </p>
                </div>

                <Button asChild className="bg-violet-600 hover:bg-violet-500 text-white font-bold shadow-lg shadow-violet-500/20">
                    <Link href="/dashboard/pbgm/projects/new">
                        <Plus className="w-4 h-4 mr-2" />
                        Buat Project Baru
                    </Link>
                </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
            >
                <Card className="border-slate-200 dark:border-white/5">
                    <CardContent className="p-4">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1">Total Project</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{projects.length}</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 dark:border-white/5">
                    <CardContent className="p-4">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1">Aktif</p>
                        <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                            {projects.filter(p => p.status === "ACTIVE").length}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 dark:border-white/5">
                    <CardContent className="p-4">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1">Dalam Review</p>
                        <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
                            {projects.filter(p => p.status === "UNDER_REVIEW").length}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 dark:border-white/5">
                    <CardContent className="p-4">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1">Selesai</p>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            {projects.filter(p => p.status === "FINAL").length}
                        </p>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Active Projects */}
            {activeProjects.length > 0 ? (
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="space-y-4"
                >
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Project Anda</h2>

                    {activeProjects.map((project) => (
                        <motion.div key={project.id} variants={item}>
                            <Link href={`/dashboard/pbgm/projects/${project.id}`}>
                                <Card className="border-slate-200 dark:border-white/5 hover:border-violet-300 dark:hover:border-violet-500/30 transition-all group cursor-pointer hover:shadow-lg hover:shadow-violet-500/5">
                                    <CardContent className="p-5">
                                        <div className="flex items-start gap-4">
                                            <div className={cn(
                                                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                                                project.status === "FINAL" ? "bg-emerald-100 dark:bg-emerald-900/30" :
                                                    project.status === "ACTIVE" ? "bg-blue-100 dark:bg-blue-900/30" :
                                                        project.status === "UNDER_REVIEW" ? "bg-purple-100 dark:bg-purple-900/30" :
                                                            project.status === "REVISION" ? "bg-orange-100 dark:bg-orange-900/30" :
                                                                "bg-slate-100 dark:bg-slate-800"
                                            )}>
                                                {getStatusIcon(project.status)}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors truncate">
                                                        {project.title}
                                                    </h3>
                                                    <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-violet-500 flex-shrink-0" />
                                                </div>

                                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 mb-3">
                                                    {project.purpose || "Tidak ada deskripsi"}
                                                </p>

                                                <div className="flex items-center gap-3">
                                                    {getStatusBadge(project.status)}
                                                    <span className="text-xs text-slate-400">
                                                        Diperbarui {new Date(project.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        </motion.div>
                    ))}
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-2xl"
                >
                    <Sparkles className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        Belum ada Project
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
                        Mulai perjalanan pembelajaran Anda dengan membuat project challenge pertama
                    </p>
                    <Button asChild className="bg-violet-600 hover:bg-violet-500 text-white">
                        <Link href="/dashboard/pbgm/projects/new">
                            <Plus className="w-4 h-4 mr-2" />
                            Buat Project Pertama
                        </Link>
                    </Button>
                </motion.div>
            )}

            {/* Expert Projects Section */}
            {expertProjects.length > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-10"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            Project sebagai Expert ({expertProjects.length})
                        </h2>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        Project yang mengundang Anda sebagai Expert untuk memberikan feedback
                    </p>

                    <div className="space-y-3">
                        {expertProjects.map((project) => (
                            <Link key={project.id} href={`/dashboard/pbgm/projects/${project.id}`}>
                                <Card className="border-amber-200 dark:border-amber-500/20 hover:border-amber-300 dark:hover:border-amber-500/40 transition-all group cursor-pointer hover:shadow-lg hover:shadow-amber-500/10">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                                {getStatusIcon(project.status)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                                                        {project.title}
                                                    </h3>
                                                    <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-amber-500 flex-shrink-0" />
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600 dark:border-amber-500/30 dark:text-amber-400">
                                                        Expert
                                                    </Badge>
                                                    {getStatusBadge(project.status)}
                                                    <span className="text-xs text-slate-400">
                                                        oleh {project.creatorName}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Archived Projects */}
            {archivedProjects.length > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-8"
                >
                    <h2 className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                        <Archive className="w-4 h-4" />
                        Diarsipkan ({archivedProjects.length})
                    </h2>
                    <div className="space-y-2">
                        {archivedProjects.map((project) => (
                            <Link key={project.id} href={`/dashboard/pbgm/projects/${project.id}`}>
                                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Archive className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm text-slate-500 dark:text-slate-400">{project.title}</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-300" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
