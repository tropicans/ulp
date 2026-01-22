const fs = require('fs');
const { PrismaClient } = require('./src/generated/prisma');
const crypto = require('crypto');

const prisma = new PrismaClient();

/**
 * Parse Aiken format quiz
 */
function parseAikenQuiz(aikenText) {
    if (!aikenText || typeof aikenText !== 'string') return [];

    const questions = [];
    const blocks = aikenText.split(/(?=\n\d+\.|^\d+\.)/m).filter(b => b.trim());

    for (const block of blocks) {
        const lines = block.trim().split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 3) continue;

        let questionText = '';
        const options = [];
        let correctAnswer = '';

        for (const line of lines) {
            if (line.match(/^\d+\.$/)) continue;

            if (line.match(/^ANSWER:\s*([A-Z])/i)) {
                const match = line.match(/^ANSWER:\s*([A-Z])/i);
                correctAnswer = match[1].toUpperCase();
            }
            else if (line.match(/^[A-Z]\s*[).]/)) {
                const optionText = line.replace(/^[A-Z]\s*[).]/, '').trim();
                if (optionText) options.push(optionText);
            }
            else if (line && !line.match(/^\d+$/)) {
                if (!questionText) {
                    questionText = line.replace(/^\d+\.\s*/, '');
                } else {
                    questionText += ' ' + line;
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

async function importFromExportedFile() {
    try {
        console.log("=== Importing Quiz from Exported File ===\n");

        const fileContent = fs.readFileSync('quiz_export.txt', 'utf8');
        const lines = fileContent.trim().split('\n');

        console.log(`Found ${lines.length} playlists with quiz data\n`);

        let imported = 0;

        for (const line of lines) {
            const [playlistId, quizData] = line.split('||||');

            if (!playlistId || !quizData) continue;

            console.log(`Processing: ${playlistId}`);

            const course = await prisma.course.findFirst({
                where: { ytPlaylistId: playlistId },
                include: {
                    Module: { orderBy: { order: 'asc' } }
                }
            });

            if (!course || course.Module.length === 0) {
                console.log(`  ⚠️  No matching course or no modules`);
                continue;
            }

            const questions = parseAikenQuiz(quizData);

            if (questions.length === 0) {
                console.log(`  ⚠️  No valid questions parsed`);
                continue;
            }

            console.log(`  📝 Parsed ${questions.length} questions`);

            const midpoint = Math.ceil(questions.length / 2);
            const pretestQuestions = questions.slice(0, midpoint);
            const posttestQuestions = questions.slice(midpoint);

            const firstModule = course.Module[0];
            const lastModule = course.Module[course.Module.length - 1];

            // Update PRETEST
            const pretestQuiz = await prisma.quiz.findFirst({
                where: { moduleId: firstModule.id, type: 'PRETEST' }
            });

            if (pretestQuiz) {
                await prisma.question.deleteMany({ where: { quizId: pretestQuiz.id } });

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
                console.log(`  ✅ PRETEST: ${pretestQuestions.length} questions`);
            }

            // Update POSTTEST
            const posttestQuiz = await prisma.quiz.findFirst({
                where: { moduleId: lastModule.id, type: 'POSTTEST' }
            });

            if (posttestQuiz) {
                await prisma.question.deleteMany({ where: { quizId: posttestQuiz.id } });

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
                console.log(`  ✅ POSTTEST: ${posttestQuestions.length} questions`);
            }

            imported++;
            console.log('');
        }

        console.log(`\n✅ Successfully imported quiz for ${imported} courses!`);

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

importFromExportedFile();
