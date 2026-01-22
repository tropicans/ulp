const { Client } = require('pg');

// Check legacy database
const legacyConnection = "postgresql://postgres:4ed0abc7506f3cca83e65a26b4d01e3f0413e362ec148de91b8ad3d847ad1f7f@localhost:5432/postgres";

async function checkLegacyTables() {
    const client = new Client({ connectionString: legacyConnection });
    try {
        await client.connect();

        console.log("=== Tables in Legacy Database ===\n");

        // List all tables
        const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

        console.log("Available tables:");
        tables.rows.forEach(t => console.log(`  - ${t.table_name}`));

        // Check for quiz/question related tables
        console.log("\n=== Checking for Quiz/Question Tables ===\n");

        const quizRelated = tables.rows.filter(t =>
            t.table_name.includes('quiz') ||
            t.table_name.includes('question') ||
            t.table_name.includes('test') ||
            t.table_name.includes('soal') ||
            t.table_name.includes('exam')
        );

        if (quizRelated.length > 0) {
            console.log("Found quiz-related tables:");
            for (const table of quizRelated) {
                const count = await client.query(`SELECT COUNT(*) FROM "${table.table_name}"`);
                console.log(`  - ${table.table_name}: ${count.rows[0].count} rows`);

                // Show sample data
                const sample = await client.query(`SELECT * FROM "${table.table_name}" LIMIT 2`);
                if (sample.rows.length > 0) {
                    console.log(`    Sample columns: ${Object.keys(sample.rows[0]).join(', ')}`);
                }
            }
        } else {
            console.log("No quiz-related tables found.");
        }

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await client.end();
    }
}

checkLegacyTables();
