const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
    const email = 'tropicans@gmail.com';

    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        console.error(`User with email ${email} not found`);
        return;
    }

    console.log(`Found user: ${user.name} (${user.id})`);

    const activities = [
        {
            activity_type: 'ENROLLMENT',
            entity_title: 'Dasar-Dasar Kepegawaian',
            entity_id: 'sample-course-1',
            metadata: { method: 'Self-Enroll' }
        },
        {
            activity_type: 'LESSON_COMPLETE',
            entity_title: 'Pengenalan Struktur Organisasi',
            entity_id: 'lesson-1',
            metadata: { duration: '15m' }
        },
        {
            activity_type: 'QUIZ_PASS',
            entity_title: 'Kuis Etika Kerja',
            entity_id: 'quiz-1',
            metadata: { score: 95, passingScore: 80 }
        },
        {
            activity_type: 'ATTENDANCE',
            entity_title: 'Seminar Wawasan Kebangsaan',
            entity_id: 'session-1',
            metadata: { checkInType: 'QR' }
        }
    ];

    for (const act of activities) {
        await prisma.$executeRawUnsafe(`
      INSERT INTO learner_activity (id, user_id, activity_type, entity_id, entity_title, metadata, occurred_at)
      VALUES (gen_random_uuid(), '${user.id}', '${act.activity_type}', '${act.entity_id}', '${act.entity_title}', '${JSON.stringify(act.metadata)}'::jsonb, NOW() - interval '${Math.floor(Math.random() * 5)} hours')
    `);
    }

    console.log('Successfully seeded journey data!');
}

seed()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
