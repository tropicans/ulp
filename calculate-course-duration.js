const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

// Parse duration string like "10:30" or "1:10:30" to seconds
function parseDurationToSeconds(durationStr) {
    if (!durationStr) return 0;

    const parts = durationStr.split(':').map(Number);

    if (parts.length === 3) {
        // H:M:S
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        // M:S
        return parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
        // S
        return parts[0];
    }

    return 0;
}

async function calculateCourseDurations() {
    try {
        console.log("=== Calculating Course Durations from YouTube Videos ===\n");

        // Get all courses with ytPlaylistId
        const courses = await prisma.course.findMany({
            where: {
                ytPlaylistId: { not: null },
                isPublished: true
            }
        });

        console.log(`Found ${courses.length} courses with YouTube playlists\n`);

        let updated = 0;

        for (const course of courses) {
            console.log(`Processing: ${course.title}`);

            // Find yt_playlist entry
            const ytPlaylist = await prisma.ytPlaylist.findUnique({
                where: { playlistId: course.ytPlaylistId }
            });

            if (!ytPlaylist) {
                console.log(`  ⚠️  No yt_playlist found`);
                continue;
            }

            // Sum all duration from yt_playlist_items
            // Note: yt_playlist_items.playlist_id uses YouTube ID, not UUID
            const items = await prisma.ytPlaylistItem.findMany({
                where: { playlistId: ytPlaylist.playlistId },
                select: { durationStr: true }
            });

            // Calculate total seconds by parsing duration strings
            const totalSeconds = items.reduce((sum, item) => {
                return sum + parseDurationToSeconds(item.durationStr);
            }, 0);

            // Convert to hours (rounded to 1 decimal)
            const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;
            const durationInHours = Math.max(1, Math.ceil(totalHours)); // At least 1 hour

            console.log(`  Videos: ${items.length}, Total: ${totalSeconds}s = ${totalHours} hours`);

            // Update Course.duration
            await prisma.course.update({
                where: { id: course.id },
                data: { duration: durationInHours }
            });

            console.log(`  ✅ Duration updated to ${durationInHours} Jam`);
            updated++;
        }

        console.log(`\n=== Summary ===`);
        console.log(`✅ Updated: ${updated} courses`);
        console.log(`\n✅ Course durations calculated successfully!`);

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

calculateCourseDurations();
