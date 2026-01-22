const { Client: LegacyClient } = require('pg');
const { PrismaClient } = require('./src/generated/prisma');
const crypto = require('crypto');

const legacyConnection = "postgresql://postgres:4ed0abc7506f3cca83e65a26b4d01e3f0413e362ec148de91b8ad3d847ad1f7f@localhost:5432/postgres";
const prisma = new PrismaClient();

/**
 * Parse Aiken format quiz
 * Format example:
 * What is the capital of France?
 * A) London
 * B) Paris
 * C) Berlin
 * ANSWER: B
 */
function parseAikenQuiz(aikenText) {
    if (!aikenText || typeof aikenText !== 'string') return [];

    const questions = [];
    // Split by question number pattern or double newline
    const blocks = aikenText.split(/(?=\n\d+\.|^\d+\.)/m).filter(b => b.trim());

    for (const block of blocks) {
        const lines = block.trim().split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 3) continue;

        let questionText = '';
        const options = [];
        let correctAnswer = '';

        for (const line of lines) {
            // Skip question numbers like "1.", "2."
            if (line.match(/^\d+\.$/)) continue;

            // Check if it's an answer line
            if (line.match(/^ANSWER:\s*([A-Z])/i)) {
                const match = line.match(/^ANSWER:\s*([A-Z])/i);
                correctAnswer = match[1].toUpperCase();
            }
            // Check if it's an option (A), B), C), D), etc.)
            else if (line.match(/^[A-Z]\s*[).]/)) {
                const optionText = line.replace(/^[A-Z]\s*[).]/, '').trim();
                if (optionText) options.push(optionText);
            }
            // Must be question text (skip if it's just a number)
            else if (line && !line.match(/^\d+$/)) {
                if (!questionText) {
                    questionText = line.replace(/^\d+\.\s*/, ''); // Remove leading "1. " if exists
                } else {
                    questionText += ' ' + line; // Multi-line question
                }
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

async function importQuizFromLegacy() {
    const legacyClient = new LegacyClient({ connectionString: legacyConnection });

    try {
        await legacyClient.connect();
        console.log("=== Importing Quiz from Legacy Database ===\n");

        // Get playlists with quiz data from LEGACY
        const result = await legacyClient.query(`
            SELECT playlist_id, quiz_prepost
            FROM yt_playlists 
            WHERE has_quiz_prepost = true
        `);

        console.log(`Found ${result.rows.length} playlists with quiz data\n`);

        let imported = 0;

        for (const legacyPlaylist of result.rows) {
            console.log(`Processing playlist: ${legacyPlaylist.playlist_id}`);

            // Find corresponding course in TITIAN DB
            const course = await prisma.course.findFirst({
                where: { ytPlaylistId: legacyPlaylist.playlist_id },
                include: {
                    Module: {
                        orderBy: { order: 'asc' }
                    }
                }
            });

            if (!course) {
                console.log(`  ⚠️  No matching course in TITIAN DB`);
                continue;
            }

            if (course.Module.length === 0) {
                console.log(`  ⚠️  Course has no modules`);
                continue;
            }

            // Parse Aiken format
            const questions = parseAikenQuiz(legacyPlaylist.quiz_prepost);

            if (questions.length === 0) {
                console.log(`  ⚠️  No valid questions parsed from Aiken format`);
                console.log(`  Sample: ${legacyPlaylist.quiz_prepost.substring(0, 200)}`);
                continue;
            }

            console.log(`  📝 Parsed ${questions.length} questions from Aiken format`);

            // Split into pretest and posttest
            const midpoint = Math.ceil(questions.length / 2);
            const pretestQuestions = questions.slice(0, midpoint);
            const posttestQuestions = questions.slice(midpoint);

            const firstModule = course.Module[0];
            const lastModule = course.Module[course.Module.length - 1];

            // Update PRETEST
            const pretestQuiz = await prisma.quiz.findFirst({
                where: {
                    moduleId: firstModule.id,
                    type: 'PRETEST'
                }
            });

            if (pretestQuiz) {
                await prisma.question.deleteMany({
                    where: { quizId: pretestQuiz.id }
                });

                for (let i = 0; i < pretestQuestions.length; i++) {
                    const q = pretestQuestions[i];
                    const correctIndex = q.correctAnswer.charCodeAt(0) - 'A'.charCodeAt(0);

                    await prisma.question.create({
                        data: {
                            id: crypto.randomUUID(),
                            quizId: pretestQuiz.id,
                            type: 'MULTIPLE_CHOICE',
                            text: q.text,
                            points: 1,
                            order: i + 1,
                            options: q.options,
                            modelAnswer: q.options[correctIndex] || q.options[0],
                        }
                    });
                }
                console.log(`  ✅ Updated PRETEST: ${pretestQuestions.length} questions`);
            }

            // Update POSTTEST
            const posttestQuiz = await prisma.quiz.findFirst({
                where: {
                    moduleId: lastModule.id,
                    type: 'POSTTEST'
                }
            });

            if (posttestQuiz) {
                await prisma.question.deleteMany({
                    where: { quizId: posttestQuiz.id }
                });

                for (let i = 0; i < posttestQuestions.length; i++) {
                    const q = posttestQuestions[i];
                    const correctIndex = q.correctAnswer.charCodeAt(0) - 'A'.charCodeAt(0);

                    await prisma.question.create({
                        data: {
                            id: crypto.randomUUID(),
                            quizId: posttestQuiz.id,
                            type: 'MULTIPLE_CHOICE',
                            text: q.text,
                            points: 1,
                            order: i + 1,
                            options: q.options,
                            modelAnswer: q.options[correctIndex] || q.options[0],
                        }
                    });
                }
                console.log(`  ✅ Updated POSTTEST: ${posttestQuestions.length} questions`);
            }

            imported++;
            console.log('');
        }

        console.log(`\n✅ Successfully imported quiz for ${imported} courses!`);

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await legacyClient.end();
        await prisma.$disconnect();
    }
}

importQuizFromLegacy();
