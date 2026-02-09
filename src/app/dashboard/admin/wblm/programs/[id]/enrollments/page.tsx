"use client";

import { useSession } from "next-auth/react";
import { redirect, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    ArrowLeft,
    Users,
    UserPlus,
    Search,
    ChevronRight,
    MoreVertical,
    CheckCircle2,
    Clock,
    AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getWblmProgramById } from "@/lib/actions/wblm-program";
import { enrollWblmParticipants } from "@/lib/actions/wblm-enrollment";
import { motion } from "framer-motion";
import { WblmEnrollmentStatus } from "@/generated/prisma";

export default function EnrollmentManagerPage() {
    const { data: session, status } = useSession();
    const params = useParams();
    const programId = params.id as string;

    const [program, setProgram] = useState<any>(null);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newUserIds, setNewUserIds] = useState("");

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
                const result = await getWblmProgramById(programId);
                if (result) {
                    setProgram(result);
                    setEnrollments(result.Enrollments || []);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [session, status, programId]);

    const handleBulkEnroll = async () => {
        const userIds = newUserIds.split(/[,\n]/).map(id => id.trim()).filter(id => id);
        if (userIds.length === 0) {
            alert("Masukkan minimal satu User ID");
            return;
        }

        setIsEnrolling(true);
        try {
            const result = await enrollWblmParticipants(programId, {
                userIds
            });

            if ("error" in result) {
                alert(result.error);
            } else {
                setShowAddForm(false);
                setNewUserIds("");
                // Refresh
                const updated = await getWblmProgramById(programId);
                if (updated) {
                    setEnrollments(updated.Enrollments || []);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsEnrolling(false);
        }
    };

    if (status === "loading" || isLoading) {
        return (
            <div className="container mx-auto px-4 py-32 flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">
                    Memuat Enrollment...
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

    const getStatusBadge = (enrollmentStatus: WblmEnrollmentStatus) => {
        const styles = {
            [WblmEnrollmentStatus.INVITED]: { bg: "bg-yellow-100 text-yellow-600", label: "Invited" },
            [WblmEnrollmentStatus.ENROLLED]: { bg: "bg-blue-100 text-blue-600", label: "Enrolled" },
            [WblmEnrollmentStatus.ACTIVE]: { bg: "bg-emerald-100 text-emerald-600", label: "Active" },
            [WblmEnrollmentStatus.COMPLETED]: { bg: "bg-purple-100 text-purple-600", label: "Completed" },
            [WblmEnrollmentStatus.WITHDRAWN]: { bg: "bg-gray-100 text-gray-500", label: "Withdrawn" }
        };
        const style = styles[enrollmentStatus] || styles[WblmEnrollmentStatus.ENROLLED];
        return (
            <Badge className={cn("font-bold text-[10px] uppercase tracking-wider", style.bg)}>
                {style.label}
            </Badge>
        );
    };

    const filteredEnrollments = enrollments.filter(e =>
        e.Participant?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.Participant?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                        <Users className="w-6 h-6 text-blue-500" />
                        Enrollment Manager
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        {enrollments.length} peserta terdaftar
                    </p>
                </div>
                <Button
                    onClick={() => setShowAddForm(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Tambah Peserta
                </Button>
            </motion.div>

            {/* Add Form */}
            {showAddForm && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card className="border-blue-200 dark:border-blue-900/30 mb-6">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold">Tambah Peserta Baru</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-bold text-slate-700 dark:text-white block mb-2">
                                    User IDs (pisahkan dengan koma atau baris baru)
                                </label>
                                <textarea
                                    value={newUserIds}
                                    onChange={(e) => setNewUserIds(e.target.value)}
                                    placeholder="user-id-1, user-id-2, user-id-3"
                                    rows={3}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-sm"
                                />
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => { setShowAddForm(false); setNewUserIds(""); }}
                                >
                                    Batal
                                </Button>
                                <Button
                                    onClick={handleBulkEnroll}
                                    disabled={isEnrolling}
                                    className="bg-blue-600 hover:bg-blue-500 text-white"
                                >
                                    {isEnrolling ? "Mendaftarkan..." : "Daftarkan"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari peserta..."
                    className="pl-10 h-11"
                />
            </div>

            {/* Enrollments List */}
            <Card className="border-slate-200 dark:border-white/5">
                <CardContent className="p-0">
                    <motion.div
                        variants={container}
                        initial="hidden"
                        animate="show"
                        className="divide-y divide-slate-100 dark:divide-white/5"
                    >
                        {filteredEnrollments.length > 0 ? (
                            filteredEnrollments.map((enrollment) => (
                                <motion.div key={enrollment.id} variants={item}>
                                    <div className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold">
                                            {enrollment.Participant?.name?.charAt(0).toUpperCase() || "?"}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-900 dark:text-white truncate">
                                                {enrollment.Participant?.name || "Unknown"}
                                            </h4>
                                            <p className="text-sm text-slate-500 truncate">
                                                {enrollment.Participant?.email}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {getStatusBadge(enrollment.status)}
                                            <span className="text-xs text-slate-400">
                                                {new Date(enrollment.enrolledAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                            </span>
                                            <Button variant="ghost" size="sm">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="text-center py-16">
                                <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-500">
                                    {searchQuery ? "Tidak ada hasil" : "Belum ada peserta terdaftar"}
                                </p>
                            </div>
                        )}
                    </motion.div>
                </CardContent>
            </Card>
        </div>
    );
}
