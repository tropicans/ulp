"use client";

import { useSession } from "next-auth/react";
import { redirect, useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    ArrowLeft,
    Upload,
    FileText,
    CheckCircle2,
    Clock,
    MessageSquare,
    Send,
    File,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getWblmMilestoneById } from "@/lib/actions/wblm-milestone";
import { createWblmSubmission, createWblmRevision } from "@/lib/actions/wblm-submission";
import { motion } from "framer-motion";
import { WblmMilestoneStatus, WblmReviewDecision } from "@/generated/prisma";

export default function WblmMilestonePage() {
    const { data: session, status } = useSession();
    const params = useParams();
    const router = useRouter();
    const programId = params.id as string;
    const milestoneId = params.milestoneId as string;

    const [milestone, setMilestone] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [notes, setNotes] = useState("");
    const [files, setFiles] = useState<any[]>([]);

    useEffect(() => {
        if (status === "unauthenticated") {
            redirect("/login");
        }

        async function fetchData() {
            if (!session?.user?.id || !milestoneId) return;

            setIsLoading(true);
            try {
                const result = await getWblmMilestoneById(milestoneId);
                setMilestone(result);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [session, status, milestoneId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files).map(file => ({
                id: crypto.randomUUID(),
                filename: file.name,
                mime: file.type,
                size: file.size,
                storageUrl: URL.createObjectURL(file), // Placeholder - should be uploaded to storage
                file // Keep reference for actual upload
            }));
            setFiles(prev => [...prev, ...newFiles]);
        }
    };

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const handleSubmit = async () => {
        if (files.length === 0) return;

        setIsSubmitting(true);
        try {
            // TODO: Actually upload files to storage and get real URLs
            const fileRefs = files.map(f => ({
                id: f.id,
                filename: f.filename,
                mime: f.mime,
                size: f.size,
                storageUrl: f.storageUrl // In production, this would be the real storage URL
            }));

            const hasExistingSubmission = milestone?.Submissions?.length > 0;

            let result;
            if (hasExistingSubmission) {
                const latestSubmission = milestone.Submissions[0];
                result = await createWblmRevision(latestSubmission.id, {
                    notes,
                    files: fileRefs
                });
            } else {
                result = await createWblmSubmission(milestoneId, {
                    notes,
                    files: fileRefs
                });
            }

            if ("error" in result) {
                alert(result.error);
            } else {
                setShowUpload(false);
                setFiles([]);
                setNotes("");
                // Refresh data
                const updated = await getWblmMilestoneById(milestoneId);
                setMilestone(updated);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (status === "loading" || isLoading) {
        return (
            <div className="container mx-auto px-4 py-32 flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">
                    Memuat Milestone...
                </p>
            </div>
        );
    }

    if (!milestone) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                    Milestone Tidak Ditemukan
                </h1>
                <Button asChild variant="outline">
                    <Link href={`/dashboard/wblm/programs/${programId}`}>Kembali</Link>
                </Button>
            </div>
        );
    }

    const currentStatus = milestone.ParticipantMilestones?.[0]?.status || WblmMilestoneStatus.NOT_STARTED;
    const submissions = milestone.Submissions || [];
    const latestSubmission = submissions[0];
    const canSubmit = [
        WblmMilestoneStatus.NOT_STARTED,
        WblmMilestoneStatus.IN_PROGRESS,
        WblmMilestoneStatus.REVISION_REQUESTED
    ].includes(currentStatus);

    return (
        <div className="container mx-auto px-4 py-8 relative max-w-4xl">
            {/* Background */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Back Button */}
            <Button asChild variant="ghost" className="mb-4 -ml-2 text-slate-600 dark:text-slate-400">
                <Link href={`/dashboard/wblm/programs/${programId}`}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Kembali ke Program
                </Link>
            </Button>

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                    <div>
                        <p className="text-xs uppercase font-bold tracking-widest text-emerald-500 mb-1">
                            Milestone
                        </p>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                            {milestone.name}
                        </h1>
                    </div>
                    <Badge className={cn(
                        "font-bold text-xs uppercase tracking-wider px-3 py-1",
                        currentStatus === WblmMilestoneStatus.APPROVED_FINAL && "bg-emerald-100 text-emerald-600",
                        currentStatus === WblmMilestoneStatus.REVISION_REQUESTED && "bg-orange-100 text-orange-600"
                    )}>
                        {currentStatus.replace(/_/g, " ")}
                    </Badge>
                </div>
                {milestone.description && (
                    <p className="text-slate-500 dark:text-slate-400">
                        {milestone.description}
                    </p>
                )}
            </motion.div>

            <div className="grid gap-6">
                {/* Required Artifacts */}
                <Card className="border-slate-200 dark:border-white/5">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Artifact yang Diperlukan
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {milestone.requiredArtifactTypes?.map((type: string) => (
                                <Badge key={type} variant="outline" className="px-3 py-1">
                                    {type}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Submissions History */}
                {submissions.length > 0 && (
                    <Card className="border-slate-200 dark:border-white/5">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <Upload className="w-4 h-4" />
                                Riwayat Submission ({submissions.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {submissions.map((sub: any, idx: number) => (
                                <div key={sub.id} className={cn(
                                    "p-4 rounded-xl border",
                                    idx === 0
                                        ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-900/10"
                                        : "border-slate-200 bg-slate-50/50 dark:border-white/5 dark:bg-white/5"
                                )}>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-bold text-slate-900 dark:text-white">
                                            Versi {sub.versionNumber}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            {new Date(sub.createdAt).toLocaleDateString('id-ID', {
                                                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    {sub.notes && (
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                                            {sub.notes}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {sub.files?.map((file: any) => (
                                            <div key={file.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-sm">
                                                <File className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="text-slate-700 dark:text-slate-300">{file.filename}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Reviews */}
                                    {sub.Reviews?.length > 0 && (
                                        <div className="border-t border-slate-200 dark:border-white/10 pt-3 mt-3 space-y-2">
                                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Review</p>
                                            {sub.Reviews.map((review: any) => (
                                                <div key={review.id} className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-slate-950/50">
                                                    <MessageSquare className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-medium text-sm text-slate-900 dark:text-white">
                                                                {review.Reviewer?.name || "Reviewer"}
                                                            </span>
                                                            <Badge className={cn(
                                                                "text-[10px]",
                                                                review.decision === WblmReviewDecision.ACCEPT && "bg-emerald-100 text-emerald-600",
                                                                review.decision === WblmReviewDecision.REQUEST_REVISION && "bg-orange-100 text-orange-600"
                                                            )}>
                                                                {review.decision === WblmReviewDecision.ACCEPT ? "Disetujui" : "Revisi"}
                                                            </Badge>
                                                        </div>
                                                        {review.commentsRichtext && (
                                                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                                                {review.commentsRichtext}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Upload Form */}
                {canSubmit && (
                    <Card className="border-slate-200 dark:border-white/5 border-2 border-dashed">
                        <CardContent className="p-6">
                            {!showUpload ? (
                                <div className="text-center py-8">
                                    <Upload className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                        {submissions.length > 0 ? "Submit Revisi" : "Submit Artifact"}
                                    </h3>
                                    <p className="text-sm text-slate-400 mb-6">
                                        Upload dokumen hasil kerja Anda
                                    </p>
                                    <Button onClick={() => setShowUpload(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                                        <Upload className="w-4 h-4 mr-2" />
                                        Mulai Upload
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-sm font-bold text-slate-700 dark:text-white mb-2 block">
                                            Files
                                        </Label>
                                        <input
                                            type="file"
                                            multiple
                                            onChange={handleFileChange}
                                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-emerald-900/30 dark:file:text-emerald-400"
                                        />
                                        {files.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                {files.map(file => (
                                                    <div key={file.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-sm">
                                                        <File className="w-3.5 h-3.5 text-slate-400" />
                                                        <span className="text-slate-700 dark:text-slate-300">{file.filename}</span>
                                                        <button onClick={() => removeFile(file.id)} className="text-slate-400 hover:text-red-500">
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <Label className="text-sm font-bold text-slate-700 dark:text-white mb-2 block">
                                            Catatan (Opsional)
                                        </Label>
                                        <Textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Tambahkan catatan untuk reviewer..."
                                            rows={3}
                                        />
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setShowUpload(false);
                                                setFiles([]);
                                                setNotes("");
                                            }}
                                        >
                                            Batal
                                        </Button>
                                        <Button
                                            onClick={handleSubmit}
                                            disabled={files.length === 0 || isSubmitting}
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                                    Mengirim...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4 mr-2" />
                                                    Submit
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Approved State */}
                {currentStatus === WblmMilestoneStatus.APPROVED_FINAL && (
                    <Card className="border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10">
                        <CardContent className="p-6 text-center">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mb-2">
                                Milestone Disetujui!
                            </h3>
                            <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80">
                                Artifact Anda telah direview dan disetujui oleh reviewer.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
