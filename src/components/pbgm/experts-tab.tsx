"use client";

import React from "react";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    UserPlus,
    Users,
    X,
    Loader2,
    Search,
    UserCheck,
    AlertCircle
} from "lucide-react";
import { inviteExpert, removeExpert } from "@/lib/actions/pbgm-project";
import { motion, AnimatePresence } from "framer-motion";

interface ExpertsTabProps {
    projectId: string;
    canManage: boolean;
    currentExperts?: { id: string; name: string; email?: string }[];
}

export function ExpertsTab({ projectId, canManage, currentExperts = [] }: ExpertsTabProps) {
    const [experts, setExperts] = useState(currentExperts);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<{ id: string; name: string; email: string }[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isInviting, setIsInviting] = useState<string | null>(null);
    const [isRemoving, setIsRemoving] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Search users
    const handleSearch = async () => {
        if (!searchQuery.trim() || searchQuery.length < 3) {
            setError("Masukkan minimal 3 karakter untuk mencari");
            return;
        }

        setIsSearching(true);
        setError(null);
        setSearchResults([]);

        try {
            const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
            if (response.ok) {
                const data = await response.json();
                // Filter out already invited experts
                const filtered = data.users?.filter(
                    (u: any) => !experts.some(e => e.id === u.id)
                ) || [];
                setSearchResults(filtered);
                if (filtered.length === 0) {
                    setError("Tidak ditemukan user atau sudah diundang");
                }
            } else {
                setError("Gagal mencari user");
            }
        } catch (err) {
            setError("Terjadi kesalahan saat mencari");
        } finally {
            setIsSearching(false);
        }
    };

    // Invite expert
    const handleInvite = async (userId: string, userName: string) => {
        setIsInviting(userId);
        setError(null);

        try {
            const result = await inviteExpert(projectId, userId);
            if ("error" in result) {
                setError(result.error ?? "Gagal mengundang expert");
            } else {
                setExperts(prev => [...prev, { id: userId, name: userName }]);
                setSearchResults(prev => prev.filter(u => u.id !== userId));
                setSuccess(`${userName} berhasil diundang sebagai Expert`);
                setTimeout(() => setSuccess(null), 3000);
            }
        } catch (err) {
            setError("Gagal mengundang expert");
        } finally {
            setIsInviting(null);
        }
    };

    // Remove expert
    const handleRemove = async (userId: string, userName: string) => {
        if (!confirm(`Hapus ${userName} dari daftar Expert?`)) return;

        setIsRemoving(userId);
        setError(null);

        try {
            const result = await removeExpert(projectId, userId);
            if ("error" in result) {
                setError(result.error ?? "Gagal menghapus expert");
            } else {
                setExperts(prev => prev.filter(e => e.id !== userId));
                setSuccess(`${userName} dihapus dari Expert`);
                setTimeout(() => setSuccess(null), 3000);
            }
        } catch (err) {
            setError("Gagal menghapus expert");
        } finally {
            setIsRemoving(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Info Card */}
            <Card className="border-blue-200 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-900/10">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <Users className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-blue-700 dark:text-blue-400 text-sm">
                                Kelola Expert
                            </h4>
                            <p className="text-blue-600/80 dark:text-blue-300/60 text-sm mt-1">
                                Undang expert untuk memberikan feedback pada project Anda.
                                Expert dapat melihat artifact dan memberikan masukan.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Messages */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm flex items-center gap-2"
                    >
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </motion.div>
                )}
                {success && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2"
                    >
                        <UserCheck className="w-4 h-4" />
                        {success}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Current Experts */}
            <Card className="border-slate-200 dark:border-white/5">
                <CardContent className="p-6">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-violet-500" />
                        Expert Saat Ini ({experts.length})
                    </h3>

                    {experts.length === 0 ? (
                        <p className="text-slate-400 text-sm py-4 text-center">
                            Belum ada expert yang diundang
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {experts.map(expert => (
                                <div
                                    key={expert.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                                            <span className="text-violet-600 dark:text-violet-400 font-bold">
                                                {expert.name?.charAt(0)?.toUpperCase() || "?"}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">
                                                {expert.name}
                                            </p>
                                            <Badge variant="outline" className="text-xs">
                                                Expert
                                            </Badge>
                                        </div>
                                    </div>
                                    {canManage && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemove(expert.id, expert.name)}
                                            disabled={isRemoving === expert.id}
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            {isRemoving === expert.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <X className="w-4 h-4" />
                                            )}
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Invite New Expert */}
            {canManage && (
                <Card className="border-slate-200 dark:border-white/5">
                    <CardContent className="p-6">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-emerald-500" />
                            Undang Expert Baru
                        </h3>

                        <div className="flex gap-2 mb-4">
                            <Input
                                placeholder="Cari nama atau email user..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                className="flex-1"
                            />
                            <Button
                                onClick={handleSearch}
                                disabled={isSearching}
                                className="bg-violet-600 hover:bg-violet-500"
                            >
                                {isSearching ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Search className="w-4 h-4" />
                                )}
                            </Button>
                        </div>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm text-slate-500 mb-2">
                                    Hasil pencarian ({searchResults.length})
                                </p>
                                {searchResults.map(user => (
                                    <div
                                        key={user.id}
                                        className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                <span className="text-slate-600 dark:text-slate-400 font-bold">
                                                    {user.name?.charAt(0)?.toUpperCase() || "?"}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white">
                                                    {user.name}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => handleInvite(user.id, user.name)}
                                            disabled={isInviting === user.id}
                                            className="bg-emerald-600 hover:bg-emerald-500"
                                        >
                                            {isInviting === user.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <UserPlus className="w-4 h-4 mr-1" />
                                                    Undang
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
