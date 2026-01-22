const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function getCoursePlaylistIds() {
    try {
        const courses = await prisma.course.findMany({
            where: {
                ytPlaylistId: { not: null }
            },
            select: {
                id: true,
                title: true,
                ytPlaylistId: true,
            }
        });

        console.log("=== Courses with ytPlaylistId ===\n");
        courses.forEach((c, idx) => {
            console.log(`${idx + 1}. ${c.title}`);
            console.log(`   Playlist ID: ${c.ytPlaylistId}\n`);
        });

        console.log("\nPlaylist IDs for SQL query:");
        const playlistIds = courses.map(c => `'${c.ytPlaylistId}'`).join(', ');
        console.log(playlistIds);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

getCoursePlaylistIds();
