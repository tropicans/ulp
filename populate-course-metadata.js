const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function populateCourseMetadata() {
    try {
        console.log("=== Populating Course Metadata ===\n");

        // Get all published courses
        const courses = await prisma.course.findMany({
            where: { isPublished: true }
        });

        console.log(`Found ${courses.length} published courses\n`);

        for (const course of courses) {
            console.log(`Updating: ${course.title}`);

            // Update with sample metadata
            await prisma.course.update({
                where: { id: course.id },
                data: {
                    courseShortDesc: `Kursus ${course.title} dirancang khusus untuk meningkatkan kompetensi dan pengetahuan Anda di bidang ini.`,
                    courseDesc: `Kursus ini memberikan pembelajaran mendalam tentang ${course.title}. Materi disusun secara terstruktur untuk membantu Anda memahami konsep dasar hingga aplikasi praktis.\n\nMelalui pendekatan pembelajaran yang interaktif, Anda akan mendapatkan pemahaman komprehensif yang dapat langsung diterapkan dalam pekerjaan sehari-hari.`,
                    requirements: `- Kemampuan dasar pemahaman bahasa Indonesia\n- Motivasi untuk belajar dan berkembang\n- Akses internet stabil\n- Komitmen waktu untuk menyelesaikan kursus`,
                    outcomes: `- Memahami konsep dan prinsip fundamental\n- Mampu menerapkan pengetahuan dalam konteks praktis\n- Meningkatkan keterampilan profesional\n- Mendapatkan perspektif baru dalam bidang terkait`,
                    recommendedNext: `Setelah menyelesaikan kursus ini, Anda dapat melanjutkan ke kursus lanjutan terkait untuk memperdalam pemahaman Anda.`,
                    language: 'Bahasa Indonesia',
                    courseLevel: course.difficulty || 'Beginner',
                    jp: course.duration ? Math.ceil(course.duration / 0.75) : 10 // Convert hours to JP (1 JP = 45 min)
                }
            });

            console.log(`  ✅ Metadata updated`);
        }

        console.log(`\n✅ All course metadata populated successfully!`);

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

populateCourseMetadata();
