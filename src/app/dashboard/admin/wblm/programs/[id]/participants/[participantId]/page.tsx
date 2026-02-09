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
    Clock,
    Target,
    FileText,
    MessageSquare,
    CheckCircle2,
    AlertCircle,
    Send,
    User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getWblmProgramById } from "@/lib/actions/wblm-program";
import { getWblmSubmissions } from "@/lib/actions/wblm-submission";
import { getWblmReflections } from "@/lib/actions/wblm-reflection";
import { motion } from "framer-motion";
import { WblmMilestoneStatus, WblmReviewDecision } from "@/generated/prisma";

type TimelineEvent = {
    id: string;
    type: "submission" | "review" | "reflection" | "milestone_complete";
    title: string;
    description?: string;
    date: Date;
    status?: string;
    milestoneId?: string;
    milestoneName?: string;
};

export default function ParticipantTimelinePage() {
    const { data: session, status } = useSession();
    const params = useParams();
    const programId = params.id as string;
    const participantId = params.participantId as string;

    const [program, setProgram] = useState<any>(null);
    const [participant, setParticipant] = useState<any>(null);
    const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (status === "unauthenticated") {
            redirect("/login");
        }

        async function fetchData() {
            if (!session?.user?.id || !programId || !participantId) return;

            // Check access (admin/reviewer)
            if (!["SUPER_ADMIN", "ADMIN_UNIT", "INSTRUCTOR"].includes(session.user.role)) {
                redirect("/dashboard");
            }

            setIsLoading(true);
            try {
                const [programResult, submissions, reflections] = await Promise.all([
                    getWblmProgramById(programId),
                    getWblmSubmissions(programId, participantId),
                    getWblmReflections(programId, participantId)
                ]);

                if (programResult) {
                    setProgram(programResult);

                    // Find participant
                    const enrollment = programResult.Enrollments?.find(
                        (e: any) => e.participantUserId === participantId
                    );
                    if (enrollment?.Participant) {
                        setParticipant(enrollment.Participant);
                    }
                }

                // Build timeline
                const events: TimelineEvent[] = [];

                // Add submissions
                if (Array.isArray(submissions)) {
                    submissions.forEach((sub: any) => {
                        events.push({
                            id: `sub-${sub.id}`,
                            type: "submission",
                            title: sub.title || `Submission v${sub.versionNumber}`,
                            description: sub.notes,
                            date: new Date(sub.createdAt),
                            status: sub.status,
                            milestoneId: sub.milestoneId,
                            milestoneName: sub.Milestone?.name
                        });

                        // Add reviews
                        sub.Reviews?.forEach((review: any) => {
                            events.push({
                                id: `review-${review.id}`,
                                type: "review",
                                title: review.decision === WblmReviewDecision.ACCEPT
                                    ? "Disetujui"
                                    : review.decision === WblmReviewDecision.REQUEST_REVISION
                                        ? "Revisi Diperlukan"
                                        : "Comment",
                                description: review.commentsRichtext,
                                date: new Date(review.createdAt),
                                milestoneId: sub.milestoneId,
                                milestoneName: sub.Milestone?.name
                            });
                        });
                    });
                }

                // Add reflections
                if (Array.isArray(reflections)) {
                    reflections.forEach((ref: any) => {
                        events.push({
                            id: `ref-${ref.id}`,
                            type: "reflection",
                            title: ref.milestoneId
                                ? `Refleksi: ${ref.Milestone?.name || 'Milestone'}`
                                : "Refleksi Akhir",
                            date: new Date(ref.submittedAt || ref.createdAt),
                            status: ref.status,
                            milestoneId: ref.milestoneId,
                            milestoneName: ref.Milestone?.name
                        });
                    });
                }

                // Sort by date descending
                events.sort((a, b) => b.date.getTime() - a.date.getTime());
                setTimelineEvents(events);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [session, status, programId, participantId]);

    if (status === "loading" || isLoading) {
        return (
            <div className="container mx-auto px-4 py-32 flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">
                    Memuat Timeline...
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

    const getEventIcon = (type: TimelineEvent["type"]) => {
        switch (type) {
            case "submission":
                return <Send className="w-4 h-4" />;
            case "review":
                return <MessageSquare className="w-4 h-4" />;
            case "reflection":
                return <Target className="w-4 h-4" />;
            case "milestone_complete":
                return <CheckCircle2 className="w-4 h-4" />;
            default:
                return <FileText className="w-4 h-4" />;
        }
    };

    const getEventColor = (type: TimelineEvent["type"], status?: string) => {
        if (status === WblmMilestoneStatus.APPROVED_FINAL) {
            return "bg-emerald-500 text-white";
        }
        if (status === WblmMilestoneStatus.REVISION_REQUESTED) {
            return "bg-amber-500 text-white";
        }

        switch (type) {
            case "submission":
                return "bg-blue-500 text-white";
            case "review":
                return "bg-purple-500 text-white";
            case "reflection":
                return "bg-emerald-500 text-white";
            default:
                return "bg-slate-400 text-white";
        }
    };

    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };

    const item = {
        hidden: { opacity: 0, x: -20 },
        show: { opacity: 1, x: 0 }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl relative">
            {/* Background */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Back Button */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <Button asChild variant="ghost" className="mb-4 -ml-2">
                    <Link href={`/dashboard/admin/wblm/programs/${programId}/enrollments`}>
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
                <p className="text-xs uppercase font-bold tracking-widest text-blue-500 mb-1">
                    {program.title}
                </p>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold text-lg">
                        {participant?.name?.charAt(0).toUpperCase() || <User className="w-6 h-6" />}
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                            {participant?.name || "Peserta"}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            {participant?.email}
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Timeline */}
            <Card className="border-slate-200 dark:border-white/5">
                <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Timeline Aktivitas ({timelineEvents.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {timelineEvents.length > 0 ? (
                        <motion.div
                            variants={container}
                            initial="hidden"
                            animate="show"
                            className="relative"
                        >
                            {/* Timeline line */}
                            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-white/10" />

                            <div className="space-y-6">
                                {timelineEvents.map((event) => (
                                    <motion.div
                                        key={event.id}
                                        variants={item}
                                        className="relative flex gap-4 pl-2"
                                    >
                                        {/* Icon */}
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10",
                                            getEventColor(event.type, event.status)
                                        )}>
                                            {getEventIcon(event.type)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 pb-4">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h4 className="font-bold text-slate-900 dark:text-white">
                                                    {event.title}
                                                </h4>
                                                <span className="text-xs text-slate-400 whitespace-nowrap">
                                                    {event.date.toLocaleDateString('id-ID', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                            {event.milestoneName && (
                                                <Badge variant="outline" className="mb-2 text-xs">
                                                    {event.milestoneName}
                                                </Badge>
                                            )}
                                            {event.description && (
                                                <p className="text-sm text-slate-500 line-clamp-2">
                                                    {event.description}
                                                </p>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    ) : (
                        <div className="text-center py-12">
                            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">Belum ada aktivitas tercatat</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
