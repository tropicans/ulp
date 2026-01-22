const { PrismaClient } = require('./src/generated/prisma');
const crypto = require('crypto');

const prisma = new PrismaClient();

/**
 * Parse Aiken format quiz
 * Format:
 * What is the capital of France?
 * A) London
 * B) Paris
 * C) Berlin
 * D) Madrid
 * ANSWER: B
 */
function parseAikenQuiz(aikenText) {
    if (!aikenText || typeof aikenText !== 'string') return [];

    const questions = [];
    const blocks = aikenText.trim().split(/\n\s*\n/); // Split by double newline

    for (const block of blocks) {
        const lines = block.trim().split('\n');
        if (lines.length < 3) continue; // Need at least question, 1 option, and answer

        let questionText = '';
        const options = [];
        let correctAnswer = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Check if it's an answer line
            if (line.match(/^ANSWER:\s*([A-Z])/i)) {
                correctAnswer = line.match(/^ANSWER:\s*([A-Z])/i)[1].toUpperCase();
            }
            // Check if it's an option (A), B), C), etc.)
            else if (line.match(/^[A-Z]\)/)) {
                const optionText = line.substring(2).trim(); // Remove "A) "
                options.push(optionText);
            }
            // Must be question text
            else if (line && !questionText) {
                questionText = line;
            }
        }

        if (questionText && options.length > 0 && correctAnswer) {
            questions.push({
                text: questionText,
                options: options,
                correctAnswer: correctAnswer
            });
        }
    }

    return questions;
}

async function importQuizFromDatabase() {
    try {
        console.log("=== Importing Quiz Questions from yt_playlists ===\n");

        // Get all yt_playlists with quiz data
        const playlists = await prisma.ytPlaylist.findMany({
            where: {
                quizPrepost: { not: null }
            },
            select: {
                id: true,
                playlistId: true,
                title: true,
                quizPrepost: true,
            }
        });

        console.log(`Found ${playlists.length} playlists with quiz data\n`);

        for (const playlist of playlists) {
            console.log(`Processing: ${playlist.title}`);

            // Find corresponding course
            const course = await prisma.course.findFirst({
                where: { ytPlaylistId: playlist.playlistId },
                include: {
                    Module: {
                        orderBy: { order: 'asc' }
                    }
                }
            });

            if (!course) {
                console.log(`  ⚠️  No course found for playlist ${playlist.playlistId}`);
                continue;
            }

            if (course.Module.length === 0) {
                console.log(`  ⚠️  Course has no modules`);
                continue;
            }

            // Parse Aiken format
            const questions = parseAikenQuiz(playlist.quizPrepost);

            if (questions.length === 0) {
                console.log(`  ⚠️  No valid questions parsed`);
                continue;
            }

            console.log(`  📝 Parsed ${questions.length} questions`);

            // Split into pretest (first half) and posttest (second half)
            const midpoint = Math.ceil(questions.length / 2);
            const pretestQuestions = questions.slice(0, midpoint);
            const posttestQuestions = questions.slice(midpoint);

            const firstModule = course.Module[0];
            const lastModule = course.Module[course.Module.length - 1];

            // Find existing PRETEST
            const existingPretest = await prisma.quiz.findFirst({
                where: {
                    moduleId: firstModule.id,
                    type: 'PRETEST'
                },
                include: { Question: true }
            });

            if (existingPretest) {
                // Delete old questions
                await prisma.question.deleteMany({
                    where: { quizId: existingPretest.id }
                });

                // Insert new questions
                for (let i = 0; i < pretestQuestions.length; i++) {
                    const q = pretestQuestions[i];
                    const correctIndex = q.correctAnswer.charCodeAt(0) - 'A'.charCodeAt(0);

                    await prisma.question.create({
                        data: {
                            id: crypto.randomUUID(),
                            quizId: existingPretest.id,
                            type: 'MULTIPLE_CHOICE',
                            text: q.text,
                            points: 1,
                            order: i + 1,
                            options: q.options,
                            modelAnswer: q.options[correctIndex] || q.options[0],
                        }
                    });
                }
                console.log(`  ✅ Updated PRETEST with ${pretestQuestions.length} questions`);
            }

            // Find existing POSTTEST
            const existingPosttest = await prisma.quiz.findFirst({
                where: {
                    moduleId: lastModule.id,
                    type: 'POSTTEST'
                },
                include: { Question: true }
            });

            if (existingPosttest) {
                // Delete old questions
                await prisma.question.deleteMany({
                    where: { quizId: existingPosttest.id }
                });

                // Insert new questions
                for (let i = 0; i < posttestQuestions.length; i++) {
                    const q = posttestQuestions[i];
                    const correctIndex = q.correctAnswer.charCodeAt(0) - 'A'.charCodeAt(0);

                    await prisma.question.create({
                        data: {
                            id: crypto.randomUUID(),
                            quizId: existingPosttest.id,
                            type: 'MULTIPLE_CHOICE',
                            text: q.text,
                            points: 1,
                            order: i + 1,
                            options: q.options,
                            modelAnswer: q.options[correctIndex] || q.options[0],
                        }
                    });
                }
                console.log(`  ✅ Updated POSTTEST with ${posttestQuestions.length} questions`);
            }

            console.log('');
        }

        console.log("✅ Quiz import completed!");

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

importQuizFromDatabase();
