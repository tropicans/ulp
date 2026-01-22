const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function publishMigratedCourses() {
    try {
        console.log("=== Publishing Migrated Courses ===\n");

        // Update all migrated courses to published
        const result = await prisma.course.updateMany({
            where: {
                ytPlaylistId: { not: null },
                isPublished: false
            },
            data: {
                isPublished: true,
                updatedAt: new Date(),
            }
        });

        console.log(`✅ Successfully published ${result.count} courses!`);

        // Show updated courses
        const publishedCourses = await prisma.course.findMany({
            where: {
                ytPlaylistId: { not: null }
            },
            select: {
                id: true,
                title: true,
                slug: true,
                isPublished: true,
                isFeatured: true,
                category: true,
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log(`\n=== Published Migrated Courses ===`);
        publishedCourses.forEach((course, idx) => {
            console.log(`\n${idx + 1}. ${course.title}`);
            console.log(`   Slug: ${course.slug}`);
            console.log(`   Published: ${course.isPublished ? '✅' : '❌'}`);
            console.log(`   Featured: ${course.isFeatured ? '⭐' : '⚪'}`);
            console.log(`   Category: ${course.category || 'N/A'}`);
        });

        console.log(`\n✅ All migrated courses are now visible in the catalog!`);
        console.log(`   Visit: http://localhost:3001/courses`);

    } catch (error) {
        console.error("❌ Error publishing courses:", error);
    } finally {
        await prisma.$disconnect();
    }
}

publishMigratedCourses();
