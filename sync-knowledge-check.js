const { Client } = require('pg');
const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

// Legacy Supabase connection
const legacyClient = new Client({
    connectionString: 'postgresql://postgres:4ed0abc7506f3cca83e65a26b4d01e3f0413e362ec148de91b8ad3d847ad1f7f@localhost:5432/postgres'
});

// Parse text-based quiz format to JSON
// Format:
// Question text
// A. Option A
// B. Option B
// C. Option C
// D. Option D
// ANSWER: B
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

        // Question is everything before options
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
            // Remove "A. " prefix
            return line.slice(3).trim();
        });

        // Correct answer index (A=0, B=1, C=2, D=3)
        const correctIndex = answerLetter.charCodeAt(0) - 65; // 'A' = 65

        if (correctIndex < 0 || correctIndex >= options.length) return null;

        return {
            question,
            options,
            correct: correctIndex
        };
    } catch (e) {
        console.error('Parse error:', e);
        return null;
    }
}

async function syncKnowledgeCheck() {
    try {
        console.log('=== Syncing Knowledge Check from Supabase to TITIAN ===\n');

        await legacyClient.connect();
        console.log('✓ Connected to Supabase (legacy)');

        // Get all quiz_knowledge_check data from legacy
        const result = await legacyClient.query(`
            SELECT video_id, quiz_knowledge_check 
            FROM yt_playlist_items 
            WHERE quiz_knowledge_check IS NOT NULL 
            AND quiz_knowledge_check != ''
        `);

        console.log(`Found ${result.rows.length} items with knowledge check data\n`);

        let synced = 0;
        let parsed = 0;

        for (const row of result.rows) {
            const { video_id, quiz_knowledge_check } = row;

            // Parse to JSON
            const jsonQuiz = parseQuizToJson(quiz_knowledge_check);
            const quizData = jsonQuiz ? JSON.stringify(jsonQuiz) : quiz_knowledge_check;

            if (jsonQuiz) parsed++;

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
                console.log(`✓ ${video_id}: ${jsonQuiz ? 'Parsed to JSON' : 'Raw text'}`);
            }
        }

        console.log(`\n=== Summary ===`);
        console.log(`Total items with quiz: ${result.rows.length}`);
        console.log(`Successfully synced: ${synced}`);
        console.log(`Parsed to JSON: ${parsed}`);
        console.log(`\n✅ Knowledge check sync complete!`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await legacyClient.end();
        await prisma.$disconnect();
    }
}

syncKnowledgeCheck();
