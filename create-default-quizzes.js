const { PrismaClient } = require('./src/generated/prisma');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Sample questions for pretest
const pretestQuestions = [
    {
        type: 'MULTIPLE_CHOICE',
        text: 'Apa tujuan utama Anda mengikuti kursus ini?',
        points: 1,
        options: {
            choices: [
                { id: 'a', text: 'Meningkatkan pengetahuan' },
                { id: 'b', text: 'Mendapatkan sertifikat' },
                { id: 'c', text: 'Mengembangkan keterampilan' },
                { id: 'd', text: 'Semua di atas' }
            ]
        },
        correctAnswer: 'd'
    },
    {
        type: 'MULTIPLE_CHOICE',
        text: 'Seberapa familiar Anda dengan topik kursus ini?',
        points: 1,
        options: {
            choices: [
                { id: 'a', text: 'Sangat familiar' },
                { id: 'b', text: 'Cukup familiar' },
                { id: 'c', text: 'Sedikit familiar' },
                { id: 'd', text: 'Tidak familiar sama sekali' }
            ]
        },
        correctAnswer: 'b'
    },
    {
        type: 'MULTIPLE_CHOICE',
        text: 'Apa ekspektasi Anda setelah menyelesaikan kursus ini?',
        points: 1,
        options: {
            choices: [
                { id: 'a', text: 'Dapat menerapkan ilmu di pekerjaan' },
                { id: 'b', text: 'Memahami konsep dasar' },
                { id: 'c', text: 'Mendapatkan perspektif baru' },
                { id: 'd', text: 'Semua di atas' }
            ]
        },
        correctAnswer: 'd'
    }
];

// Sample questions for posttest
const posttestQuestions = [
    {
        type: 'MULTIPLE_CHOICE',
        text: 'Setelah menyelesaikan kursus, apakah Anda merasa lebih percaya diri dengan topik ini?',
        points: 1,
        options: {
            choices: [
                { id: 'a', text: 'Sangat percaya diri' },
                { id: 'b', text: 'Cukup percaya diri' },
                { id: 'c', text: 'Sedikit percaya diri' },
                { id: 'd', text: 'Tidak ada perubahan' }
            ]
        },
        correctAnswer: 'a'
    },
    {
        type: 'MULTIPLE_CHOICE',
        text: 'Apakah materi kursus sesuai dengan ekspektasi Anda?',
        points: 1,
        options: {
            choices: [
                { id: 'a', text: 'Sangat sesuai' },
                { id: 'b', text: 'Cukup sesuai' },
                { id: 'c', text: 'Kurang sesuai' },
                { id: 'd', text: 'Tidak sesuai' }
            ]
        },
        correctAnswer: 'a'
    },
    {
        type: 'MULTIPLE_CHOICE',
        text: 'Apakah Anda akan merekomendasikan kursus ini kepada rekan kerja?',
        points: 1,
        options: {
            choices: [
                { id: 'a', text: 'Pasti akan merekomendasikan' },
                { id: 'b', text: 'Kemungkinan akan merekomendasikan' },
                { id: 'c', text: 'Mungkin tidak' },
                { id: 'd', text: 'Tidak akan merekomendasikan' }
            ]
        },
        correctAnswer: 'a'
    },
    {
        type: 'MULTIPLE_CHOICE',
        text: 'Apa bagian yang paling bermanfaat dari kursus ini?',
        points: 1,
        options: {
            choices: [
                { id: 'a', text: 'Materi video pembelajaran' },
                { id: 'b', text: 'Contoh praktis dan studi kasus' },
                { id: 'c', text: 'Penjelasan yang mudah dipahami' },
                { id: 'd', text: 'Semua aspek bermanfaat' }
            ]
        },
        correctAnswer: 'd'
    }
];

async function createDefaultQuizzes() {
    try {
        console.log("=== Creating Pretest & Posttest for All Courses ===\n");

        // Get all published courses
        const courses = await prisma.course.findMany({
            where: { isPublished: true },
            include: {
                Module: {
                    orderBy: { order: 'asc' }
                }
            }
        });

        console.log(`Found ${courses.length} published courses\n`);

        for (const course of courses) {
            if (course.Module.length === 0) {
                console.log(`⚠️  Skipping "${course.title}" - no modules`);
                continue;
            }

            const firstModule = course.Module[0];
            const lastModule = course.Module[course.Module.length - 1];

            console.log(`Processing: ${course.title}`);

            // Check if PRETEST already exists
            const existingPretest = await prisma.quiz.findFirst({
                where: {
                    moduleId: firstModule.id,
                    type: 'PRETEST'
                }
            });

            if (!existingPretest) {
                // Create PRETEST
                const pretest = await prisma.quiz.create({
                    data: {
                        id: crypto.randomUUID(),
                        title: `Pretest: ${course.title}`,
                        description: 'Tes awal untuk mengukur pemahaman dasar Anda sebelum memulai kursus',
                        moduleId: firstModule.id,
                        type: 'PRETEST',
                        passingScore: 0,           // No passing grade requirement
                        maxAttempts: 1,            // Only once
                        shuffleQuestions: false,
                        showCorrectAnswers: false, // Don't show answers
                        updatedAt: new Date(),
                    }
                });

                // Add questions
                for (let i = 0; i < pretestQuestions.length; i++) {
                    const q = pretestQuestions[i];
                    await prisma.question.create({
                        data: {
                            id: crypto.randomUUID(),
                            quizId: pretest.id,
                            type: q.type,
                            text: q.text,
                            points: q.points,
                            order: i + 1,
                            options: q.options,
                            modelAnswer: q.correctAnswer,
                        }
                    });
                }
                console.log(`  ✅ Created PRETEST with ${pretestQuestions.length} questions`);
            } else {
                console.log(`  ⏭️  PRETEST already exists`);
            }

            // Check if POSTTEST already exists
            const existingPosttest = await prisma.quiz.findFirst({
                where: {
                    moduleId: lastModule.id,
                    type: 'POSTTEST'
                }
            });

            if (!existingPosttest) {
                // Create POSTTEST
                const posttest = await prisma.quiz.create({
                    data: {
                        id: crypto.randomUUID(),
                        title: `Posttest: ${course.title}`,
                        description: 'Evaluasi akhir untuk mengukur pemahaman Anda setelah menyelesaikan kursus',
                        moduleId: lastModule.id,
                        type: 'POSTTEST',
                        passingScore: 70,
                        maxAttempts: 3,
                        shuffleQuestions: false,
                        showCorrectAnswers: true,
                        updatedAt: new Date(),
                    }
                });

                // Add questions
                for (let i = 0; i < posttestQuestions.length; i++) {
                    const q = posttestQuestions[i];
                    await prisma.question.create({
                        data: {
                            id: crypto.randomUUID(),
                            quizId: posttest.id,
                            type: q.type,
                            text: q.text,
                            points: q.points,
                            order: i + 1,
                            options: q.options,
                            modelAnswer: q.correctAnswer,
                        }
                    });
                }
                console.log(`  ✅ Created POSTTEST with ${posttestQuestions.length} questions`);
            } else {
                console.log(`  ⏭️  POSTTEST already exists`);
            }

            console.log('');
        }

        console.log("✅ Pretest & Posttest creation completed!");

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

createDefaultQuizzes();
