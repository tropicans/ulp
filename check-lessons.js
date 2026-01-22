const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function checkLessons() {
    try {
        const lessons = await prisma.lesson.findMany({
            take: 10,
            select: {
                id: true,
                title: true,
                videoUrl: true,
                ytVideoId: true,
                contentType: true
            }
        });

        console.log("=== Lesson Video URLs ===\n");
        for (const lesson of lessons) {
            console.log(`Title: ${lesson.title}`);
            console.log(`  Type: ${lesson.contentType}`);
            console.log(`  videoUrl: ${lesson.videoUrl || '(null)'}`);
            console.log(`  ytVideoId: ${lesson.ytVideoId || '(null)'}`);
            console.log('');
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

checkLessons();
