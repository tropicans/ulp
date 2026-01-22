const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function syncMetadataFromYtPlaylists() {
    try {
        console.log("=== Syncing Course Metadata from yt_playlists ===\n");

        // Get all courses that have ytPlaylistId
        const courses = await prisma.course.findMany({
            where: {
                ytPlaylistId: { not: null },
                isPublished: true
            }
        });

        console.log(`Found ${courses.length} courses with YouTube playlist links\n`);

        let updated = 0;
        let notFound = 0;

        for (const course of courses) {
            console.log(`Processing: ${course.title}`);

            // Find corresponding yt_playlist entry
            const ytPlaylist = await prisma.ytPlaylist.findUnique({
                where: { playlistId: course.ytPlaylistId }
            });

            if (!ytPlaylist) {
                console.log(`  ⚠️  No yt_playlist found for ${course.ytPlaylistId}`);
                notFound++;
                continue;
            }

            // Copy metadata from yt_playlist to Course
            await prisma.course.update({
                where: { id: course.id },
                data: {
                    courseShortDesc: ytPlaylist.courseShortDesc,
                    courseDesc: ytPlaylist.courseDesc,
                    courseLevel: ytPlaylist.courseLevel,
                    language: ytPlaylist.language,
                    requirements: ytPlaylist.requirements,
                    outcomes: ytPlaylist.outcomes,
                    recommendedNext: ytPlaylist.recommendedNext,
                    jp: ytPlaylist.jp
                }
            });

            console.log(`  ✅ Metadata synced from yt_playlists`);
            updated++;
        }

        console.log(`\n=== Summary ===`);
        console.log(`✅ Updated: ${updated} courses`);
        console.log(`⚠️  Not found: ${notFound} courses`);
        console.log(`\n✅ Metadata sync completed!`);

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

syncMetadataFromYtPlaylists();
