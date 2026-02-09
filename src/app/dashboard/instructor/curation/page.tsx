"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Plus,
    Search,
    Brain,
    CheckCircle,
    Clock,
    ExternalLink,
    History,
    Check,
    X,
    MoreVertical,
    ArrowRight,
    ListFilter,
    Trash2,
    PlayCircle,
    Sparkles,
    Award,
    Users
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    createCurationSession,
    getCurationSessions,
    getCurationSession,
    updateCandidateSelect,
    finalizeCuration
} from "@/lib/actions/curation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function CurationPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"new" | "workspace">("new");
    const [recentSessions, setRecentSessions] = useState<any[]>([]);
    const [currentSession, setCurrentSession] = useState<any>(null);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);

    // Form state
    const [topic, setTopic] = useState("");
    const [language, setLanguage] = useState("id");
    const [level, setLevel] = useState("beginner");
    const [duration, setDuration] = useState(60);
    const [includeChannels, setIncludeChannels] = useState("");
    const [excludeChannels, setExcludeChannels] = useState("");

    // Load recent sessions
    const loadRecent = useCallback(async () => {
        const res = await getCurationSessions(6);
        if (res.success) {
            setRecentSessions(res.sessions || []);
        }
    }, []);

    useEffect(() => {
        loadRecent();
    }, [loadRecent]);

    // Polling logic
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (currentSession && (currentSession.status === "searching" || currentSession.status === "scoring")) {
            interval = setInterval(async () => {
                const res = await getCurationSession(currentSession.id);
                if (res.success) {
                    setCurrentSession(res.session);
                    setCandidates(res.session.candidates || []);
                    setStats(res.stats);
                }
            }, 3000);
        }

        return () => clearInterval(interval);
    }, [currentSession]);

    const handleStartCuration = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = {
            topic,
            language,
            level,
            targetDurationMin: duration,
            includeChannels: includeChannels ? includeChannels.split(",").map(c => c.trim()) : [],
            excludeChannels: excludeChannels ? excludeChannels.split(",").map(c => c.trim()) : [],
        };

        const res = await createCurationSession(formData);
        setIsLoading(false);

        if (res.success && res.session) {
            toast.success("Curation session started!");
            setCurrentSession(res.session);
            setActiveTab("workspace");
        } else {
            toast.error(res.error || "Failed to start curation session");
        }
    };

    const loadSession = async (id: string) => {
        setIsLoading(true);
        const res = await getCurationSession(id);
        setIsLoading(false);

        if (res.success && res.session) {
            setCurrentSession(res.session);
            setCandidates(res.session.candidates || []);
            setStats(res.stats);
            setActiveTab("workspace");
        } else {
            toast.error("Failed to load session");
        }
    };

    const toggleSelection = async (candidateId: string, currentSelected: boolean) => {
        const newSelected = !currentSelected;
        // Optimistic update
        setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, selected: newSelected } : c));

        const res = await updateCandidateSelect(candidateId, newSelected, newSelected ? (stats?.selected || 0) + 1 : undefined);
        if (!res.success) {
            toast.error("Failed to update selection");
            // Rollback
            setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, selected: currentSelected } : c));
        } else {
            // Refresh stats after successful update
            const sessRes = await getCurationSession(currentSession.id);
            if (sessRes.success) {
                setStats(sessRes.stats);
            }
        }
    };

    const handleFinalize = async () => {
        if (!currentSession) return;
        setIsFinalizing(true);

        const res = await finalizeCuration(currentSession.id, {
            playlistTitle: `Kursus: ${currentSession.topic}`,
            playlistDescription: `AI-curated learning path for ${currentSession.topic}. Target level: ${currentSession.level}.`,
        });

        setIsFinalizing(false);

        if (res.success && res.playlistId && res.courseId) {
            toast.success("Course created! Memulai proses enrichment...");
            // Redirect to import-youtube page with query params to show progress
            router.push(`/dashboard/instructor/import-youtube?playlistId=${res.playlistId}&courseId=${res.courseId}`);
        } else if (res.success) {
            toast.success("Course created successfully!");
            router.push(`/dashboard/instructor/courses/${res.courseId}`);
        } else {
            toast.error(res.error || "Failed to finalize course");
        }
    };

    return (
        <div className="container mx-auto py-8 px-4 space-y-8">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Sparkles className="w-8 h-8 text-primary" />
                    AI Curation Lab
                </h1>
                <p className="text-muted-foreground max-w-2xl">
                    Build high-quality courses by leveraging AI to find and score the best educational content from YouTube.
                </p>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === "new" ? (
                    <motion.div
                        key="new"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="grid lg:grid-cols-3 gap-8"
                    >
                        {/* New Session Form */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Start New Curation</CardTitle>
                                <CardDescription>
                                    Define your topic and objectives to let AI explore the best videos for your course.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleStartCuration} className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="topic">Learning Topic</Label>
                                        <Input
                                            id="topic"
                                            placeholder="e.g., Intro to Machine Learning with Python"
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="language">Preferred Language</Label>
                                            <Select value={language} onValueChange={setLanguage}>
                                                <SelectTrigger id="language">
                                                    <SelectValue placeholder="Select language" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="id">Indonesian</SelectItem>
                                                    <SelectItem value="en">English</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="level">Target Level</Label>
                                            <Select value={level} onValueChange={setLevel}>
                                                <SelectTrigger id="level">
                                                    <SelectValue placeholder="Select level" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="beginner">Beginner</SelectItem>
                                                    <SelectItem value="intermediate">Intermediate</SelectItem>
                                                    <SelectItem value="advanced">Advanced</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="duration">Target Course Duration (minutes)</Label>
                                        <Input
                                            id="duration"
                                            type="number"
                                            min={10}
                                            max={600}
                                            value={duration}
                                            onChange={(e) => setDuration(parseInt(e.target.value))}
                                        />
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="include">Whitelisted Channels (optional)</Label>
                                            <Input
                                                id="include"
                                                placeholder="Channel A, Channel B"
                                                value={includeChannels}
                                                onChange={(e) => setIncludeChannels(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="exclude">Blacklisted Channels (optional)</Label>
                                            <Input
                                                id="exclude"
                                                placeholder="Channel X, Channel Y"
                                                value={excludeChannels}
                                                onChange={(e) => setExcludeChannels(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? (
                                            <>
                                                <Clock className="w-4 h-4 mr-2 animate-spin" />
                                                Starting Curation...
                                            </>
                                        ) : (
                                            <>
                                                <Search className="w-4 h-4 mr-2" />
                                                Explore & Score Videos
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Recent Sessions */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 font-semibold">
                                <History className="w-5 h-5 text-muted-foreground" />
                                Recent Sessions
                            </div>
                            <div className="space-y-4">
                                {recentSessions.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic">No recent sessions found.</p>
                                ) : (
                                    recentSessions.map((session) => (
                                        <Card key={session.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => loadSession(session.id)}>
                                            <CardHeader className="p-4">
                                                <CardTitle className="text-sm truncate">{session.topic}</CardTitle>
                                                <CardDescription className="text-xs flex items-center justify-between">
                                                    <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                                                    <Badge variant={session.status === 'finalized' ? 'secondary' : 'outline'} className="text-[10px]">
                                                        {session.status}
                                                    </Badge>
                                                </CardDescription>
                                            </CardHeader>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="workspace"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="flex flex-col gap-6"
                    >
                        {/* Workspace Header */}
                        <div className="bg-muted/50 p-6 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-bold">{currentSession?.topic}</h2>
                                    <Badge className={
                                        currentSession?.status === 'ready' ? 'bg-green-500 hover:bg-green-600' :
                                            currentSession?.status === 'finalized' ? 'bg-purple-500 hover:bg-purple-600' :
                                                'bg-blue-500 hover:bg-blue-600'
                                    }>
                                        {currentSession?.status === 'searching' && <Search className="w-3 h-3 mr-1 animate-pulse" />}
                                        {currentSession?.status === 'scoring' && <Brain className="w-3 h-3 mr-1 animate-pulse" />}
                                        {currentSession?.status}
                                    </Badge>
                                </div>
                                <p className="text-muted-foreground text-sm">
                                    {currentSession?.language} • {currentSession?.level} • Target: {currentSession?.targetDurationMin} min
                                </p>
                            </div>

                            <div className="flex items-center gap-8">
                                <div className="text-center">
                                    <p className="text-2xl font-bold">{stats?.total || 0}</p>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Candidates</p>
                                </div>
                                <Separator orientation="vertical" className="h-10" />
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-primary">{stats?.selected || 0}</p>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Selected</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setActiveTab("new")}>
                                    Exit Workspace
                                </Button>
                            </div>
                        </div>

                        <div className="grid lg:grid-cols-4 gap-8">
                            {/* Candidates Area */}
                            <div className="lg:col-span-3 space-y-8">
                                {(currentSession?.status === 'searching' || currentSession?.status === 'scoring') && candidates.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-xl border border-dashed text-center">
                                        <motion.div
                                            animate={{ scale: [1, 1.1, 1] }}
                                            transition={{ repeat: Infinity, duration: 2 }}
                                        >
                                            <Brain className="w-12 h-12 text-primary/50 mb-4" />
                                        </motion.div>
                                        <h3 className="text-lg font-semibold">AI is exploring YouTube...</h3>
                                        <p className="text-muted-foreground max-w-md mb-4">
                                            We are searching for the best videos based on your topic and scoring them for educational quality. Candidates will appear here shortly.
                                        </p>
                                        {/* Status Message from session */}
                                        {currentSession?.message && (
                                            <div className="mt-2 px-4 py-2 bg-primary/10 rounded-lg text-sm text-primary font-medium animate-pulse">
                                                {currentSession.message}
                                            </div>
                                        )}
                                        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                                            <div className={`w-2 h-2 rounded-full ${currentSession?.status === 'searching' ? 'bg-blue-500' : 'bg-yellow-500'} animate-pulse`} />
                                            Status: <span className="font-medium capitalize">{currentSession?.status}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-12">
                                        {/* Groups by recommendation */}
                                        {['include', 'maybe', 'exclude'].map((group) => {
                                            const groupCandidates = candidates.filter(c => c.recommendation === group);
                                            if (groupCandidates.length === 0) return null;

                                            return (
                                                <div key={group} className="space-y-4">
                                                    <h3 className="flex items-center gap-2 font-bold text-lg capitalize">
                                                        {group === 'include' && <Award className="w-5 h-5 text-green-500" />}
                                                        {group === 'maybe' && <Users className="w-5 h-5 text-yellow-500" />}
                                                        {group === 'exclude' && <X className="w-5 h-5 text-red-500" />}
                                                        {group === 'include' ? 'Top Recommendations' : group === 'maybe' ? 'Consider These' : 'Not Recommended'}
                                                        <span className="text-muted-foreground text-sm font-normal">({groupCandidates.length})</span>
                                                    </h3>
                                                    <div className="grid md:grid-cols-2 gap-4">
                                                        {groupCandidates.map((candidate) => (
                                                            <Card key={candidate.id} className={`overflow-hidden transition-all duration-300 ${candidate.selected ? 'ring-2 ring-primary shadow-md' : 'hover:border-primary/50'}`}>
                                                                <div className="aspect-video relative bg-muted">
                                                                    {candidate.videoThumbnail ? (
                                                                        <img src={candidate.videoThumbnail} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="flex items-center justify-center h-full">
                                                                            <PlayCircle className="w-10 h-10 text-muted-foreground/30" />
                                                                        </div>
                                                                    )}
                                                                    <div className="absolute top-2 right-2 flex gap-2">
                                                                        <Badge className="bg-black/60 backdrop-blur-sm border-0 text-white font-mono text-[10px]">
                                                                            {Math.floor((candidate.durationSeconds || 0) / 60)}:{((candidate.durationSeconds || 0) % 60).toString().padStart(2, '0')}
                                                                        </Badge>
                                                                        <Badge className={`${candidate.overallScore >= 80 ? 'bg-green-600' : 'bg-yellow-600'} text-white border-0`}>
                                                                            Score: {candidate.overallScore}
                                                                        </Badge>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => toggleSelection(candidate.id, !!candidate.selected)}
                                                                        className={`absolute bottom-2 right-2 p-2 rounded-full transition-all ${candidate.selected ? 'bg-primary text-white scale-110' : 'bg-white/90 text-primary hover:bg-primary hover:text-white'}`}
                                                                    >
                                                                        {candidate.selected ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                                                    </button>
                                                                </div>
                                                                <CardHeader className="p-4 bg-muted/30">
                                                                    <CardTitle className="text-sm font-semibold line-clamp-2 leading-tight">
                                                                        {candidate.videoTitle}
                                                                    </CardTitle>
                                                                    <CardDescription className="text-xs">
                                                                        {candidate.channelTitle} • {candidate.roleSuggestion}
                                                                    </CardDescription>
                                                                </CardHeader>
                                                                <CardContent className="p-4 text-xs text-muted-foreground leading-relaxed">
                                                                    {candidate.aiSummary || "No summary provided."}
                                                                </CardContent>
                                                            </Card>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Sidebar Settings/Finalize */}
                            <div className="space-y-6">
                                <Card className="sticky top-6">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Selected Path</CardTitle>
                                        <CardDescription>Review and finalize your course structure.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <ScrollArea className="h-[400px] px-4">
                                            <div className="space-y-3 pb-4">
                                                {candidates.filter(c => c.selected).length === 0 ? (
                                                    <div className="py-10 text-center text-sm text-muted-foreground italic">
                                                        No videos selected yet. Click the + button on video cards.
                                                    </div>
                                                ) : (
                                                    candidates
                                                        .filter(c => c.selected)
                                                        .map((c, idx) => (
                                                            <div key={c.id} className="bg-muted/50 p-3 rounded-lg border text-xs relative group animate-in slide-in-from-right-4">
                                                                <span className="absolute -top-2 -left-2 w-5 h-5 bg-primary text-white flex items-center justify-center rounded-full text-[10px] font-bold shadow-sm">
                                                                    {idx + 1}
                                                                </span>
                                                                <p className="font-semibold line-clamp-2 pr-6 mb-1">{c.videoTitle}</p>
                                                                <div className="flex items-center justify-between text-[10px]">
                                                                    <span className="text-muted-foreground">
                                                                        {Math.floor((c.durationSeconds || 0) / 60)} min
                                                                    </span>
                                                                    <button
                                                                        onClick={() => toggleSelection(c.id, true)}
                                                                        className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </CardContent>
                                    <Separator />
                                    <CardFooter className="flex-col p-4 gap-4">
                                        <div className="w-full flex justify-between text-sm font-semibold">
                                            <span>Total Duration</span>
                                            <span className="text-primary">
                                                {Math.floor(candidates.filter(c => c.selected).reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0) / 60)} min
                                            </span>
                                        </div>
                                        <Button
                                            className="w-full"
                                            disabled={candidates.filter(c => c.selected).length === 0 || isFinalizing}
                                            onClick={handleFinalize}
                                        >
                                            {isFinalizing ? (
                                                <>
                                                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                                                    Finalizing...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                    Finalize as Course
                                                </>
                                            )}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
