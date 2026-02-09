import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get("playlistId");

    if (!playlistId) {
        return NextResponse.json({ error: "playlistId required" }, { status: 400 });
    }

    // Get all processing jobs for this playlist
    const jobs = await prisma.processingJob.findMany({
        where: {
            type: "YOUTUBE_IMPORT",
            payload: {
                path: ['playlistId'],
                equals: playlistId
            }
        },
        orderBy: { createdAt: 'asc' }
    });

    // Get playlist items for titles
    const items = await (prisma as any).ytPlaylistItem.findMany({
        where: { playlistId },
        orderBy: { videoNo: 'asc' }
    });

    // Get playlist status
    const playlist = await (prisma as any).ytPlaylist.findUnique({
        where: { playlistId }
    });

    // Map items with job status and transcription status
    const itemsWithStatus = items.map((item: any) => {
        const job = jobs.find((j: any) => {
            const payload = j.payload as any;
            return payload.videoId === item.videoId;
        });

        let audioStatus = "pending";
        if (job) {
            audioStatus = job.status.toLowerCase();
        }
        if (item.audioFilePath) {
            audioStatus = "completed";
        }

        // Check transcription status
        const hasTranscript = !!(item.transcript && item.transcript.trim() !== '');

        // Check AI enhancement status
        const hasSummary = !!(item.summary && item.summary.trim() !== '');
        const hasTitle = !!(item.refinedTitle && item.refinedTitle.trim() !== '');
        const hasQuiz = !!(item.quizKnowledgeCheck);

        return {
            videoId: item.videoId,
            videoNo: item.videoNo,
            title: item.videoTitle,
            refinedTitle: item.refinedTitle || null,
            duration: item.durationStr,
            audioStatus,
            hasTranscript,
            hasSummary,
            hasTitle,
            hasQuiz,
            audioPath: item.audioFilePath || null
        };
    });

    const total = itemsWithStatus.length;
    const audioCompleted = itemsWithStatus.filter((i: any) => i.audioStatus === "completed").length;
    const audioFailed = itemsWithStatus.filter((i: any) => i.audioStatus === "failed").length;
    const audioProcessing = itemsWithStatus.filter((i: any) => i.audioStatus === "processing").length;
    const audioPending = total - audioCompleted - audioFailed - audioProcessing;

    // Transcription progress
    const transcribed = itemsWithStatus.filter((i: any) => i.hasTranscript).length;

    // AI Enhancement progress
    const withSummary = itemsWithStatus.filter((i: any) => i.hasSummary).length;
    const withTitle = itemsWithStatus.filter((i: any) => i.hasTitle).length;
    const withQuiz = itemsWithStatus.filter((i: any) => i.hasQuiz).length;

    // Playlist-level progress (quiz prepost & metadata)
    const hasQuizPrepost = !!(playlist?.quizPrepost && playlist.quizPrepost.trim() !== '');
    const quizPrepostCount = playlist?.quizPrepostCount || 0;
    const hasCourseDesc = !!(playlist?.courseDesc && playlist.courseDesc.trim() !== '');
    const hasCourseMetadata = playlist?.hasCourseMetadata || false;
    const pipelineStatus = playlist?.status || 'pending';

    return NextResponse.json({
        playlistId,
        playlistTitle: playlist?.playlistTitle || "YouTube Playlist",
        total,
        // Audio extraction progress
        audio: {
            completed: audioCompleted,
            failed: audioFailed,
            processing: audioProcessing,
            pending: audioPending
        },
        // Transcription progress
        transcription: {
            completed: transcribed,
            pending: audioCompleted - transcribed
        },
        // AI Enhancement progress (per video)
        enhancement: {
            summary: withSummary,
            title: withTitle,
            quiz: withQuiz,
            total: transcribed // Only items with transcript can be enhanced
        },
        // Playlist-level progress (workflow 4 & 6)
        playlistProgress: {
            hasQuizPrepost,
            quizPrepostCount,
            hasCourseDesc,
            hasCourseMetadata,
            status: pipelineStatus
        },
        // Legacy fields for backward compatibility
        completed: audioCompleted,
        failed: audioFailed,
        processing: audioProcessing,
        pending: audioPending,
        webhookTriggered: playlist?.status === "webhook_triggered",
        isComplete: pipelineStatus === "completed" && hasQuizPrepost && hasCourseDesc,
        items: itemsWithStatus
    });
}
