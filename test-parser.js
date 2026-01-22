const fs = require('fs');

// Test parser
const testQuiz = `Penyebab disabilitas pendengaran Anggi Yudistia adalah karena penyakit apa?
A. Demam berdarah
B. Malaria
C. Tuberkulosis
D. HIV/AIDS
ANSWER: B

Bagaimana tantangan utama yang dihadapi oleh Anggi dalam mencari pekerjaan?
A. Kurangnya pendidikan tingkat tinggi
B. Stigma terkait disabilitas
C. Tidak ada keterampilan teknis
D. Tidak adanya jaringan profesional
ANSWER: B`;

function parseAikenQuiz(aikenText) {
    if (!aikenText || typeof aikenText !== 'string') return [];

    const questions = [];

    // Split by double newline
    const blocks = aikenText.split(/\n\s*\n+/).filter(b => b.trim());

    console.log(`Found ${blocks.length} blocks\n`);

    for (let idx = 0; idx < blocks.length; idx++) {
        const block = blocks[idx];
        console.log(`\n--- Block ${idx + 1} ---`);
        console.log(block.substring(0, 200));
        console.log('---\n');

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
                console.log(`  ✅ Found answer: ${correctAnswer}`);
            }
            // Option line (A., A), etc)
            else if (line.match(/^([A-Z])\.\s*(.+)/)) {
                const match = line.match(/^([A-Z])\.\s*(.+)/);
                const optionText = match[2].trim();
                options.push(optionText);
                console.log(`  ✅ Found option: ${match[1]} - ${optionText}`);
            }
            // Question text
            else if (!line.match(/^[A-Z]\./) && !line.match(/^ANSWER/i)) {
                questionText = questionText ? questionText + ' ' + line : line;
                console.log(`  ✅ Question text: ${line}`);
            }
        }

        // Validate
        if (questionText && options.length >= 2 && correctAnswer) {
            questions.push({
                text: questionText,
                options: options,
                correctAnswer: correctAnswer
            });
            console.log(`  ✅✅ Valid question added!`);
        } else {
            console.log(`  ❌ Invalid: text=${!!questionText}, options=${options.length}, answer=${correctAnswer}`);
        }
    }

    return questions;
}

console.log("=== Testing Parser ===\n");
const result = parseAikenQuiz(testQuiz);
console.log(`\n\n=== Result: ${result.length} questions ===`);
result.forEach((q, i) => {
    console.log(`\n${i + 1}. ${q.text}`);
    console.log(`   Options: ${q.options.length}`);
    console.log(`   Answer: ${q.correctAnswer}`);
});

// Now test with actual file
console.log("\n\n=== Testing with actual file ===\n");
const fileContent = fs.readFileSync('quiz_data_10.txt', 'utf8');
const firstQuiz = fileContent.split('||||SPLIT||||')[1];
if (firstQuiz) {
    console.log(`Quiz data length: ${firstQuiz.length}`);
    console.log(`\nFirst 500 chars:\n${firstQuiz.substring(0, 500)}`);

    const parsed = parseAikenQuiz(firstQuiz);
    console.log(`\n✅ Parsed ${parsed.length} questions from actual file`);
}
