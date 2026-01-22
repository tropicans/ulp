const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function fixQuizOptions() {
    try {
        console.log("=== Fixing Quiz Question Options Format ===\n");

        // Get all PRETEST and POSTTEST questions
        const quizzes = await prisma.quiz.findMany({
            where: {
                type: { in: ['PRETEST', 'POSTTEST'] }
            },
            include: {
                Question: true
            }
        });

        console.log(`Found ${quizzes.length} pretest/posttest quizzes\n`);

        let fixedCount = 0;

        for (const quiz of quizzes) {
            console.log(`Fixing questions for: ${quiz.title}`);

            for (const question of quiz.Question) {
                if (question.options && typeof question.options === 'object') {
                    // Convert from {choices: [{id, text}]} to ["option1", "option2", ...]
                    const currentOptions = question.options;

                    if (currentOptions.choices && Array.isArray(currentOptions.choices)) {
                        // Extract only the text values
                        const optionsArray = currentOptions.choices.map((c) => c.text);

                        await prisma.question.update({
                            where: { id: question.id },
                            data: {
                                options: optionsArray, // Now it's just an array of strings
                            }
                        });

                        fixedCount++;
                        console.log(`  ✅ Fixed question: ${question.text.substring(0, 50)}...`);
                    }
                }
            }
        }

        console.log(`\n✅ Fixed ${fixedCount} questions!`);

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

fixQuizOptions();
