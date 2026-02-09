"use client";

import { useSession } from "next-auth/react";
import { redirect, useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    ArrowLeft,
    MessageSquare,
    Save,
    CheckCircle2,
    Lightbulb,
    Target,
    AlertCircle,
    Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getWblmReflection, submitWblmReflection } from "@/lib/actions/wblm-reflection";
import { motion } from "framer-motion";

type ReflectionData = {
    initialAssumptions: string;
    whatChanged: string;
    keyFeedback: string;
    whatWouldDoDifferently: string;
    additionalNotes: string;
};

export default function ReflectionPage() {
    const { data: session, status } = useSession();
    const params = useParams();
    const router = useRouter();
    const programId = params.id as string;

    const [existingReflection, setExistingReflection] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState<ReflectionData>({
        initialAssumptions: "",
        whatChanged: "",
        keyFeedback: "",
        whatWouldDoDifferently: "",
        additionalNotes: ""
    });

    useEffect(() => {
        if (status === "unauthenticated") {
            redirect("/login");
        }

        async function fetchData() {
            if (!session?.user?.id || !programId) return;

            setIsLoading(true);
            try {
                const result = await getWblmReflection(programId);
                if (result && !("error" in result)) {
                    setExistingReflection(result);
                    const answers = result.answers as any;
                    if (answers) {
                        setFormData({
                            initialAssumptions: answers.initialAssumptions || "",
                            whatChanged: answers.whatChanged || "",
                            keyFeedback: answers.keyFeedback || "",
                            whatWouldDoDifferently: answers.whatWouldDoDifferently || "",
                            additionalNotes: answers.additionalNotes || ""
                        });
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [session, status, programId]);

    const handleSubmit = async () => {
        const hasContent = Object.values(formData).some(v => v.trim().length > 0);
        if (!hasContent) {
            alert("Silakan isi minimal satu bagian refleksi");
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await submitWblmReflection(programId, {
                answers: formData
            });

            if ("error" in result) {
                alert(result.error);
            } else {
                const updated = await getWblmReflection(programId);
                setExistingReflection(updated);
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
                <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">
                    Memuat Refleksi...
                </p>
            </div>
        );
    }

    const isLocked = existingReflection?.lockedAt;

    const reflectionFields = [
        {
            key: "initialAssumptions",
            label: "Asumsi Awal",
            icon: Lightbulb,
            placeholder: "Apa asumsi atau ekspektasi Anda sebelum memulai program ini?",
            color: "text-amber-500"
        },
        {
            key: "whatChanged",
            label: "Apa yang Berubah?",
            icon: AlertCircle,
            placeholder: "Bagaimana pemahaman atau perspektif Anda berubah?",
            color: "text-red-500"
        },
        {
            key: "keyFeedback",
            label: "Feedback Utama",
            icon: Target,
            placeholder: "Apa feedback penting yang Anda terima?",
            color: "text-blue-500"
        },
        {
            key: "whatWouldDoDifferently",
            label: "Apa yang Akan Dilakukan Berbeda?",
            icon: CheckCircle2,
            placeholder: "Jika bisa mengulang, apa yang akan Anda lakukan berbeda?",
            color: "text-emerald-500"
        },
        {
            key: "additionalNotes",
            label: "Catatan Tambahan",
            icon: MessageSquare,
            placeholder: "Catatan atau refleksi lainnya...",
            color: "text-purple-500"
        }
    ];

    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl relative">
            {/* Background */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Back Button */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <Button asChild variant="ghost" className="mb-4 -ml-2">
                    <Link href={`/dashboard/wblm/programs/${programId}`}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Kembali ke Program
                    </Link>
                </Button>
            </motion.div>

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                        <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                        Refleksi Akhir
                    </h1>
                    {isLocked && (
                        <Lock className="w-5 h-5 text-slate-400" />
                    )}
                </div>
                <p className="text-slate-500 dark:text-slate-400">
                    Renungkan perjalanan belajar Anda selama program ini
                </p>
            </motion.div>

            {/* Locked State */}
            {isLocked && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <Card className="border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10 mb-6">
                        <CardContent className="p-4 flex items-center gap-3">
                            <Lock className="w-5 h-5 text-emerald-600" />
                            <div>
                                <p className="font-bold text-emerald-700 dark:text-emerald-400">
                                    Refleksi Terkunci
                                </p>
                                <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80">
                                    Dikunci pada {new Date(isLocked).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Form */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-6"
            >
                {reflectionFields.map((field) => (
                    <Card key={field.key} className="border-slate-200 dark:border-white/5">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <field.icon className={cn("w-5 h-5", field.color)} />
                                {field.label}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                value={formData[field.key as keyof ReflectionData]}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    [field.key]: e.target.value
                                })}
                                placeholder={field.placeholder}
                                rows={4}
                                disabled={isLocked}
                                className={cn(isLocked && "opacity-60 cursor-not-allowed")}
                            />
                        </CardContent>
                    </Card>
                ))}

                {/* Submit Button */}
                {!isLocked && (
                    <div className="flex gap-4 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => router.back()}
                            className="flex-1"
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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
            </motion.div>
        </div>
    );
}
