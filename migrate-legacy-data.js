const { PrismaClient } = require('./src/generated/prisma');
const fs = require('fs');
const readline = require('readline');
const crypto = require('crypto');

const prisma = new PrismaClient();
const INSTRUCTOR_ID = "dj0eynq53qwrice09lu3wz3i"; // Dr. Budi Santoso

async function readJsonl(path) {
    const lines = [];
    const fileStream = fs.createReadStream(path);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
    for await (const line of rl) {
        if (line.trim()) lines.push(JSON.parse(line));
    }
    return lines;
}

function slugify(text) {
    return text.toLowerCase()
        .trim()
        .replace(/ /g, "-")
        .replace(/[^\w-]+/g, "");
}

async function run() {
    try {
        console.log("Loading legacy data...");
        const playlists = await readJsonl('legacy_playlists.jsonl');
        const items = await readJsonl('legacy_playlist_items.jsonl');
        console.log(`Loaded ${playlists.length} playlists and ${items.length} items.`);

        for (const lp of playlists) {
            console.log(`Processing: ${lp.playlist_title} (${lp.playlist_id})`);

            // Check if course already exists
            const existingCourse = await prisma.course.findFirst({
                where: { ytPlaylistId: lp.playlist_id }
            });
            if (existingCourse) {
                console.log(`  -> Skipping (already exists)`);
                continue;
            }

            const baseSlug = slugify(lp.playlist_title || "legacy-course");
            let slug = baseSlug;
            const existing = await prisma.course.findUnique({ where: { slug } });
            if (existing) {
                slug = `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;
            }

            // 1. Create Course
            const course = await prisma.course.create({
                data: {
                    id: crypto.randomUUID(),
                    title: lp.playlist_title || "Untitled Course",
                    slug,
                    description: lp.course_desc || `Kursus diimpor dari legacy system: ${lp.playlist_title}`,
                    instructorId: INSTRUCTOR_ID,
                    deliveryMode: "ASYNC_ONLINE",
                    difficulty: (lp.course_level || "Beginner").toUpperCase() === "BEGINNER" ? "BEGINNER" : "INTERMEDIATE",
                    category: "Legacy Import",
                    ytPlaylistId: lp.playlist_id,
                    isProcessing: false,
                    processingStatus: lp.status === "completed" ? "completed" : "failed",
                    updatedAt: new Date(lp.updated_at || Date.now()),
                }
            });

            // 2. Create Module
            const module = await prisma.module.create({
                data: {
                    id: crypto.randomUUID(),
                    courseId: course.id,
                    title: "Materi Utama",
                    order: 1,
                    updatedAt: new Date(),
                }
            });

            // 3. Sync to TITIAN yt_playlists table
            await prisma.ytPlaylist.upsert({
                where: { playlistId: lp.playlist_id },
                update: {},
                create: {
                    playlistId: lp.playlist_id,
                    playlistTitle: lp.playlist_title,
                    playlistUrl: lp.playlist_url,
                    author: lp.author || "System",
                    totalItems: lp.total_videos || 0,
                    totalVideos: lp.total_videos || 0,
                    status: lp.status || "completed",
                    courseTitle: lp.playlist_title,
                    courseLevel: lp.course_level || "Beginner",
                    jp: lp.jp || 0,
                    courseShortDesc: lp.course_short_desc,
                    courseDesc: lp.course_desc,
                    language: lp.language || "Bahasa Indonesia",
                    hasCourseMetadata: true,
                    createdAt: new Date(lp.created_at || Date.now()),
                    updatedAt: new Date(lp.updated_at || Date.now()),
                }
            });

            // 4. Create Lessons and Sync yt_playlist_items
            const playlistItems = items.filter(i => i.playlist_id === lp.playlist_id);
            for (const li of playlistItems) {
                const lessonId = crypto.randomUUID();
                await prisma.lesson.create({
                    data: {
                        id: lessonId,
                        moduleId: module.id,
                        title: li.video_title || "Untitled Video",
                        order: li.video_no,
                        contentType: "VIDEO",
                        videoUrl: `https://www.youtube.com/watch?v=${li.video_id}`,
                        ytVideoId: li.video_id,
                        duration: 0,
                        transcript: li.transcript || null,
                        summary: li.summary || null,
                        processingStatus: li.status === 'completed' ? 'completed' : 'pending',
                        updatedAt: new Date(li.updated_at || li.created_at || Date.now()),
                    }
                });

                await prisma.ytPlaylistItem.upsert({
                    where: { playlistId_videoNo: { playlistId: lp.playlist_id, videoNo: li.video_no } },
                    update: {},
                    create: {
                        playlistId: lp.playlist_id,
                        videoId: li.video_id,
                        videoNo: li.video_no,
                        videoTitle: li.video_title,
                        durationStr: li.duration_str || null,
                        embedUrl: li.embed_url || null,
                        audioFilePath: li.audio_file_path || null,
                        transcript: li.transcript || null,
                        summary: li.summary || null,
                        refinedTitle: li.refined_title || null,
                        hasTranscript: !!li.transcript,
                        hasSummary: !!li.summary,
                        hasRefinedTitle: !!li.refined_title,
                        status: li.status || "completed",
                        createdAt: new Date(li.created_at || Date.now()),
                        updatedAt: new Date(li.updated_at || Date.now()),
                    }
                });
            }
        }

        console.log("Migration completed successfully!");
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

run();
