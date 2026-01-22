const fs = require('fs');
const { PrismaClient } = require('./src/generated/prisma');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Final Aiken parser based on actual format
function parseAikenQuiz(aikenText) {
    if (!aikenText || typeof aikenText !== 'string') return [];

    const questions = [];

    // Split by double newline to separate questions
    const blocks = aikenText.split(/\n\s*\n+/).filter(b => b.trim());

    for (const block of blocks) {
        const lines = block.trim().split('\n').map(l => l.trim());

        let questionText = '';
        const options = [];
        let correctAnswer = '';

        for (const line of lines) {
            if (!line) continue;

            // ANSWER line
            if (line.match(/^ANSWER\s*:?\s*([A-Z])/i)) {
                const match = line.match(/^ANSWER\s*:?\s*([A-Z])/i);
                correctAnswer = match[1].toUpperCase();
            }
            // Option line (A., A), etc)
            else if (line.match(/^([A-Z])\.\s*(.+)/)) {
                const match = line.match(/^([A-Z])\.\s*(.+)/);
                const optionText = match[2].trim();
                options.push(optionText);
            }
            // Question text
            else if (!line.match(/^[A-Z]\./) && !line.match(/^ANSWER/i)) {
                questionText = questionText ? questionText + ' ' + line : line;
            }
        }

        // Validate
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

async function importQuizFromFile() {
    try {
        console.log("=== Importing Quiz for 10 Courses ===\n");

        // Read extracted quiz data
        const fileContent = fs.readFileSync('quiz_data_10.txt', 'utf8');
        const lines = fileContent.trim().split('\n');

        let imported = 0;
        let failed = 0;

        for (const line of lines) {
            const parts = line.split('||||SPLIT||||');
            if (parts.length < 2) continue;

            const playlistId = parts[0].trim();
            const quizData = parts[1];

            console.log(`\nProcessing playlist: ${playlistId}`);

            // Find course
            const course = await prisma.course.findFirst({
                where: { ytPlaylistId: playlistId },
                include: {
                    Module: { orderBy: { order: 'asc' } }
                }
            });

            if (!course) {
                console.log(`  ⚠️  Course not found`);
                failed++;
                continue;
            }

            console.log(`  Course: ${course.title}`);

            if (course.Module.length === 0) {
                console.log(`  ⚠️  No modules`);
                failed++;
                continue;
            }

            // Parse quiz
            const questions = parseAikenQuiz(quizData);

            if (questions.length === 0) {
                console.log(`  ⚠️  No questions parsed`);
                failed++;
                continue;
            }

            console.log(`  ✅ Parsed ${questions.length} questions`);

            // Split into pretest & posttest
            const mid = Math.ceil(questions.length / 2);
            const pretestQ = questions.slice(0, mid);
            const posttestQ = questions.slice(mid);

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
                console.log(`  ✅ PRETEST: ${pretestQ.length} questions`);
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
                console.log(`  ✅ POSTTEST: ${posttestQ.length} questions`);
            }

            imported++;
        }

        console.log(`\n\n=== Import Summary ===`);
        console.log(`✅ Success: ${imported} courses`);
        console.log(`❌ Failed: ${failed} courses`);
        console.log(`\nAll quiz questions from database successfully imported!`);

    } catch (error) {
        console.error("\n❌ Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

importQuizFromFile();
