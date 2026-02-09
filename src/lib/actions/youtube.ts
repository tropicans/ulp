"use server"

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
    fetchYouTubePlaylistMetadata,
    isValidYouTubePlaylistUrl,
    extractAudio
} from "@/lib/youtube-utils";
import { createSignedWebhookRequest } from "@/lib/webhook-utils";
import { DeliveryMode, Difficulty } from "@/generated/prisma";
import axios from "axios";

export async function previewYouTubePlaylist(url: string) {
    if (!isValidYouTubePlaylistUrl(url)) {
        return { error: "URL Playlist YouTube tidak valid" };
    }

    const metadata = await fetchYouTubePlaylistMetadata(url);
    if (!metadata) {
        return { error: "Gagal mengambil metadata playlist. Pastikan playlist bersifat publik." };
    }

    return { success: true, metadata };
}

export async function checkExistingPlaylist(playlistId: string) {
    try {
        // Check if playlist exists in yt_playlists table
        const existingPlaylist = await (prisma as any).ytPlaylist.findUnique({
            where: { playlistId: playlistId }
        });

        if (!existingPlaylist) {
            return { exists: false };
        }

        // Find related course
        const existingCourse = await prisma.course.findFirst({
            where: { ytPlaylistId: playlistId },
            select: { id: true, title: true, slug: true }
        });

        return {
            exists: true,
            course: existingCourse ? {
                id: existingCourse.id,
                title: existingCourse.title,
                slug: existingCourse.slug
            } : null
        };
    } catch (error) {
        console.error("Error checking existing playlist:", error);
        return { exists: false };
    }
}

export async function importYouTubePlaylist(url: string, instructorId: string, forceUpdate: boolean = false) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { error: "Unauthorized" };
        }

        const metadata = await fetchYouTubePlaylistMetadata(url);
        if (!metadata) {
            return { error: "Gagal mengambil metadata playlist" };
        }

        // Handle forceUpdate - delete existing records first
        if (forceUpdate) {
            const existingCourse = await prisma.course.findFirst({
                where: { ytPlaylistId: metadata.id },
                include: { Module: { include: { Lesson: true } } }
            });

            if (existingCourse) {
                // Delete in correct order due to foreign key constraints
                // 1. Delete ProcessingJobs for lessons
                for (const module of existingCourse.Module) {
                    for (const lesson of module.Lesson) {
                        await prisma.processingJob.deleteMany({
                            where: { targetId: lesson.id }
                        });
                    }
                }

                // 2. Delete Lessons
                for (const module of existingCourse.Module) {
                    await prisma.lesson.deleteMany({
                        where: { moduleId: module.id }
                    });
                }

                // 3. Delete Modules
                await prisma.module.deleteMany({
                    where: { courseId: existingCourse.id }
                });

                // 4. Delete Course
                await prisma.course.delete({
                    where: { id: existingCourse.id }
                });
            }

            // Delete yt_playlist_items and yt_playlists
            await (prisma as any).ytPlaylistItem.deleteMany({
                where: { playlistId: metadata.id }
            });
            await (prisma as any).ytPlaylist.deleteMany({
                where: { playlistId: metadata.id }
            });
        }

        const baseSlug = metadata.title
            .toLowerCase()
            .trim()
            .replace(/ /g, "-")
            .replace(/[^\w-]+/g, "");

        let slug = baseSlug;
        const existing = await prisma.course.findUnique({ where: { slug } });
        if (existing) {
            slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;
        }

        // 1. Create Course
        const course = await prisma.course.create({
            data: {
                id: crypto.randomUUID(),
                title: metadata.title,
                slug,
                description: `Kursus otomatis dari YouTube Playlist: ${metadata.title}`,
                instructorId: instructorId,
                deliveryMode: DeliveryMode.ASYNC_ONLINE,
                difficulty: Difficulty.BEGINNER,
                category: "YouTube Import",
                ytPlaylistId: metadata.id,
                isProcessing: true,
                processingStatus: "processing",
                updatedAt: new Date(),
            }
        });

        // 2. Create a default Module
        const module = await prisma.module.create({
            data: {
                id: crypto.randomUUID(),
                courseId: course.id,
                title: "Materi Utama",
                order: 1,
                updatedAt: new Date(),
            }
        });

        // 3. Create Lessons and Processing Jobs
        for (const item of metadata.items) {
            const lessonId = crypto.randomUUID();
            await prisma.lesson.create({
                data: {
                    id: lessonId,
                    moduleId: module.id,
                    title: item.title,
                    order: item.index,
                    contentType: "VIDEO",
                    videoUrl: `https://www.youtube.com/watch?v=${item.videoId}`,
                    ytVideoId: item.videoId,
                    duration: 0,
                    processingStatus: "pending",
                    updatedAt: new Date(),
                }
            });

            // Create background processing job
            await prisma.processingJob.create({
                data: {
                    type: "YOUTUBE_IMPORT",
                    status: "PENDING",
                    targetId: lessonId,
                    payload: {
                        videoId: item.videoId,
                        courseId: course.id,
                        playlistId: metadata.id
                    }
                }
            });
        }

        // --- Populate yt_ tables for backward compatibility ---
        await (prisma as any).ytPlaylist.create({
            data: {
                playlistId: metadata.id,
                playlistTitle: metadata.title,
                playlistUrl: `https://www.youtube.com/playlist?list=${metadata.id}`,
                author: metadata.author,
                totalItems: metadata.items.length,
                totalVideos: metadata.items.length,
                status: "processing",
                courseTitle: metadata.title,
                courseLevel: course.difficulty,
                language: "Bahasa Indonesia",
                hasCourseMetadata: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        });

        for (let i = 0; i < metadata.items.length; i++) {
            const item = metadata.items[i];
            await (prisma as any).ytPlaylistItem.create({
                data: {
                    playlistId: metadata.id,
                    videoId: item.videoId,
                    videoNo: i + 1,
                    videoTitle: item.title,
                    durationStr: item.duration,
                    embedUrl: `https://www.youtube.com/embed/${item.videoId}`,
                    status: "pending",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }
            });
        }

        // Trigger background processing (async)
        triggerBackgroundProcessing();

        revalidatePath("/dashboard/instructor");
        return { success: true, courseId: course.id };
    } catch (error) {
        console.error("Error importing YouTube playlist:", error);
        return { error: "Gagal mengimport playlist" };
    }
}

