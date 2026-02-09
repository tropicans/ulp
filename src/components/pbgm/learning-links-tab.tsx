"use client";

import React from "react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Link2,
    Video,
    Users,
    GraduationCap,
    MonitorPlay,
    Plus,
    ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LearningLink } from "@/lib/pbgm/types";

interface LearningLinksTabProps {
    projectId: string;
    canEdit: boolean;
}

export function LearningLinksTab({ projectId, canEdit }: LearningLinksTabProps) {
    const [links, setLinks] = useState<LearningLink[]>([]);

    const getTypeIcon = (type: LearningLink["type"]): React.ReactNode => {
        const icons: Record<LearningLink["type"], React.ReactNode> = {
            ASYNC: <Video className="w-4 h-4" />,
            SYNC: <MonitorPlay className="w-4 h-4" />,
            WEBINAR: <Users className="w-4 h-4" />,
            CLASSROOM: <GraduationCap className="w-4 h-4" />,
            HYBRID: <Users className="w-4 h-4" />
        };
        return icons[type];
    };

    const getTypeLabel = (type: LearningLink["type"]) => {
        const labels: Record<LearningLink["type"], string> = {
            ASYNC: "Async Learning",
            SYNC: "Sync Learning",
            WEBINAR: "Webinar",
            CLASSROOM: "Classroom",
            HYBRID: "Hybrid"
        };
        return labels[type];
    };

    const getTypeColor = (type: LearningLink["type"]) => {
        const colors: Record<LearningLink["type"], string> = {
            ASYNC: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
            SYNC: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
            WEBINAR: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
            CLASSROOM: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
            HYBRID: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400"
        };
        return colors[type];
    };

    return (
        <div className="space-y-4">
            {/* Info Card */}
            <Card className="border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/30">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <Link2 className="w-5 h-5 text-slate-400 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                                Learning Links (Opsional)
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Lampirkan sumber belajar yang relevan dengan project Anda.
                                Ini bersifat opsional dan tidak mempengaruhi finalisasi project.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Links List */}
            {links.length > 0 ? (
                <div className="space-y-3">
                    {links.map((link) => (
                        <Card key={link.id} className="border-slate-200 dark:border-white/5">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-lg flex items-center justify-center",
                                            getTypeColor(link.type)
                                        )}>
                                            {getTypeIcon(link.type)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white">
                                                {link.title}
                                            </h4>
                                            <p className="text-xs text-slate-400">
                                                {getTypeLabel(link.type)}
                                            </p>
                                        </div>
                                    </div>

                                    {link.url && (
                                        <Button asChild variant="outline" size="sm">
                                            <a href={link.url} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </Button>
                                    )}
                                </div>

                                {link.notes && (
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 pl-13">
                                        {link.notes}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="border-2 border-dashed border-slate-200 dark:border-white/5">
                    <CardContent className="py-12 text-center">
                        <Link2 className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                            Belum ada Learning Links
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-4 max-w-md mx-auto">
                            Tambahkan tautan ke kursus, webinar, atau sumber belajar lain yang mendukung project Anda
                        </p>
                        {canEdit && (
                            <Button
                                variant="outline"
                                className="border-slate-200 dark:border-white/10"
                                onClick={() => {
                                    // TODO: Implement add learning link modal
                                    alert("Fitur ini sedang dalam pengembangan")
                                }}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Tambah Learning Link
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Add Button (when there are existing links) */}
            {canEdit && links.length > 0 && (
                <Button
                    variant="outline"
                    className="w-full border-dashed border-slate-200 dark:border-white/10"
                    onClick={() => {
                        alert("Fitur ini sedang dalam pengembangan")
                    }}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Learning Link
                </Button>
            )}
        </div>
    );
}
