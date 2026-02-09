"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import axios from "axios";
import { DeliveryMode, Difficulty } from "@/generated/prisma";
import { revalidatePath } from "next/cache";

// Helper function to format seconds to HH:MM:SS or MM:SS
function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export async function createCurationSession(formData: {
    topic: string;
    language?: string;
    level?: string;
    targetDurationMin?: number;
    includeChannels?: string[];
    excludeChannels?: string[];
}) {
    try {
        const sessionAuth = await auth();
        if (!sessionAuth?.user?.id) {
            return { error: "Unauthorized" };
        }

        const sessionUuid = crypto.randomUUID();
        const session = await prisma.ytCurationSession.create({
            data: {
                sessionUuid,
                topic: formData.topic,
                language: formData.language || "Bahasa Indonesia",
                level: formData.level || "All levels",
                targetDurationMin: formData.targetDurationMin || 60,
                includeChannels: formData.includeChannels ? formData.includeChannels.join(",") : null,
                excludeChannels: formData.excludeChannels ? formData.excludeChannels.join(",") : null,
                status: "searching",
                updatedAt: new Date(),
            },
        });

        // Trigger n8n workflow
        let workflowTriggered = false;
        const webhookUrl = process.env.CURATION_WEBHOOK_URL;
        if (webhookUrl) {
            try {
                await axios.post(webhookUrl, {
                    sessionId: session.id,
                    sessionData: {
                        id: session.id,
                        session_uuid: session.sessionUuid,
                        topic: session.topic,
                        language: session.language,
                        level: session.level,
                        target_duration_min: session.targetDurationMin,
                        include_channels: formData.includeChannels || [],
                        exclude_channels: formData.excludeChannels || [],
                    },
                    timestamp: new Date().toISOString(),
                });
                workflowTriggered = true;
            } catch (webhookError: any) {
                console.error("Failed to trigger curation webhook:", webhookError.message);
            }
        }

        revalidatePath("/dashboard/instructor/curation");
        return { success: true, session, workflowTriggered };
    } catch (error: any) {
        console.error("Failed to create curation session:", error);
        return { error: error.message };
    }
}

export async function getCurationSessions(limit = 10) {
    try {
        const sessions = await prisma.ytCurationSession.findMany({
            orderBy: { createdAt: "desc" },
            take: limit,
        });
        return { success: true, sessions };
    } catch (error: any) {
        console.error("Failed to get sessions:", error);
        return { error: error.message };
    }
}

export async function getCurationSession(id: string) {
    try {
        const session = await prisma.ytCurationSession.findUnique({
            where: { id },
            include: {
                candidates: {
                    orderBy: [
                        { selected: "desc" },
                        { overallScore: "desc" }
                    ]
                }
            },
        });

        if (!session) return { error: "Session not found" };

        const stats = {
            total: session.candidates.length,
            selected: session.candidates.filter((c) => c.selected).length,
            include_count: session.candidates.filter((c) => c.recommendation === "include").length,
            maybe_count: session.candidates.filter((c) => c.recommendation === "maybe").length,
            exclude_count: session.candidates.filter((c) => c.recommendation === "exclude").length,
        };

        return { success: true, session, stats };
    } catch (error: any) {
        console.error("Failed to get session:", error);
        return { error: error.message };
    }
}

export async function updateCandidateSelect(candidateId: string, selected: boolean, order?: number) {
    try {
        const candidate = await prisma.ytCurationCandidate.update({
            where: { id: candidateId },
            data: {
                selected,
                orderInPlaylist: order || null,
                updatedAt: new Date()
            },
        });
        return { success: true, candidate };
    } catch (error: any) {
        console.error("Failed to update candidate:", error);
        return { error: error.message };
    }
}

