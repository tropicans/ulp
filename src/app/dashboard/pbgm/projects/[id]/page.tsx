"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { redirect, useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ArrowLeft,
    Sparkles,
    FileText,
    MessageSquare,
    BookOpen,
    Link2,
    Rocket,
    CheckCircle2,
    Clock,
    AlertCircle,
    Archive,
    Play,
    Send,
    Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getProjectById, activateProject, submitForReview, resubmitProject, checkExpertRole } from "@/lib/actions/pbgm-project";
import { motion } from "framer-motion";
import { ProjectChallenge, ProjectStatus } from "@/lib/pbgm/types";
import { ArtifactsTab } from "@/components/pbgm/artifacts-tab";
import { FeedbackTab } from "@/components/pbgm/feedback-tab";
import { ReflectionTab } from "@/components/pbgm/reflection-tab";
import { LearningLinksTab } from "@/components/pbgm/learning-links-tab";
import { ExpertsTab } from "@/components/pbgm/experts-tab";

export default function ProjectDetailPage() {
    const { data: session, status } = useSession();
    const params = useParams();
    const projectId = params.id as string;

    const [project, setProject] = useState<ProjectChallenge | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActioning, setIsActioning] = useState(false);
    const [activeTab, setActiveTab] = useState("artifacts");
    const [isExpert, setIsExpert] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") {
            redirect("/login");
        }

        async function fetchData() {
            if (!session?.user?.id || !projectId) return;

            setIsLoading(true);
            try {
                const result = await getProjectById(projectId);
                if ("error" in result) {
                    console.error(result.error);
                } else {
                    setProject(result);
                }

                // Check if user is an Expert for this project
                const expertCheck = await checkExpertRole(projectId);
                if ("isExpert" in expertCheck && expertCheck.isExpert !== undefined) {
                    setIsExpert(expertCheck.isExpert);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [session, status, projectId]);

    const handleActivate = async () => {
        setIsActioning(true);
        try {
            const result = await activateProject(projectId);
            if ("project" in result && result.project) {
                setProject(result.project);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsActioning(false);
        }
    };

    const handleSubmitForReview = async () => {
        setIsActioning(true);
        try {
            const result = await submitForReview(projectId);
            if ("project" in result && result.project) {
                setProject(result.project);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsActioning(false);
        }
    };

    const handleResubmit = async () => {
        setIsActioning(true);
        try {
            const result = await resubmitProject(projectId);
            if ("project" in result && result.project) {
                setProject(result.project);
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
                <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">
                    Memuat Project...
                </p>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                    Project Tidak Ditemukan
                </h1>
                <Button asChild variant="outline">
                    <Link href="/dashboard/pbgm">Kembali ke Dashboard</Link>
                </Button>
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
            REVISION: "Perlu Revisi",
            FINAL: "Selesai",
            ARCHIVED: "Diarsipkan"
        };

        return (
            <Badge className={cn("font-bold text-xs uppercase tracking-wider px-3 py-1", styles[status])}>
                {labels[status]}
            </Badge>
        );
    };

    const isCreator = session?.user?.id === project.creatorId;
    const canEdit = isCreator && ["DRAFT", "ACTIVE", "REVISION"].includes(project.status);

    return (
        <div className="container mx-auto px-4 py-8 relative">
            {/* Background */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Back Button */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <Button asChild variant="ghost" className="mb-4 -ml-2 text-slate-600 dark:text-slate-400">
                    <Link href="/dashboard/pbgm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Kembali
                    </Link>
                </Button>
            </motion.div>

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
            >
                <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-3">
                            <Sparkles className="w-8 h-8 text-violet-500" />
                            {project.title}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 max-w-2xl">
                            {project.purpose || "Tidak ada deskripsi"}
                        </p>
                    </div>
                    {getStatusBadge(project.status)}
                </div>

                {/* Action Buttons */}
                {isCreator && (
                    <div className="flex gap-3 flex-wrap">
                        {project.status === "DRAFT" && (
                            <Button
                                onClick={handleActivate}
                                disabled={isActioning}
                                className="bg-blue-600 hover:bg-blue-500 text-white"
                            >
                                <Play className="w-4 h-4 mr-2" />
                                Mulai Project
                            </Button>
                        )}
                        {project.status === "ACTIVE" && (
                            <Button
                                onClick={handleSubmitForReview}
                                disabled={isActioning}
                                className="bg-purple-600 hover:bg-purple-500 text-white"
                            >
                                <Send className="w-4 h-4 mr-2" />
                                Submit untuk Review
                            </Button>
                        )}
                        {project.status === "REVISION" && (
                            <Button
                                onClick={handleResubmit}
                                disabled={isActioning}
                                className="bg-orange-600 hover:bg-orange-500 text-white"
                            >
                                <Send className="w-4 h-4 mr-2" />
                                Submit Revisi
                            </Button>
                        )}
                    </div>
                )}
            </motion.div>

            {/* Project Info Cards */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
            >
                {project.context && (
                    <Card className="border-slate-200 dark:border-white/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                Konteks
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">
                                {project.context}
                            </p>
                        </CardContent>
                    </Card>
                )}
                {project.safeToLearnNote && (
                    <Card className="border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-900/10">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                                Safe-to-Learn
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-amber-700 dark:text-amber-300 line-clamp-3">
                                {project.safeToLearnNote}
                            </p>
                        </CardContent>
                    </Card>
                )}
                {project.expectedOutputs && (
                    <Card className="border-slate-200 dark:border-white/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                Output yang Diharapkan
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">
                                {project.expectedOutputs}
                            </p>
                        </CardContent>
                    </Card>
                )}
            </motion.div>

            {/* Tabs */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-5 mb-6">
                        <TabsTrigger value="artifacts" className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span className="hidden sm:inline">Artifacts</span>
                        </TabsTrigger>
                        <TabsTrigger value="feedback" className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            <span className="hidden sm:inline">Feedback</span>
                        </TabsTrigger>
                        <TabsTrigger value="experts" className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span className="hidden sm:inline">Experts</span>
                        </TabsTrigger>
                        <TabsTrigger value="reflection" className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            <span className="hidden sm:inline">Refleksi</span>
                        </TabsTrigger>
                        <TabsTrigger value="learning" className="flex items-center gap-2">
                            <Link2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Learning</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="artifacts">
                        <ArtifactsTab projectId={projectId} canEdit={canEdit} />
                    </TabsContent>

                    <TabsContent value="feedback">
                        <FeedbackTab projectId={projectId} isExpert={isExpert} projectStatus={project.status} />
                    </TabsContent>

                    <TabsContent value="experts">
                        <ExpertsTab projectId={projectId} canManage={isCreator} />
                    </TabsContent>

                    <TabsContent value="reflection">
                        <ReflectionTab projectId={projectId} canEdit={canEdit} projectStatus={project.status} />
                    </TabsContent>

                    <TabsContent value="learning">
                        <LearningLinksTab projectId={projectId} canEdit={canEdit} />
                    </TabsContent>
                </Tabs>
            </motion.div>
        </div>
    );
}
