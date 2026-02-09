"use client";

import { useSession } from "next-auth/react";
import { redirect, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    ArrowLeft,
    Download,
    Package,
    Users,
    CheckCircle2,
    FileText,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getWblmProgramById } from "@/lib/actions/wblm-program";
import { getWblmEvidenceSummary, exportWblmEvidence } from "@/lib/actions/wblm-evidence";
import { motion } from "framer-motion";
import { WblmEvidenceStatus } from "@/generated/prisma";

export default function EvidenceExportPage() {
    const { data: session, status } = useSession();
    const params = useParams();
    const programId = params.id as string;

    const [program, setProgram] = useState<any>(null);
    const [summary, setSummary] = useState<any>(null);
    const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") {
            redirect("/login");
        }

        async function fetchData() {
            if (!session?.user?.id || !programId) return;

            // Check admin access
            if (!["SUPER_ADMIN", "ADMIN_UNIT", "INSTRUCTOR"].includes(session.user.role)) {
                redirect("/dashboard");
            }

            setIsLoading(true);
            try {
                const [programResult, summaryResult] = await Promise.all([
                    getWblmProgramById(programId),
                    getWblmEvidenceSummary(programId)
                ]);
                setProgram(programResult);
                setSummary(summaryResult);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [session, status, programId]);

    const handleSelectAll = () => {
        if (!summary?.participants) return;

        const readyIds = summary.participants
            .filter((p: any) => p.status === WblmEvidenceStatus.READY || p.status === WblmEvidenceStatus.PUBLISHED)
            .map((p: any) => p.participantUserId);

        if (selectedParticipants.length === readyIds.length) {
            setSelectedParticipants([]);
        } else {
            setSelectedParticipants(readyIds);
        }
    };

    const handleToggleParticipant = (participantId: string) => {
        setSelectedParticipants(prev =>
            prev.includes(participantId)
                ? prev.filter(id => id !== participantId)
                : [...prev, participantId]
        );
    };

    const handleExport = async () => {
        if (selectedParticipants.length === 0) {
            alert("Pilih minimal satu peserta untuk diexport");
            return;
        }

        setIsExporting(true);
        try {
            const result = await exportWblmEvidence(programId);

            if (result && "error" in result) {
                alert(result.error);
            } else {
                // In a real app, this would trigger a file download
                alert(`Export berhasil! ${selectedParticipants.length} evidence package siap diunduh.`);
            }
        } catch (err) {
            console.error(err);
            alert("Gagal mengexport evidence");
        } finally {
            setIsExporting(false);
        }
    };

    if (status === "loading" || isLoading) {
        return (
            <div className="container mx-auto px-4 py-32 flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">
                    Memuat Evidence...
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

    const getStatusBadge = (evidenceStatus: WblmEvidenceStatus) => {
        const styles = {
            [WblmEvidenceStatus.NOT_READY]: { bg: "bg-slate-100 text-slate-600", label: "Belum Siap" },
            [WblmEvidenceStatus.READY]: { bg: "bg-amber-100 text-amber-600", label: "Siap" },
            [WblmEvidenceStatus.PUBLISHED]: { bg: "bg-emerald-100 text-emerald-600", label: "Terbit" },
            [WblmEvidenceStatus.EXPORTED]: { bg: "bg-blue-100 text-blue-500", label: "Diexport" }
        };
        const style = styles[evidenceStatus] || styles[WblmEvidenceStatus.NOT_READY];
        return (
            <Badge className={cn("font-bold text-[10px] uppercase tracking-wider", style.bg)}>
                {style.label}
            </Badge>
        );
    };

    const readyCount = summary?.participants?.filter(
        (p: any) => p.status === WblmEvidenceStatus.READY || p.status === WblmEvidenceStatus.PUBLISHED
    ).length || 0;

    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };

    const item = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="container mx-auto px-4 py-8 relative">
            {/* Background */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Back Button */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <Button asChild variant="ghost" className="mb-4 -ml-2">
                    <Link href={`/dashboard/admin/wblm/programs/${programId}`}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Kembali ke Program
                    </Link>
                </Button>
            </motion.div>

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4"
            >
                <div>
                    <p className="text-xs uppercase font-bold tracking-widest text-blue-500 mb-1">
                        {program.title}
                    </p>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <Package className="w-6 h-6 text-blue-500" />
                        Export Evidence
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        {readyCount} dari {summary?.participants?.length || 0} peserta siap diexport
                    </p>
                </div>
                <Button
                    onClick={handleExport}
                    disabled={isExporting || selectedParticipants.length === 0}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                    {isExporting ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Mengexport...
                        </>
                    ) : (
                        <>
                            <Download className="w-4 h-4 mr-2" />
                            Export ({selectedParticipants.length})
                        </>
                    )}
                </Button>
            </motion.div>

            {/* Summary Cards */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
            >
                <Card className="border-slate-200 dark:border-white/5">
                    <CardContent className="p-4">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1">Total Peserta</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">
                            {summary?.participants?.length || 0}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 dark:border-white/5">
                    <CardContent className="p-4">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1">Siap Export</p>
                        <p className="text-2xl font-black text-emerald-600">{readyCount}</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 dark:border-white/5">
                    <CardContent className="p-4">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1">Sudah Diexport</p>
                        <p className="text-2xl font-black text-blue-600">
                            {summary?.participants?.filter((p: any) => p.status === WblmEvidenceStatus.EXPORTED).length || 0}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 dark:border-white/5">
                    <CardContent className="p-4">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1">Dipilih</p>
                        <p className="text-2xl font-black text-purple-600">{selectedParticipants.length}</p>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Participants List */}
            <Card className="border-slate-200 dark:border-white/5">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Daftar Peserta
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={handleSelectAll}>
                        {selectedParticipants.length === readyCount ? "Batal Pilih" : "Pilih Semua Siap"}
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <motion.div
                        variants={container}
                        initial="hidden"
                        animate="show"
                        className="divide-y divide-slate-100 dark:divide-white/5"
                    >
                        {summary?.participants?.length > 0 ? (
                            summary.participants.map((participant: any) => {
                                const isReady = participant.status === WblmEvidenceStatus.READY ||
                                    participant.status === WblmEvidenceStatus.PUBLISHED;
                                const isSelected = selectedParticipants.includes(participant.participantUserId);

                                return (
                                    <motion.div key={participant.participantUserId} variants={item}>
                                        <div
                                            className={cn(
                                                "flex items-center gap-4 p-4 transition-colors",
                                                isReady ? "hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer" : "opacity-60",
                                                isSelected && "bg-blue-50 dark:bg-blue-900/20"
                                            )}
                                            onClick={() => isReady && handleToggleParticipant(participant.participantUserId)}
                                        >
                                            <Checkbox
                                                checked={isSelected}
                                                disabled={!isReady}
                                                className="data-[state=checked]:bg-blue-600"
                                            />
                                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold">
                                                {participant.Participant?.name?.charAt(0).toUpperCase() || "?"}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-900 dark:text-white truncate">
                                                    {participant.Participant?.name || "Unknown"}
                                                </h4>
                                                <p className="text-sm text-slate-500 truncate">
                                                    {participant.Participant?.email}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {getStatusBadge(participant.status)}
                                                {participant.status === WblmEvidenceStatus.EXPORTED && (
                                                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        ) : (
                            <div className="text-center py-16">
                                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-500">Belum ada data evidence</p>
                            </div>
                        )}
                    </motion.div>
                </CardContent>
            </Card>
        </div>
    );
}
