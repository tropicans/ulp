"use client";

import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    ArrowLeft,
    Plus,
    Calendar,
    Clock,
    Save
} from "lucide-react";
import { createWblmProgram } from "@/lib/actions/wblm-program";
import { motion } from "framer-motion";

export default function NewWblmProgramPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        durationWeeks: 12,
        startDate: "",
        endDate: "",
        targetRoles: [] as string[]
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title) {
            alert("Judul program wajib diisi");
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await createWblmProgram({
                title: formData.title,
                description: formData.description || undefined,
                durationWeeks: formData.durationWeeks,
                startDate: formData.startDate ? new Date(formData.startDate) : null,
                endDate: formData.endDate ? new Date(formData.endDate) : null,
                targetRoles: formData.targetRoles,
                reviewerPoolIds: []
            });

            if ("error" in result) {
                alert(result.error);
            } else {
                router.push(`/dashboard/admin/wblm/programs/${result.program.id}`);
            }
        } catch (err) {
            console.error(err);
            alert("Terjadi kesalahan");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (status === "loading") {
        return (
            <div className="container mx-auto px-4 py-32 flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
            </div>
        );
    }

    if (status === "unauthenticated") {
        redirect("/login");
    }

    if (session?.user?.role && !["SUPER_ADMIN", "ADMIN_UNIT", "INSTRUCTOR"].includes(session.user.role)) {
        redirect("/dashboard");
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
            {/* Back Button */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <Button asChild variant="ghost" className="mb-4 -ml-2">
                    <Link href="/dashboard/admin/wblm">
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
                <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
                    Buat Project PBGM Baru
                </h1>
                Konfigurasikan project pertumbuhan berbasis kerja
            </motion.div>

            {/* Form */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <form onSubmit={handleSubmit}>
                    <Card className="border-slate-200 dark:border-white/5">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold">Informasi Dasar</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label className="text-sm font-bold mb-2 block">Judul Program *</Label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Contoh: Orientasi Jabatan Fungsional"
                                    className="h-12"
                                />
                            </div>

                            <div>
                                <Label className="text-sm font-bold mb-2 block">Deskripsi</Label>
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Jelaskan tujuan dan gambaran umum program..."
                                    rows={4}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label className="text-sm font-bold mb-2 block flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-slate-400" />
                                        Durasi (Minggu)
                                    </Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={formData.durationWeeks}
                                        onChange={(e) => setFormData({ ...formData, durationWeeks: parseInt(e.target.value) || 1 })}
                                        className="h-12"
                                    />
                                </div>
                                <div>
                                    <Label className="text-sm font-bold mb-2 block flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        Tanggal Mulai
                                    </Label>
                                    <Input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className="h-12"
                                    />
                                </div>
                                <div>
                                    <Label className="text-sm font-bold mb-2 block flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        Tanggal Selesai
                                    </Label>
                                    <Input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        className="h-12"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex gap-4 mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}
                            className="flex-1"
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !formData.title}
                            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Simpan Program
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
