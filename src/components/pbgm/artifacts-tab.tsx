"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    FileText,
    Upload,
    Plus,
    File,
    Download,
    Clock,
    CheckCircle2,
    AlertCircle,
    X,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getArtifacts, uploadArtifact } from "@/lib/actions/pbgm-artifact";
import { ProjectArtifact, SubmissionStatus, ArtifactFile } from "@/lib/pbgm/types";

interface ArtifactsTabProps {
    projectId: string;
    canEdit: boolean;
}

export function ArtifactsTab({ projectId, canEdit }: ArtifactsTabProps) {
    const [artifacts, setArtifacts] = useState<ProjectArtifact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [uploadData, setUploadData] = useState({
        title: "",
        notes: "",
        files: [] as ArtifactFile[]
    });

    const fetchArtifacts = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await getArtifacts(projectId);
            if (Array.isArray(result)) {
                setArtifacts(result);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchArtifacts();
    }, [fetchArtifacts]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        // Convert to ArtifactFile format (in real app, would upload to storage first)
        const newFiles: ArtifactFile[] = Array.from(files).map((file, idx) => ({
            id: `temp-${Date.now()}-${idx}`,
            storageUrl: URL.createObjectURL(file),
            filename: file.name,
            mimeType: file.type,
            size: file.size
        }));

        setUploadData(prev => ({
            ...prev,
            files: [...prev.files, ...newFiles]
        }));
    };

    const removeFile = (fileId: string) => {
        setUploadData(prev => ({
            ...prev,
            files: prev.files.filter(f => f.id !== fileId)
        }));
    };

    const handleUpload = async () => {
        if (uploadData.files.length === 0) return;

        setIsUploading(true);
        try {
            const result = await uploadArtifact(projectId, {
                title: uploadData.title || undefined,
                notes: uploadData.notes || undefined,
                files: uploadData.files
            });

            if ("artifact" in result) {
                await fetchArtifacts();
                setShowUploadForm(false);
                setUploadData({ title: "", notes: "", files: [] });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsUploading(false);
        }
    };

    const getStatusBadge = (status: SubmissionStatus) => {
        const styles: Record<SubmissionStatus, string> = {
            SUBMITTED: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
            UNDER_REVIEW: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
            REVISION_REQUESTED: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
            ACCEPTED: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        };

        const labels: Record<SubmissionStatus, string> = {
            SUBMITTED: "Disubmit",
            UNDER_REVIEW: "Dalam Review",
            REVISION_REQUESTED: "Perlu Revisi",
            ACCEPTED: "Diterima"
        };

        return (
            <Badge className={cn("font-medium text-[10px] uppercase tracking-wider", styles[status])}>
                {labels[status]}
            </Badge>
        );
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Upload Button */}
            {canEdit && !showUploadForm && (
                <Button
                    onClick={() => setShowUploadForm(true)}
                    className="bg-violet-600 hover:bg-violet-500 text-white"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Upload Artifact
                </Button>
            )}

            {/* Upload Form */}
            {showUploadForm && (
                <Card className="border-violet-200 dark:border-violet-500/20 bg-violet-50/50 dark:bg-violet-900/10">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Upload className="w-4 h-4 text-violet-500" />
                            Upload Artifact Baru
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Judul (Opsional)</Label>
                            <Input
                                id="title"
                                value={uploadData.title}
                                onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Judul artifact"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Catatan (Opsional)</Label>
                            <Textarea
                                id="notes"
                                value={uploadData.notes}
                                onChange={(e) => setUploadData(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Deskripsi atau catatan untuk artifact ini"
                                rows={2}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>File</Label>
                            <div className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl p-4 text-center">
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="file-upload"
                                />
                                <label
                                    htmlFor="file-upload"
                                    className="cursor-pointer flex flex-col items-center gap-2"
                                >
                                    <Upload className="w-8 h-8 text-slate-400" />
                                    <span className="text-sm text-slate-500">Klik untuk memilih file</span>
                                </label>
                            </div>

                            {/* File List */}
                            {uploadData.files.length > 0 && (
                                <div className="space-y-2 mt-3">
                                    {uploadData.files.map((file) => (
                                        <div
                                            key={file.id}
                                            className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5"
                                        >
                                            <div className="flex items-center gap-2">
                                                <File className="w-4 h-4 text-slate-400" />
                                                <span className="text-sm text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                                                    {file.filename}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    {formatFileSize(file.size)}
                                                </span>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeFile(file.id)}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowUploadForm(false);
                                    setUploadData({ title: "", notes: "", files: [] });
                                }}
                            >
                                Batal
                            </Button>
                            <Button
                                onClick={handleUpload}
                                disabled={isUploading || uploadData.files.length === 0}
                                className="bg-violet-600 hover:bg-violet-500 text-white"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4 mr-2" />
                                        Upload
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Artifacts List */}
            {artifacts.length > 0 ? (
                <div className="space-y-3">
                    {artifacts.map((artifact) => (
                        <Card key={artifact.id} className="border-slate-200 dark:border-white/5">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                            artifact.status === "ACCEPTED" ? "bg-emerald-100 dark:bg-emerald-900/30" :
                                                artifact.status === "REVISION_REQUESTED" ? "bg-orange-100 dark:bg-orange-900/30" :
                                                    "bg-slate-100 dark:bg-slate-800"
                                        )}>
                                            <FileText className={cn(
                                                "w-5 h-5",
                                                artifact.status === "ACCEPTED" ? "text-emerald-500" :
                                                    artifact.status === "REVISION_REQUESTED" ? "text-orange-500" :
                                                        "text-slate-500"
                                            )} />
                                        </div>

                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white">
                                                {artifact.title || `Artifact v${artifact.versionNumber}`}
                                            </h4>
                                            {artifact.notes && (
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                    {artifact.notes}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-3 mt-2">
                                                {getStatusBadge(artifact.status)}
                                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(artifact.createdAt).toLocaleDateString('id-ID', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    v{artifact.versionNumber}
                                                </span>
                                            </div>

                                            {/* Files */}
                                            {artifact.files.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {artifact.files.map((file) => (
                                                        <a
                                                            key={file.id}
                                                            href={file.storageUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs text-slate-600 dark:text-slate-300"
                                                        >
                                                            <File className="w-3 h-3" />
                                                            <span className="truncate max-w-[120px]">{file.filename}</span>
                                                            <Download className="w-3 h-3 text-slate-400" />
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="border-2 border-dashed border-slate-200 dark:border-white/5">
                    <CardContent className="py-12 text-center">
                        <FileText className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                            Belum ada Artifact
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-4">
                            Upload artifact pertama Anda untuk memulai
                        </p>
                        {canEdit && (
                            <Button
                                onClick={() => setShowUploadForm(true)}
                                className="bg-violet-600 hover:bg-violet-500 text-white"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Upload Artifact
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
