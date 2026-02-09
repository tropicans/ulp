"use client";

import React from "react";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    MessageSquare,
    CheckCircle2,
    AlertCircle,
    MessageCircle,
    User,
    Clock,
    Loader2,
    Send
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getFeedbackTrail, addProjectFeedback } from "@/lib/actions/pbgm-feedback";
import { ExpertFeedback, FeedbackDecision } from "@/lib/pbgm/types";
import { motion, AnimatePresence } from "framer-motion";

interface FeedbackTabProps {
    projectId: string;
    isExpert?: boolean;
    projectStatus?: string;
}

export function FeedbackTab({ projectId, isExpert = false, projectStatus }: FeedbackTabProps) {
    const { data: session } = useSession();
    const [feedback, setFeedback] = useState<ExpertFeedback[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Feedback form state
    const [comment, setComment] = useState("");
    const [decision, setDecision] = useState<FeedbackDecision>("COMMENT");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const fetchFeedback = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await getFeedbackTrail(projectId);
            if (Array.isArray(result)) {
                setFeedback(result);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchFeedback();
    }, [fetchFeedback]);

    const handleSubmitFeedback = async () => {
        if (!comment.trim()) {
            setSubmitError("Komentar tidak boleh kosong");
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const result = await addProjectFeedback(projectId, {
                decision,
                comment: comment.trim()
            });

            if ("error" in result) {
                setSubmitError(result.error ?? "Gagal mengirim feedback");
            } else {
                setSubmitSuccess(true);
                setComment("");
                setDecision("COMMENT");
                // Refresh feedback list
                await fetchFeedback();
                setTimeout(() => setSubmitSuccess(false), 3000);
            }
        } catch (err) {
            setSubmitError("Gagal mengirim feedback");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getDecisionBadge = (dec: FeedbackDecision) => {
        const styles: Record<FeedbackDecision, string> = {
            COMMENT: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
            REQUEST_REVISION: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
            ACCEPT: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        };

        const labels: Record<FeedbackDecision, string> = {
            COMMENT: "Komentar",
            REQUEST_REVISION: "Minta Revisi",
            ACCEPT: "Diterima"
        };

        const icons: Record<FeedbackDecision, React.ReactNode> = {
            COMMENT: <MessageCircle className="w-3 h-3" />,
            REQUEST_REVISION: <AlertCircle className="w-3 h-3" />,
            ACCEPT: <CheckCircle2 className="w-3 h-3" />
        };

        return (
            <Badge className={cn("font-medium text-[10px] uppercase tracking-wider flex items-center gap-1", styles[dec])}>
                {icons[dec]}
                {labels[dec]}
            </Badge>
        );
    };

    // Check if Expert can submit feedback (project must be UNDER_REVIEW or REVISION)
    const canSubmitFeedback = isExpert && ["UNDER_REVIEW", "REVISION", "ACTIVE"].includes(projectStatus || "");

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Expert Feedback Form */}
            {canSubmitFeedback && (
                <Card className="border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-900/10">
                    <CardContent className="p-6">
                        <h3 className="font-bold text-amber-700 dark:text-amber-400 mb-4 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5" />
                            Berikan Feedback
                        </h3>

                        {/* Decision Selector */}
                        <div className="mb-4">
                            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                                Tipe Feedback
                            </Label>
                            <div className="flex flex-wrap gap-2">
                                {(["COMMENT", "REQUEST_REVISION", "ACCEPT"] as FeedbackDecision[]).map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => setDecision(d)}
                                        className={cn(
                                            "px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm flex items-center gap-2",
                                            decision === d
                                                ? d === "COMMENT"
                                                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                    : d === "REQUEST_REVISION"
                                                        ? "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                                        : "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300"
                                        )}
                                    >
                                        {d === "COMMENT" && <MessageCircle className="w-4 h-4" />}
                                        {d === "REQUEST_REVISION" && <AlertCircle className="w-4 h-4" />}
                                        {d === "ACCEPT" && <CheckCircle2 className="w-4 h-4" />}
                                        {d === "COMMENT" && "Komentar"}
                                        {d === "REQUEST_REVISION" && "Minta Revisi"}
                                        {d === "ACCEPT" && "Terima"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Comment Textarea */}
                        <div className="mb-4">
                            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                                Komentar / Feedback
                            </Label>
                            <Textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Tulis feedback Anda di sini..."
                                rows={4}
                                className="resize-none"
                            />
                        </div>

                        {/* Messages */}
                        <AnimatePresence>
                            {submitError && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm"
                                >
                                    {submitError}
                                </motion.div>
                            )}
                            {submitSuccess && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Feedback berhasil dikirim!
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit Button */}
                        <Button
                            onClick={handleSubmitFeedback}
                            disabled={isSubmitting || !comment.trim()}
                            className="bg-amber-600 hover:bg-amber-500 text-white"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <Send className="w-4 h-4 mr-2" />
                            )}
                            Kirim Feedback
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Expert Info Card (when isExpert but can't submit) */}
            {isExpert && !canSubmitFeedback && (
                <Card className="border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-900/50">
                    <CardContent className="p-4">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            💡 Anda adalah Expert di project ini. Feedback dapat diberikan saat project dalam status "Dalam Review" atau "Revisi".
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Feedback List */}
            {feedback.length > 0 ? (
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-900 dark:text-white">
                        Riwayat Feedback ({feedback.length})
                    </h3>
                    {feedback.map((item, index) => (
                        <Card key={item.id} className="border-slate-200 dark:border-white/5">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                    {/* Timeline indicator */}
                                    <div className="flex flex-col items-center">
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center border-2",
                                            item.decision === "ACCEPT" ? "bg-emerald-100 border-emerald-500 dark:bg-emerald-900/30" :
                                                item.decision === "REQUEST_REVISION" ? "bg-orange-100 border-orange-500 dark:bg-orange-900/30" :
                                                    "bg-blue-100 border-blue-500 dark:bg-blue-900/30"
                                        )}>
                                            {item.decision === "ACCEPT" ? (
                                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                            ) : item.decision === "REQUEST_REVISION" ? (
                                                <AlertCircle className="w-5 h-5 text-orange-500" />
                                            ) : (
                                                <MessageCircle className="w-5 h-5 text-blue-500" />
                                            )}
                                        </div>
                                        {index < feedback.length - 1 && (
                                            <div className="w-0.5 h-8 bg-slate-200 dark:bg-slate-800 mt-2" />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                            {getDecisionBadge(item.decision)}
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                {item.expertName || "Expert"}
                                            </span>
                                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(item.createdAt).toLocaleDateString('id-ID', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>

                                        {item.comment && (
                                            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5">
                                                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                                    {item.comment}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="border-2 border-dashed border-slate-200 dark:border-white/5">
                    <CardContent className="py-12 text-center">
                        <MessageSquare className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                            Belum ada Feedback
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400">
                            {isExpert
                                ? "Berikan feedback pertama untuk project ini"
                                : "Feedback dari expert akan muncul di sini setelah Anda submit project untuk review"}
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