export async function finalizeCuration(sessionId: string, formData: {
    playlistTitle: string;
    playlistDescription: string;
}) {
    try {
        const sessionAuth = await auth();
        if (!sessionAuth?.user?.id) {
            return { error: "Unauthorized" };
        }

        const session = await prisma.ytCurationSession.findUnique({
            where: { id: sessionId },
            include: {
                candidates: {
                    where: { selected: true },
                    orderBy: { orderInPlaylist: "asc" }
                }
            },
        });

        if (!session || session.candidates.length === 0) {
            return { error: "Tidak ada video yang dipilih untuk difinalisasi." };
        }

        const baseSlug = formData.playlistTitle
            .toLowerCase()
            .trim()
            .replace(/ /g, "-")
            .replace(/[^\w-]+/g, "");

        let slug = baseSlug;
        const existing = await prisma.course.findUnique({ where: { slug } });
        if (existing) {
            slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;
        }

        // Note: playlistId is created before Course now
        const playlistId = `curation-${sessionId}`;

        // 1. Create Course (with ytPlaylistId for callback sync)
        const course = await prisma.course.create({
            data: {
                id: crypto.randomUUID(),
                title: formData.playlistTitle,
                slug,
                description: formData.playlistDescription,
                instructorId: sessionAuth.user.id,
                deliveryMode: DeliveryMode.ASYNC_ONLINE,
                difficulty: (session.level?.toUpperCase() as any) || Difficulty.BEGINNER,
                category: "AI Curated",
                isPublished: true,
                ytPlaylistId: playlistId, // Link for callback sync
                updatedAt: new Date(),
            }
        });

        // 2. Create Module
        const module = await prisma.module.create({
            data: {
                id: crypto.randomUUID(),
                courseId: course.id,
                title: "Materi Kurasi",
                order: 1,
                updatedAt: new Date(),
            }
        });

        // 3. Create Lessons
        for (const c of session.candidates) {
            await prisma.lesson.create({
                data: {
                    id: crypto.randomUUID(),
                    moduleId: module.id,
                    title: c.videoTitle,
                    order: c.orderInPlaylist || 0,
                    contentType: "VIDEO",
                    videoUrl: `https://www.youtube.com/watch?v=${c.videoId}`,
                    ytVideoId: c.videoId,
                    summary: c.aiSummary,
                    updatedAt: new Date(),
                }
            });
        }

        // 4. Update session status
        await prisma.ytCurationSession.update({
            where: { id: sessionId },
            data: {
                status: "finalized",
                enrichmentStatus: "processing",
                enrichedCourseId: course.id,
                updatedAt: new Date(),
                processedAt: new Date()
            },
        });


        // 5. Create yt_playlist and yt_playlist_items for progress tracking
        // Format same as YouTubeToCourse so 1-Orchestrator upsert will UPDATE, not INSERT
        // Note: playlistId was already created above for Course linking

        await (prisma as any).ytPlaylist.create({
            data: {
                playlistId: playlistId,
                playlistTitle: formData.playlistTitle,
                playlistUrl: `https://www.youtube.com/playlist?list=${playlistId}`, // Mock YouTube URL format
                author: "Curation AI",
                totalItems: session.candidates.length,
                totalVideos: session.candidates.length,
                status: "processing",
                courseTitle: formData.playlistTitle,
                courseLevel: session.level || "BEGINNER",
                language: session.language || "Bahasa Indonesia",
                hasCourseMetadata: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        });

        for (let i = 0; i < session.candidates.length; i++) {
            const c = session.candidates[i];
            await (prisma as any).ytPlaylistItem.create({
                data: {
                    playlistId: playlistId,
                    videoId: c.videoId,
                    videoNo: i + 1,
                    videoTitle: c.videoTitle,
                    durationStr: formatDuration(c.durationSeconds || 0),
                    embedUrl: `https://www.youtube.com/embed/${c.videoId}`,
                    status: "pending",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }
            });
        }

        // 6. Get lesson IDs and create ProcessingJobs
        const lessons = await prisma.lesson.findMany({
            where: { moduleId: module.id },
            orderBy: { order: 'asc' }
        });

        for (const lesson of lessons) {
            await prisma.processingJob.create({
                data: {
                    type: "YOUTUBE_IMPORT",
                    status: "PENDING",
                    targetId: lesson.id,
                    payload: {
                        videoId: lesson.ytVideoId,
                        courseId: course.id,
                        playlistId: playlistId
                    }
                }
            });
        }

        // 7. Trigger background processing (async)
        // This will extract audio, then automatically trigger n8n webhook when complete
        const { triggerBackgroundProcessing } = await import("@/lib/actions/youtube");
        triggerBackgroundProcessing();

        console.log(`Curation finalized: courseId=${course.id}, playlistId=${playlistId}, videos=${session.candidates.length}`);

        return { success: true, courseId: course.id, playlistId: playlistId };
    } catch (error: any) {
        console.error("Failed to finalize curation:", error);
        return { error: error.message };
    }
}
