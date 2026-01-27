const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function checkCourseMetadata() {
    try {
        const course = await prisma.course.findFirst({
            where: {
                slug: { contains: 'sesi-informasi-pengembangan-kompetensi' }
            },
            select: {
                title: true,
                description: true,
                courseShortDesc: true,
                syncConfig: true,
                courseDesc: true
            }
        });

        if (!course) {
            console.log("Course not found");
            return;
        }

        console.log(`=== Course Metadata Check ===\n`);
        console.log(`Title: ${course.title}`);

        const config = course.syncConfig;
        console.log(`\n--- ADVANCE ORGANIZER CONTENT ---`);
        console.log(config?.advanceOrganizer?.content || "No content found");
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
