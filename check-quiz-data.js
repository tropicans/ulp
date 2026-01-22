const { Client } = require('pg');
const connectionString = "postgresql://postgres:lxp_password_change_me@localhost:5433/lxp_asn";

async function checkQuizData() {
    const client = new Client({ connectionString });
    try {
        await client.connect();

        console.log("=== Checking Quiz Data ===\n");

        // First, check count
        const count = await client.query(`
      SELECT COUNT(*) as total
      FROM yt_playlists 
      WHERE has_quiz_prepost = true
    `);
        console.log(`Total playlists with quiz: ${count.rows[0].total}\n`);

        // Get sample data
        const result = await client.query(`
      SELECT 
        playlist_id,
        LEFT(quiz_prepost, 500) as quiz_sample
      FROM yt_playlists 
      WHERE has_quiz_prepost = true
      LIMIT 2
    `);

        result.rows.forEach((row, idx) => {
            console.log(`\n=== Sample ${idx + 1} ===`);
            console.log(`Playlist ID: ${row.playlist_id}`);
            console.log(`Quiz Content (first 500 chars):`);
            console.log(row.quiz_sample);
            console.log('\n---');
        });

    } catch (err) {
        console.error("Error:", err.message);
        console.error(err);
    } finally {
        await client.end();
    }
}

checkQuizData();
