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

export async function importYouTubePlaylist(url: string, instructorId: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { error: "Unauthorized" };
        }

        const metadata = await fetchYouTubePlaylistMetadata(url);
        if (!metadata) {
            return { error: "Gagal mengambil metadata playlist" };
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

async function processPendingJobs() {
    const jobs = await prisma.processingJob.findMany({
        where: { status: "PENDING", type: "YOUTUBE_IMPORT" },
        take: 5 // Process in small batches
    });

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
                    status: 'processing'
                }
            });

            // 3. Trigger n8n Webhook
            const webhookUrl = process.env.WEBHOOK_URL;
            if (webhookUrl) {
                // Fetch full payload as expected by n8n
                const lesson = await prisma.lesson.findUnique({
                    where: { id: job.targetId },
                    include: { Module: { include: { Course: true } } }
                });

                if (lesson) {
                    const webhookPayload = {
                        source: 'TITAN-lms',
                        playlist: {
                            id: lesson.Module.Course.ytPlaylistId,
                            title: lesson.Module.Course.title,
                            url: `https://www.youtube.com/playlist?list=${lesson.Module.Course.ytPlaylistId}`,
                            author: 'YouTube Import',
                            total: 1
                        },
                        items: [{
                            No: lesson.order,
                            'Judul Video': lesson.title,
                            videoId: lesson.ytVideoId,
                            audioFilePath: audioPath,
                            Status: 'processing'
                        }]
                    };

                    const signedRequest = createSignedWebhookRequest(webhookPayload);
                    await axios.post(webhookUrl, signedRequest.body, {
                        headers: signedRequest.headers
                    });
                }
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
