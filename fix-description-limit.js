const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function fixDescriptions() {
    try {
        const courses = await prisma.course.findMany({
            where: {
                courseShortDesc: { not: null }
            },
            select: {
                id: true,
                title: true,
                description: true
            }
        });

        console.log(`Differentiating descriptions for ${courses.length} courses...\n`);

        let updatedCount = 0;

        for (const course of courses) {
            if (course.description) {
                // Strip HTML tags and normalize whitespace
                const stripped = course.description.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

                // Summary/Hero: ~250 characters or first few sentences
                // We'll use 250 as a sweet spot for hero section visibility
                let shortDesc = stripped;
                if (stripped.length > 250) {
                    shortDesc = stripped.substring(0, 250).split(' ').slice(0, -1).join(' ') + '...';
                }

                // Full Description: the complete text
                const fullDesc = course.description;

                await prisma.course.update({
                    where: { id: course.id },
                    data: {
                        courseShortDesc: shortDesc,
                        courseDesc: fullDesc
                    }
                });
                console.log(`✓ Differentiated: ${course.title} (Short: ${shortDesc.length}, Full: ${fullDesc.length})`);
                updatedCount++;
            }
        }

        console.log(`\nSuccess! Updated ${updatedCount} courses.`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixDescriptions();
