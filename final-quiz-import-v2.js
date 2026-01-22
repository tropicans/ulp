const fs = require('fs');
const { PrismaClient } = require('./src/generated/prisma');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Working parser from test
function parseAikenQuiz(aikenText) {
    if (!aikenText || typeof aikenText !== 'string') return [];

    const questions = [];
    const blocks = aikenText.split(/\n\s*\n+/).filter(b => b.trim());

    for (const block of blocks) {
        const lines = block.trim().split('\n').map(l => l.trim());

        let questionText = '';
        const options = [];
        let correctAnswer = '';

        for (const line of lines) {
            if (!line) continue;

            if (line.match(/^ANSWER\s*:?\s*([A-Z])/i)) {
                const match = line.match(/^ANSWER\s*:?\s*([A-Z])/i);
                correctAnswer = match[1].toUpperCase();
            }
            else if (line.match(/^([A-Z])\.\s*(.+)/)) {
                const match = line.match(/^([A-Z])\.\s*(.+)/);
                const optionText = match[2].trim();
                options.push(optionText);
            }
            else if (!line.match(/^[A-Z]\./) && !line.match(/^ANSWER/i)) {
                questionText = questionText ? questionText + ' ' + line : line;
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

async function importQuizFromFile() {
    try {
        console.log("=== Importing Quiz for 10 Courses ===\n");

        const fileContent = fs.readFileSync('quiz_data_10.txt', 'utf8');
        const lines = fileContent.trim().split('\n');

        let imported = 0;
        let failed = 0;

        for (const line of lines) {
            const parts = line.split('||||SPLIT||||');
            if (parts.length < 2) continue;

            const playlistId = parts[0].trim();
            // Important: join back parts in case quiz contains the separator
            const quizData = parts.slice(1).join('||||SPLIT||||');

            console.log(`\nProcessing playlist: ${playlistId}`);

            const course = await prisma.course.findFirst({
                where: { ytPlaylistId: playlistId },
                include: { Module: { orderBy: { order: 'asc' } } }
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

            const questions = parseAikenQuiz(quizData);

            if (questions.length === 0) {
                console.log(`  ⚠️  No questions parsed`);
                console.log(`  Quiz length: ${quizData.length} chars`);
                console.log(`  First 200: ${quizData.substring(0, 200)}`);
                failed++;
                continue;
            }

            console.log(`  ✅ Parsed ${questions.length} questions`);

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

    } catch (error) {
        console.error("\n❌ Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

importQuizFromFile();
