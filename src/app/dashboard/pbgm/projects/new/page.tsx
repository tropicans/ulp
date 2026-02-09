"use client";

import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    ArrowLeft,
    Sparkles,
    Target,
    Shield,
    FileOutput,
    Loader2
} from "lucide-react";
import { createProject } from "@/lib/actions/pbgm-project";
import { motion } from "framer-motion";

export default function NewProjectPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: "",
        purpose: "",
        context: "",
        safeToLearnNote: "",
        expectedOutputs: ""
    });

    if (status === "loading") {
        return (
            <div className="container mx-auto px-4 py-32 flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mb-4" />
            </div>
        );
    }

    if (status === "unauthenticated") {
        redirect("/login");
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const result = await createProject(formData);

            if ("error" in result) {
                setError(result.error ?? "Terjadi kesalahan");
            } else if (result.project) {
                router.push(`/dashboard/pbgm/projects/${result.project.id}`);
            }
        } catch (err) {
            setError("Terjadi kesalahan. Silakan coba lagi.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 relative max-w-3xl">
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
                className="mb-8"
            >
                <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 mb-2">
                    <Sparkles className="w-8 h-8 text-violet-500" />
                    Buat Project Challenge
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                    Definisikan tantangan pertumbuhan yang ingin Anda capai
                </p>
            </motion.div>

            {/* Form */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <form onSubmit={handleSubmit}>
                    <Card className="border-slate-200 dark:border-white/5">
                        <CardContent className="p-6 space-y-6">
                            {/* Title */}
                            <div className="space-y-2">
                                <Label htmlFor="title" className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-white">
                                    <Target className="w-4 h-4 text-violet-500" />
                                    Judul Project *
                                </Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Contoh: Implementasi Sistem Review Kinerja"
                                    className="border-slate-200 dark:border-white/10"
                                    required
                                />
                            </div>

                            {/* Purpose */}
                            <div className="space-y-2">
                                <Label htmlFor="purpose" className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-white">
                                    <Target className="w-4 h-4 text-blue-500" />
                                    Tujuan (Purpose)
                                </Label>
                                <Textarea
                                    id="purpose"
                                    value={formData.purpose}
                                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                    placeholder="Apa yang ingin dicapai dengan project ini?"
                                    rows={3}
                                    className="border-slate-200 dark:border-white/10"
                                />
                            </div>

                            {/* Context */}
                            <div className="space-y-2">
                                <Label htmlFor="context" className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-white">
                                    <FileOutput className="w-4 h-4 text-emerald-500" />
                                    Konteks
                                </Label>
                                <Textarea
                                    id="context"
                                    value={formData.context}
                                    onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                                    placeholder="Latar belakang dan situasi yang mendorong project ini"
                                    rows={3}
                                    className="border-slate-200 dark:border-white/10"
                                />
                            </div>

                            {/* Safe to Learn Note */}
                            <div className="space-y-2">
                                <Label htmlFor="safeToLearnNote" className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-white">
                                    <Shield className="w-4 h-4 text-amber-500" />
                                    Catatan Safe-to-Learn
                                </Label>
                                <Textarea
                                    id="safeToLearnNote"
                                    value={formData.safeToLearnNote}
                                    onChange={(e) => setFormData({ ...formData, safeToLearnNote: e.target.value })}
                                    placeholder="Apa yang boleh 'gagal' atau dipelajari dari kesalahan? Area apa yang aman untuk bereksperimen?"
                                    rows={2}
                                    className="border-slate-200 dark:border-white/10"
                                />
                                <p className="text-xs text-slate-400">
                                    Catatan ini membantu menciptakan ruang aman untuk belajar dan bereksperimen
                                </p>
                            </div>

                            {/* Expected Outputs */}
                            <div className="space-y-2">
                                <Label htmlFor="expectedOutputs" className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-white">
                                    <FileOutput className="w-4 h-4 text-purple-500" />
                                    Output yang Diharapkan
                                </Label>
                                <Textarea
                                    id="expectedOutputs"
                                    value={formData.expectedOutputs}
                                    onChange={(e) => setFormData({ ...formData, expectedOutputs: e.target.value })}
                                    placeholder="Deskripsi hasil akhir yang diharapkan (bisa berupa dokumen, prototipe, analisis, dll)"
                                    rows={3}
                                    className="border-slate-200 dark:border-white/10"
                                />
                            </div>

                            {/* Error Display */}
                            {error && (
                                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Submit Button */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/5">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.back()}
                                    disabled={isSubmitting}
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || !formData.title}
                                    className="bg-violet-600 hover:bg-violet-500 text-white"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            Buat Project
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </motion.div>
        </div>
    );
}
