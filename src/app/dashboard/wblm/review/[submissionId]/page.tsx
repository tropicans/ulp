"use client";

import { useSession } from "next-auth/react";
import { redirect, useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    ArrowLeft,
    Send,
    CheckCircle2,
    AlertTriangle,
    User,
    FileText,
    File,
    Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getWblmSubmissionById } from "@/lib/actions/wblm-submission";
import { createWblmReview } from "@/lib/actions/wblm-review";
import { motion } from "framer-motion";
import { WblmReviewDecision } from "@/generated/prisma";

export default function ReviewWorkspacePage() {
    const { data: session, status } = useSession();
    const params = useParams();
    const router = useRouter();
    const submissionId = params.submissionId as string;

    const [submission, setSubmission] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [decision, setDecision] = useState<WblmReviewDecision | "">("");
    const [comments, setComments] = useState("");

    useEffect(() => {
        if (status === "unauthenticated") {
            redirect("/login");
        }

        async function fetchData() {
            if (!session?.user?.id || !submissionId) return;

            setIsLoading(true);
            try {
                const result = await getWblmSubmissionById(submissionId);
                setSubmission(result);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [session, status, submissionId]);

    const handleSubmitReview = async () => {
        if (!decision) {
            alert("Pilih keputusan review");
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await createWblmReview(submissionId, {
                decision: decision as WblmReviewDecision,
                commentsRichtext: comments || undefined
            });

            if ("error" in result) {
                alert(result.error);
            } else {
                router.push("/dashboard/wblm/reviewer");
            }
        } catch (err) {
            console.error(err);
            alert("Terjadi kesalahan");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (status === "loading" || isLoading) {
        return (
            <div className="container mx-auto px-4 py-32 flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">
                    Memuat Submission...
                </p>
            </div>
        );
    }

    if (!submission) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                    Submission Tidak Ditemukan
                </h1>
                <Button asChild variant="outline">
                    <Link href="/dashboard/wblm/reviewer">Kembali</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            {/* Background */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Back Button */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <Button asChild variant="ghost" className="mb-4 -ml-2">
                    <Link href="/dashboard/wblm/reviewer">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Kembali ke Queue
                    </Link>
                </Button>
            </motion.div>

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <p className="text-xs uppercase font-bold tracking-widest text-purple-500 mb-1">
                    Review Submission
                </p>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                    {submission.Milestone?.name}
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                    {submission.Milestone?.Program?.title}
                </p>
            </motion.div>

            <div className="grid gap-6">
                {/* Participant Info */}
                <Card className="border-slate-200 dark:border-white/5">
                    <CardContent className="p-5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                <User className="w-6 h-6 text-purple-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">
                                    {submission.Participant?.name}
                                </h3>
                                <p className="text-sm text-slate-500">
                                    {submission.Participant?.email} • Versi {submission.versionNumber}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Submission Content */}
                <Card className="border-slate-200 dark:border-white/5">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Submission
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {submission.notes && (
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                    {submission.notes}
                                </p>
                            </div>
                        )}

                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                                Files Uploaded
                            </h4>
                            <div className="space-y-2">
                                {submission.files?.map((file: any) => (
                                    <div
                                        key={file.id}
                                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5"
                                    >
                                        <div className="flex items-center gap-3">
                                            <File className="w-5 h-5 text-slate-400" />
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white text-sm">
                                                    {file.filename}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    {(file.size / 1024).toFixed(1)} KB
                                                </p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm">
                                            <Download className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Previous Reviews */}
                {submission.Reviews?.length > 0 && (
                    <Card className="border-slate-200 dark:border-white/5">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">
                                Review Sebelumnya
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {submission.Reviews.map((review: any) => (
                                <div key={review.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-medium text-sm">{review.Reviewer?.name}</span>
                                        <span className={cn(
                                            "text-xs px-2 py-0.5 rounded",
                                            review.decision === WblmReviewDecision.ACCEPT
                                                ? "bg-emerald-100 text-emerald-600"
                                                : "bg-orange-100 text-orange-600"
                                        )}>
                                            {review.decision === WblmReviewDecision.ACCEPT ? "Disetujui" : "Revisi"}
                                        </span>
                                    </div>
                                    {review.commentsRichtext && (
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            {review.commentsRichtext}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Review Form */}
                <Card className="border-2 border-purple-200 dark:border-purple-900/30">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-purple-500" />
                            Submit Review
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <Label className="text-sm font-bold mb-3 block">Keputusan *</Label>
                            <RadioGroup
                                value={decision}
                                onValueChange={(v) => setDecision(v as WblmReviewDecision)}
                                className="grid grid-cols-2 gap-4"
                            >
                                <div className={cn(
                                    "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                    decision === WblmReviewDecision.ACCEPT
                                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                                        : "border-slate-200 dark:border-white/5 hover:border-slate-300"
                                )}>
                                    <RadioGroupItem value={WblmReviewDecision.ACCEPT} id="accept" />
                                    <label htmlFor="accept" className="cursor-pointer flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            <span className="font-bold text-slate-900 dark:text-white">Setujui</span>
                                        </div>
                                        <p className="text-xs text-slate-500">Artifact memenuhi standar</p>
                                    </label>
                                </div>
                                <div className={cn(
                                    "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                    decision === WblmReviewDecision.REQUEST_REVISION
                                        ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                                        : "border-slate-200 dark:border-white/5 hover:border-slate-300"
                                )}>
                                    <RadioGroupItem value={WblmReviewDecision.REQUEST_REVISION} id="revision" />
                                    <label htmlFor="revision" className="cursor-pointer flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                                            <span className="font-bold text-slate-900 dark:text-white">Minta Revisi</span>
                                        </div>
                                        <p className="text-xs text-slate-500">Perlu perbaikan</p>
                                    </label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div>
                            <Label className="text-sm font-bold mb-2 block">Komentar & Feedback</Label>
                            <Textarea
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                placeholder="Berikan feedback konstruktif untuk peserta..."
                                rows={4}
                            />
                        </div>

                        <Button
                            onClick={handleSubmitReview}
                            disabled={!decision || isSubmitting}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold h-12"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    Mengirim...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Submit Review
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