export async function triggerBackgroundProcessing() {
    // We don't await this so it runs in background
    processPendingJobs().catch(err => console.error("Worker error:", err));
}

export async function processPendingJobs() {
    // Track which playlists were processed across all batches
    const processedPlaylists = new Set<string>();

    // Keep processing until no more pending jobs
    while (true) {
        const jobs = await prisma.processingJob.findMany({
            where: { status: "PENDING", type: "YOUTUBE_IMPORT" },
            take: 5 // Process in small batches
        });

        // Exit loop when no more pending jobs
        if (jobs.length === 0) {
            break;
        }

        for (const job of jobs) {
            try {
                await prisma.processingJob.update({
                    where: { id: job.id },
                    data: { status: "PROCESSING" }
                });

                const payload = job.payload as any;
                const videoId = payload.videoId;
                const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

                // 1. Extract Audio
                const audioPath = await extractAudio(videoUrl, videoId);

                // 2. Update Lesson with audio path
                await prisma.lesson.update({
                    where: { id: job.targetId },
                    data: { audioFilePath: audioPath }
                });

                // 2b. Update yt_playlist_item with audio path
                await (prisma as any).ytPlaylistItem.updateMany({
                    where: {
                        videoId: videoId,
                        playlistId: payload.playlistId
                    },
                    data: {
                        audioFilePath: audioPath,
                        status: 'audio_extracted'
                    }
                });

                // Track this playlist for webhook trigger check
                if (payload.playlistId) {
                    processedPlaylists.add(payload.playlistId);
                }

                await prisma.processingJob.update({
                    where: { id: job.id },
                    data: { status: "COMPLETED" }
                });

            } catch (error: any) {
                console.error(`Job ${job.id} failed:`, error);
                await prisma.processingJob.update({
                    where: { id: job.id },
                    data: {
                        status: "FAILED",
                        error: error.message
                    }
                });
            }
        }
    }

    // After processing ALL jobs, check if any playlist is fully complete
    for (const playlistId of processedPlaylists) {
        await checkAndTriggerWebhook(playlistId);
    }
}

// Check if all videos in a playlist have audio extracted, then trigger webhook
async function checkAndTriggerWebhook(playlistId: string) {
    // Check if there are any pending jobs for this playlist
    const pendingJobs = await prisma.processingJob.count({
        where: {
            type: "YOUTUBE_IMPORT",
            status: { in: ["PENDING", "PROCESSING"] },
            payload: {
                path: ['playlistId'],
                equals: playlistId
            }
        }
    });

    if (pendingJobs > 0) {
        console.log(`Playlist ${playlistId} still has ${pendingJobs} pending jobs, skipping webhook`);
        return;
    }

    // All jobs complete, check how many items have audio
    const items = await (prisma as any).ytPlaylistItem.findMany({
        where: {
            playlistId: playlistId,
            audioFilePath: { not: null }
        }
    });

    if (items.length === 0) {
        console.log(`No items with audio for playlist ${playlistId}, skipping webhook`);
        return;
    }

    // Check if webhook was already triggered for this playlist
    const playlist = await (prisma as any).ytPlaylist.findUnique({
        where: { playlistId: playlistId }
    });

    if (playlist?.status === 'webhook_triggered') {
        console.log(`Webhook already triggered for playlist ${playlistId}, skipping`);
        return;
    }

    // Trigger n8n Webhook with all items
    const webhookUrl = process.env.WEBHOOK_URL;

    if (webhookUrl) {
        const webhookPayload = {
            source: 'TITAN-lms',
            playlist: {
                id: playlistId,
                title: playlist?.playlistTitle || 'YouTube Playlist',
                url: `https://www.youtube.com/playlist?list=${playlistId}`,
                author: 'YouTube Import',
                total: items.length
            },
            items: items.map((item: any, idx: number) => ({
                No: item.videoNo || idx + 1,
                'Judul Video': item.videoTitle,
                videoId: item.videoId,
                'Durasi': item.durationStr || null,
                'Alamat Embed': item.embedUrl || `https://www.youtube.com/embed/${item.videoId}`,
                audioPath: item.audioFilePath,
                audioFilePath: item.audioFilePath,
                Status: 'ready_for_transcription',
                transcript: item.transcript || null,
                summary: item.summary || null,
                quiz_knowledge_check: item.quizKnowledgeCheck || null
            }))
        };

        try {
            const signedRequest = createSignedWebhookRequest(webhookPayload);
            await axios.post(webhookUrl, signedRequest.body, {
                headers: signedRequest.headers
            });

            // Mark playlist as webhook triggered
            await (prisma as any).ytPlaylist.update({
                where: { playlistId: playlistId },
                data: { status: 'webhook_triggered' }
            });

            console.log(`Webhook triggered for playlist ${playlistId} with ${items.length} items`);
        } catch (error) {
            console.error(`Failed to trigger webhook for playlist ${playlistId}:`, error);
        }
    }
}
