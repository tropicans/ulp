const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function checkCourseMetadata() {
    try {
        const course = await prisma.course.findFirst({
            where: {
                slug: 'tara-de-thouars---managing-work-life-balance'
            },
            select: {
                title: true,
                description: true,
                courseShortDesc: true,
                courseDesc: true,
                ytPlaylistId: true
            }
        });

        console.log('=== Course Metadata Check ===\n');
        console.log('Title:', course?.title);
        console.log('YT Playlist ID:', course?.ytPlaylistId);
        console.log('\n--- SHORT DESC (hero) ---');
        console.log(course?.courseShortDesc || '(empty)');
        console.log('\n--- FULL DESC (section) ---');
        console.log(course?.courseDesc?.substring(0, 200) + '...' || '(empty)');
        console.log('\n--- LEGACY DESC ---');
        console.log(course?.description?.substring(0, 200) + '...');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkCourseMetadata();
