import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/webhook-utils";

export async function POST(req: NextRequest) {
    try {
        const payload = await req.json();
        const signature = req.headers.get("x-signature") || "";

        // Verify HMAC signature
        if (!verifyWebhookSignature(payload, signature)) {
            console.error("[Webhook] Invalid signature");
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        console.log(`[Webhook] Received AI results for playlist: ${payload.playlist_id}, video: ${payload.video_no}`);

        const {
            playlist_id,
            video_no,
            video_id,
            status,
            transcript,
            summary,
            refined_title,
            quiz_knowledge_check,
            quiz_prepost,
        } = payload;

        // Find the lesson in TITAN
        const lesson = await prisma.lesson.findFirst({
            where: {
                ytVideoId: video_id,
                Module: {
                    Course: {
                        ytPlaylistId: playlist_id
                    }
                }
            },
            include: {
                Module: {
                    include: {
                        Course: true
                    }
                }
            }
        });

        if (!lesson) {
            console.warn(`[Webhook] Lesson not found for video_id: ${video_id} in playlist: ${playlist_id}`);
            return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
        }

        // --- Dual-Writing Logic ---

        // 1. Update Lesson (TITAN Native)
        await (prisma.lesson.update as any)({
            where: { id: lesson.id },
            data: {
                title: refined_title || lesson.title,
                content: transcript || lesson.content,
                transcript: transcript || null,
                summary: summary || null,
                processingStatus: status === 'completed' || status === 'item_completed' ? 'completed' : 'processing',
                updatedAt: new Date(),
            }
        });

        // 2. Update yt_playlist_item (YouTube metadata table)
        await (prisma as any).ytPlaylistItem.updateMany({
            where: {
                videoId: video_id,
                playlistId: playlist_id
            },
            data: {
                refinedTitle: refined_title || null,
                transcript: transcript || null,
                summary: summary || null,
                hasTranscript: !!transcript,
                hasSummary: !!summary,
                hasRefinedTitle: !!refined_title,
                status: status === 'completed' || status === 'item_completed' ? 'completed' : 'processing',
                updatedAt: new Date(),
                processedAt: new Date(),
            }
        });

        // Update Course processing status if all lessons are done
        const totalLessons = await prisma.lesson.count({
            where: { moduleId: (lesson as any).moduleId }
        });
        const completedLessons = await (prisma.lesson.count as any)({
            where: {
                moduleId: (lesson as any).moduleId,
                processingStatus: 'completed'
            }
        });

        if (completedLessons === totalLessons) {
            await (prisma.course.update as any)({
                where: { id: (lesson as any).Module.courseId },
                data: {
                    processingStatus: 'completed',
                    isProcessing: false,
                    lastProcessedAt: new Date(),
                }
            });

            // Update yt_playlists status
            await (prisma as any).ytPlaylist.update({
                where: { playlistId: (lesson as any).Module.Course.ytPlaylistId },
                data: {
                    status: 'completed',
                    processedAt: new Date(),
                    updatedAt: new Date(),
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Webhook] Error processing webhook:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
