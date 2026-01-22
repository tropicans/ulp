const { Client: LegacyClient } = require('pg');
const { PrismaClient } = require('./src/generated/prisma');
const crypto = require('crypto');

const legacyConnection = "postgresql://postgres:4ed0abc7506f3cca83e65a26b4d01e3f0413e362ec148de91b8ad3d847ad1f7f@127.0.0.1:5432/postgres";
const prisma = new PrismaClient();

// Enhanced Aiken parser - more flexible
function parseAikenQuiz(aikenText) {
    if (!aikenText || typeof aikenText !== 'string') return [];

    const questions = [];

    // Split by question number or double newline
    let blocks = aikenText.split(/\n\s*\n+/);

    for (const block of blocks) {
        if (!block.trim()) continue;

        const lines = block.trim().split('\n').map(l => l.trim());

        let questionText = '';
        const options = [];
        let correctAnswer = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Skip empty or just numbers
            if (!line || line.match(/^\d+\.?$/)) continue;

            // Answer line
            if (line.match(/^ANSWER\s*:?\s*([A-Z])/i)) {
                const match = line.match(/^ANSWER\s*:?\s*([A-Z])/i);
                correctAnswer = match[1].toUpperCase();
                continue;
            }

            // Option line (A., A), A:, etc.)
            if (line.match(/^([A-Z])\s*[).:]?\s*(.+)/i)) {
                const match = line.match(/^([A-Z])\s*[).:]?\s*(.+)/i);
                const optionText = match[2].trim();
                if (optionText && optionText.length > 1) {
                    options.push(optionText);
                    continue;
                }
            }

            // Question text
            if (!questionText) {
                questionText = line.replace(/^\d+\.\s*/, ''); // Remove leading number
            } else if (!line.match(/^[A-Z]\s*[).]/) && !line.match(/^ANSWER/i)) {
                questionText += ' ' + line; // Multi-line question
            }
        }

        if (questionText && options.length >= 2 && correctAnswer) {
            questions.push({
                text: questionText,
                options: options,
                correctAnswer: correctAnswer
            });
        }
    }

    return questions;
}

async function targetedQuizImport() {
    const legacyClient = new LegacyClient({ connectionString: legacyConnection });

    try {
        await legacyClient.connect();
        console.log("=== Targeted Quiz Import for 10 Courses ===\n");

        // Get courses from TITIAN
        const courses = await prisma.course.findMany({
            where: { ytPlaylistId: { not: null } },
            include: {
                Module: { orderBy: { order: 'asc' } }
            }
        });

        console.log(`Found ${courses.length} courses with ytPlaylistId\n`);

        let imported = 0;

        for (const course of courses) {
            console.log(`\nProcessing: ${course.title}`);
            console.log(`  Playlist ID: ${course.ytPlaylistId}`);

            // Get quiz from legacy DB
            const result = await legacyClient.query(
                'SELECT quiz_prepost, has_quiz_prepost FROM yt_playlists WHERE playlist_id = $1',
                [course.ytPlaylistId]
            );

            if (result.rows.length === 0) {
                console.log(`  ⚠️  Not found in legacy DB`);
                continue;
            }

            const quizData = result.rows[0].quiz_prepost;
            const hasQuiz = result.rows[0].has_quiz_prepost;

            if (!hasQuiz || !quizData) {
                console.log(`  ⚠️  No quiz data`);
                continue;
            }

            console.log(`  📄 Quiz data length: ${quizData.length} chars`);

            // Parse
            const questions = parseAikenQuiz(quizData);

            if (questions.length === 0) {
                console.log(`  ⚠️  Failed to parse quiz`);
                console.log(`  Sample: ${quizData.substring(0, 300)}...`);
                continue;
            }

            console.log(`  ✅ Parsed ${questions.length} questions`);

            // Split pretest/posttest
            const mid = Math.ceil(questions.length / 2);
            const pretestQ = questions.slice(0, mid);
            const posttestQ = questions.slice(mid);

            if (course.Module.length === 0) {
                console.log(`  ⚠️  No modules`);
                continue;
            }

            const firstModule = course.Module[0];
            const lastModule = course.Module[course.Module.length - 1];

            // Update PRETEST
            const pretest = await prisma.quiz.findFirst({
                where: { moduleId: firstModule.id, type: 'PRETEST' }
            });

            if (pretest) {
                await prisma.question.deleteMany({ where: { quizId: pretest.id } });

                for (let i = 0; i < pretestQ.length; i++) {
                    const q = pretestQ[i];
                    const correctIdx = q.correctAnswer.charCodeAt(0) - 'A'.charCodeAt(0);

                    await prisma.question.create({
                        data: {
                            id: crypto.randomUUID(),
                            quizId: pretest.id,
                            type: 'MULTIPLE_CHOICE',
                            text: q.text,
                            points: 1,
                            order: i + 1,
                            options: q.options,
                            modelAnswer: q.options[correctIdx] || q.options[0],
                        }
                    });
                }
                console.log(`  ✅ PRETEST updated: ${pretestQ.length} questions`);
            }

            // Update POSTTEST
            const posttest = await prisma.quiz.findFirst({
                where: { moduleId: lastModule.id, type: 'POSTTEST' }
            });

            if (posttest) {
                await prisma.question.deleteMany({ where: { quizId: posttest.id } });

                for (let i = 0; i < posttestQ.length; i++) {
                    const q = posttestQ[i];
                    const correctIdx = q.correctAnswer.charCodeAt(0) - 'A'.charCodeAt(0);

                    await prisma.question.create({
                        data: {
                            id: crypto.randomUUID(),
                            quizId: posttest.id,
                            type: 'MULTIPLE_CHOICE',
                            text: q.text,
                            points: 1,
                            order: i + 1,
                            options: q.options,
                            modelAnswer: q.options[correctIdx] || q.options[0],
                        }
                    });
                }
                console.log(`  ✅ POSTTEST updated: ${posttestQ.length} questions`);
            }

            imported++;
        }

        console.log(`\n\n✅ Successfully imported quiz for ${imported}/${courses.length} courses!`);

    } catch (error) {
        console.error("\n❌ Error:", error);
    } finally {
        await legacyClient.end();
        await prisma.$disconnect();
    }
}

targetedQuizImport();
