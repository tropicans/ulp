const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function updateQuizRules() {
    try {
        console.log("=== Updating Pretest/Posttest Rules ===\n");

        // Update all PRETEST
        const pretestUpdate = await prisma.quiz.updateMany({
            where: { type: 'PRETEST' },
            data: {
                passingScore: 0,           // No passing grade
                maxAttempts: 1,            // Only once
                showCorrectAnswers: false, // Don't show answers (it's assessment)
                updatedAt: new Date()
            }
        });

        console.log(`✅ Updated ${pretestUpdate.count} PRETEST quizzes`);
        console.log(`   - Passing score: 0% (no requirement)`);
        console.log(`   - Max attempts: 1`);
        console.log(`   - Show answers: No`);

        // Update all POSTTEST
        const posttestUpdate = await prisma.quiz.updateMany({
            where: { type: 'POSTTEST' },
            data: {
                passingScore: 70,          // 70% passing grade
                maxAttempts: 3,            // 3 attempts max
                showCorrectAnswers: true,  // Show correct answers after attempt
                updatedAt: new Date()
            }
        });

        console.log(`\n✅ Updated ${posttestUpdate.count} POSTTEST quizzes`);
        console.log(`   - Passing score: 70%
   - Max attempts: 3
   - Show answers: Yes
`);

        // Verify updates
        console.log("\n=== Verification ===\n");

        const samplePretest = await prisma.quiz.findFirst({
            where: { type: 'PRETEST' },
            select: {
                title: true,
                type: true,
                passingScore: true,
                maxAttempts: true,
                showCorrectAnswers: true
            }
        });

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

        console.log("Sample PRETEST:", samplePretest);
        console.log("\nSample POSTTEST:", samplePosttest);

        console.log("\n✅ All quiz rules updated successfully!");

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

updateQuizRules();
