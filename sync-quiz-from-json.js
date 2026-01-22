const { PrismaClient } = require('./src/generated/prisma');
const fs = require('fs');

const prisma = new PrismaClient();

// Parse text-based quiz format to JSON
function parseQuizToJson(quizText) {
    if (!quizText) return null;

    try {
        const lines = quizText.trim().split('\n').map(l => l.trim()).filter(l => l);

        if (lines.length < 3) return null;

        // Find ANSWER line
        const answerLineIndex = lines.findIndex(l => l.startsWith('ANSWER:'));
        if (answerLineIndex === -1) return null;

        const answerLine = lines[answerLineIndex];
        const answerLetter = answerLine.replace('ANSWER:', '').trim().toUpperCase();

        // Options start with A., B., C., D.
        const optionIndices = [];
        lines.forEach((line, idx) => {
            if (/^[A-D]\./.test(line)) {
                optionIndices.push(idx);
            }
        });

        if (optionIndices.length < 2) return null;

        // Question is lines before first option
        const question = lines.slice(0, optionIndices[0]).join(' ');

        // Options
        const options = optionIndices.map(idx => {
            const line = lines[idx];
            return line.slice(3).trim(); // Remove "A. " prefix
        });

        // Correct answer index (A=0, B=1, C=2, D=3)
        const correctIndex = answerLetter.charCodeAt(0) - 65;

        if (correctIndex < 0 || correctIndex >= options.length) return null;

        return { question, options, correct: correctIndex };
    } catch (e) {
        console.error('Parse error:', e);
        return null;
    }
}

async function syncFromJson() {
    try {
        console.log('=== Syncing Knowledge Check to TITIAN ===\n');

        // Read exported data
        const rawData = fs.readFileSync('quiz_raw.json', 'utf8');
        const lines = rawData.trim().split('\n').filter(l => l);

        console.log(`Found ${lines.length} quiz entries\n`);

        let synced = 0;

        for (const line of lines) {
            try {
                const data = JSON.parse(line);
                const { video_id, quiz } = data;

                // Parse to structured JSON
                const jsonQuiz = parseQuizToJson(quiz);

                if (!jsonQuiz) {
                    console.log(`⚠️  ${video_id}: Could not parse`);
                    continue;
                }

                const quizData = JSON.stringify(jsonQuiz);

                // Update TITIAN database
                const updated = await prisma.ytPlaylistItem.updateMany({
                    where: { videoId: video_id },
                    data: {
                        quizKnowledgeCheck: quizData,
                        hasQuizKnowledgeCheck: true
                    }
                });

                if (updated.count > 0) {
                    synced++;
                    console.log(`✓ ${video_id}: "${jsonQuiz.question.slice(0, 50)}..."`);
                } else {
                    console.log(`⚠️  ${video_id}: Not found in TITIAN`);
                }
            } catch (e) {
                console.log(`❌ Parse error: ${e.message}`);
            }
        }

        console.log(`\n=== Summary ===`);
        console.log(`Total entries: ${lines.length}`);
        console.log(`Successfully synced: ${synced}`);
        console.log(`\n✅ Knowledge check sync complete!`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

syncFromJson();
