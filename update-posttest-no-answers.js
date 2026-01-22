const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function updatePosttestRules() {
    try {
        console.log("=== Updating POSTTEST Rules ===\n");

        // Update all POSTTEST - disable showing correct answers
        const posttestUpdate = await prisma.quiz.updateMany({
            where: { type: 'POSTTEST' },
            data: {
                showCorrectAnswers: false,  // Hide correct answers
                updatedAt: new Date()
            }
        });

        console.log(`✅ Updated ${posttestUpdate.count} POSTTEST quizzes`);
        console.log(`   - Show correct answers: No (changed from Yes)`);

        // Verify updates
        console.log("\n=== Verification ===\n");

        const samplePosttest = await prisma.quiz.findFirst({
            where: { type: 'POSTTEST' },
            select: {
                title: true,
                type: true,
                passingScore: true,
                maxAttempts: true,
                showCorrectAnswers: true
            }
        });

        console.log("Sample POSTTEST:", samplePosttest);
        console.log("\n✅ POSTTEST rules updated - correct answers will NOT be shown!");

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

updatePosttestRules();
