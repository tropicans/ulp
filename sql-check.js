const { Client } = require('pg');
const connectionString = "postgresql://postgres:4ed0abc7506f3cca83e65a26b4d01e3f0413e362ec148de91b8ad3d847ad1f7f@localhost:5434/superppkasn";

async function checkData() {
    const client = new Client({ connectionString });
    try {
        await client.connect();

        console.log("Checking yt_ tables in training_system...");
        const tables = ['yt_playlists', 'yt_playlist_items', 'yt_curation_sessions', 'yt_curation_candidates'];
        for (const table of tables) {
            try {
                const res = await client.query(`SELECT COUNT(*) FROM "${table}"`);
                console.log(`- ${table}: ${res.rows[0].count}`);

                if (res.rows[0].count > 0 && table === 'yt_playlists') {
                    const sample = await client.query(`SELECT "playlist_title" FROM "yt_playlists" LIMIT 3`);
                    console.log("  Sample titles:");
                    sample.rows.forEach(r => console.log(`    - ${r.playlist_title}`));
                }
            } catch (e) {
                console.log(`- ${table}: NOT FOUND (${e.message})`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkData();
