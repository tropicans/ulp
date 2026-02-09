"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    BookOpen,
    Brain,
    MessageSquare,
    RefreshCcw,
    Lightbulb,
    CheckCircle2,
    Lock,
    Loader2,
    Save
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getReflection, submitReflection, canFinalizeProject, finalizeProject } from "@/lib/actions/pbgm-finalize";
import { ProjectReflection, ProjectStatus } from "@/lib/pbgm/types";

interface ReflectionTabProps {
    projectId: string;
    canEdit: boolean;
    projectStatus: ProjectStatus;
}

export function ReflectionTab({ projectId, canEdit, projectStatus }: ReflectionTabProps) {
    const [reflection, setReflection] = useState<ProjectReflection | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [canFinalize, setCanFinalize] = useState(false);
    const [finalizeReasons, setFinalizeReasons] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        assumptions: "",
        keyFeedback: "",
        whatChanged: "",
        whatLearned: ""
    });

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [reflectionResult, finalizeResult] = await Promise.all([
                getReflection(projectId),
                canFinalizeProject(projectId)
            ]);

            if (reflectionResult && !("error" in reflectionResult)) {
                setReflection(reflectionResult);
                setFormData({
                    assumptions: reflectionResult.assumptions || "",
                    keyFeedback: reflectionResult.keyFeedback || "",
                    whatChanged: reflectionResult.whatChanged || "",
                    whatLearned: reflectionResult.whatLearned || ""
                });
            }

            if (finalizeResult && !("error" in finalizeResult)) {
                setCanFinalize(finalizeResult.canFinalize);
                setFinalizeReasons(finalizeResult.reasons || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const result = await submitReflection(projectId, formData);
            if ("reflection" in result && result.reflection) {
                setReflection(result.reflection);
                await fetchData();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleFinalize = async () => {
        if (!confirm("Apakah Anda yakin ingin menyelesaikan project ini? Setelah finalisasi, project tidak dapat diubah lagi.")) {
            return;
        }

        setIsFinalizing(true);
        try {
            const result = await finalizeProject(projectId);
            if ("success" in result) {
                window.location.reload();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsFinalizing(false);
        }
    };

    const isLocked = reflection?.isComplete && projectStatus === "FINAL";
    const canEditReflection = canEdit && !isLocked;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Info Card */}
            <Card className="border-blue-200 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-900/10">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <BookOpen className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-blue-700 dark:text-blue-400 text-sm">
                                Refleksi Wajib untuk Finalisasi
                            </h4>
                            <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                                Lengkapi refleksi Anda untuk dapat menyelesaikan project. Refleksi membantu mendokumentasikan pembelajaran dan pertumbuhan Anda.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Reflection Form */}
            <Card className="border-slate-200 dark:border-white/5">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        {isLocked ? (
                            <>
                                <Lock className="w-5 h-5 text-slate-400" />
                                Refleksi Terkunci
                            </>
                        ) : reflection?.isComplete ? (
                            <>
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                Refleksi Tersimpan
                            </>
                        ) : (
                            <>
                                <BookOpen className="w-5 h-5 text-violet-500" />
                                Isi Refleksi
                            </>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Assumptions */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-white">
                            <Brain className="w-4 h-4 text-purple-500" />
                            Asumsi Awal
                        </Label>
                        <p className="text-xs text-slate-400 mb-2">
                            Apa asumsi atau ekspektasi awal Anda saat memulai project ini?
                        </p>
                        <Textarea
                            value={formData.assumptions}
                            onChange={(e) => setFormData(prev => ({ ...prev, assumptions: e.target.value }))}
                            placeholder="Contoh: Saya berasumsi bahwa..."
                            rows={3}
                            disabled={!canEditReflection}
                            className={cn(!canEditReflection && "opacity-70 cursor-not-allowed")}
                        />
                    </div>

                    {/* Key Feedback */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-white">
                            <MessageSquare className="w-4 h-4 text-blue-500" />
                            Feedback Utama
                        </Label>
                        <p className="text-xs text-slate-400 mb-2">
                            Apa feedback paling penting yang Anda terima selama project?
                        </p>
                        <Textarea
                            value={formData.keyFeedback}
                            onChange={(e) => setFormData(prev => ({ ...prev, keyFeedback: e.target.value }))}
                            placeholder="Contoh: Expert menyarankan untuk..."
                            rows={3}
                            disabled={!canEditReflection}
                            className={cn(!canEditReflection && "opacity-70 cursor-not-allowed")}
                        />
                    </div>

                    {/* What Changed */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-white">
                            <RefreshCcw className="w-4 h-4 text-orange-500" />
                            Apa yang Berubah
                        </Label>
                        <p className="text-xs text-slate-400 mb-2">
                            Bagaimana pendekatan atau pemahaman Anda berubah selama project?
                        </p>
                        <Textarea
                            value={formData.whatChanged}
                            onChange={(e) => setFormData(prev => ({ ...prev, whatChanged: e.target.value }))}
                            placeholder="Contoh: Awalnya saya berpikir... namun sekarang..."
                            rows={3}
                            disabled={!canEditReflection}
                            className={cn(!canEditReflection && "opacity-70 cursor-not-allowed")}
                        />
                    </div>

                    {/* What Learned */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-white">
                            <Lightbulb className="w-4 h-4 text-amber-500" />
                            Pembelajaran
                        </Label>
                        <p className="text-xs text-slate-400 mb-2">
                            Apa yang Anda pelajari dari project ini? Apa yang akan Anda lakukan berbeda di masa depan?
                        </p>
                        <Textarea
                            value={formData.whatLearned}
                            onChange={(e) => setFormData(prev => ({ ...prev, whatLearned: e.target.value }))}
                            placeholder="Contoh: Saya belajar bahwa..."
                            rows={3}
                            disabled={!canEditReflection}
                            className={cn(!canEditReflection && "opacity-70 cursor-not-allowed")}
                        />
                    </div>

                    {/* Actions */}
                    {canEditReflection && (
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/5">
                            <Button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="bg-violet-600 hover:bg-violet-500 text-white"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Simpan Refleksi
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Finalize Section */}
            {canEdit && !isLocked && (
                <Card className={cn(
                    "border-2",
                    canFinalize
                        ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-900/10"
                        : "border-slate-200 dark:border-white/5"
                )}>
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                                <h4 className={cn(
                                    "font-bold text-sm",
                                    canFinalize ? "text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-white"
                                )}>
                                    {canFinalize ? "Siap untuk Finalisasi" : "Finalisasi Project"}
                                </h4>
                                {!canFinalize && finalizeReasons.length > 0 && (
                                    <ul className="text-sm text-slate-500 dark:text-slate-400 mt-2 space-y-1">
                                        {finalizeReasons.map((reason, idx) => (
                                            <li key={idx} className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                {reason}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <Button
                                onClick={handleFinalize}
                                disabled={!canFinalize || isFinalizing}
                                className={cn(
                                    canFinalize
                                        ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                )}
                            >
                                {isFinalizing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Memproses...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Finalisasi Project
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
