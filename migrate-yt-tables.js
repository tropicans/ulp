const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { Client } = require('pg');

const titanConnection = "postgresql://postgres:lxp_password_change_me@localhost:5433/lxp_asn";

async function migrateYtTables() {
    const client = new Client({ connectionString: titanConnection });

    try {
        await client.connect();
        console.log("=== Migrating yt_ Tables to TITIAN DB ===\n");

        // Read yt_playlists CSV
        console.log("Reading yt_playlists...");
        const playlistsCsv = fs.readFileSync('legacy_yt_playlists_full.csv', 'utf8');
        const playlists = parse(playlistsCsv, { columns: true, skip_empty_lines: true });
        console.log(`Found ${playlists.length} playlists\n`);

        // Read yt_playlist_items CSV
        console.log("Reading yt_playlist_items...");
        const itemsCsv = fs.readFileSync('legacy_yt_playlist_items_full.csv', 'utf8');
        const items = parse(itemsCsv, { columns: true, skip_empty_lines: true });
        console.log(`Found ${items.length} playlist items\n`);

        // Start transaction
        await client.query('BEGIN');

        // Clear existing data (optional - comment out if you want to keep existing)
        console.log("Clearing existing data...");
        await client.query('DELETE FROM yt_playlist_items');
        await client.query('DELETE FROM yt_playlists');
        console.log("✅ Cleared\n");

        // Insert playlists
        console.log("Inserting playlists...");
        let playlistCount = 0;
        for (const p of playlists) {
            try {
                await client.query(`
                    INSERT INTO yt_playlists (
                        id, playlist_id, playlist_url, playlist_title, channel_name,
                        channel_url, description, video_count, total_duration,
                        quiz_prepost, has_quiz_prepost, transcript, ai_summary,
                        status, language, requirements, outcomes, meta_keys, meta_desc,
                        recommended_next_courses, has_course_metadata, metadata_generated_at,
                        created_at, updated_at, processed_at, course_level
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
                    ) ON CONFLICT (playlist_id) DO UPDATE SET
                        quiz_prepost = EXCLUDED.quiz_prepost,
                        has_quiz_prepost = EXCLUDED.has_quiz_prepost,
                        ai_summary = EXCLUDED.ai_summary,
                        updated_at = EXCLUDED.updated_at
                `, [
                    p.id, p.playlist_id, p.playlist_url, p.playlist_title, p.channel_name,
                    p.channel_url, p.description, p.video_count, p.total_duration || null,
                    p.quiz_prepost || null, p.has_quiz_prepost === 't' || p.has_quiz_prepost === 'true',
                    p.transcript || null, p.ai_summary || null, p.status || 'pending',
                    p.language || 'Bahasa Indonesia', p.requirements || null, p.outcomes || null,
                    p.meta_keys || null, p.meta_desc || null, p.recommended_next_courses || null,
                    p.has_course_metadata === 't' || p.has_course_metadata === 'true',
                    p.metadata_generated_at || null, p.created_at || 'now()', p.updated_at || 'now()',
                    p.processed_at || null, p.course_level || 'Beginner'
                ]);
                playlistCount++;
            } catch (err) {
                console.error(`  Error inserting playlist ${p.playlist_id}:`, err.message);
            }
        }
        console.log(`✅ Inserted ${playlistCount} playlists\n`);

        // Insert playlist items
        console.log("Inserting playlist items...");
        let itemCount = 0;
        for (const item of items) {
            try {
                await client.query(`
                    INSERT INTO yt_playlist_items (
                        id, playlist_id, video_id, video_url, title, duration,
                        transcript, transcript_language, ai_summary, refined_title,
                        status, created_at, updated_at, processed_at, position
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
                    ) ON CONFLICT (video_id) DO UPDATE SET
                        transcript = EXCLUDED.transcript,
                        ai_summary = EXCLUDED.ai_summary,
                        refined_title = EXCLUDED.refined_title,
                        updated_at = EXCLUDED.updated_at
                `, [
                    item.id, item.playlist_id, item.video_id, item.video_url, item.title,
                    item.duration || null, item.transcript || null, item.transcript_language || 'id',
                    item.ai_summary || null, item.refined_title || null, item.status || 'pending',
                    item.created_at || 'now()', item.updated_at || 'now()', item.processed_at || null,
                    item.position || 0
                ]);
                itemCount++;
            } catch (err) {
                console.error(`  Error inserting item ${item.video_id}:`, err.message);
            }
        }
        console.log(`✅ Inserted ${itemCount} playlist items\n`);

        // Commit transaction
        await client.query('COMMIT');
        console.log("\n✅ Migration completed successfully!");
        console.log(`   Playlists: ${playlistCount}/${playlists.length}`);
        console.log(`   Items: ${itemCount}/${items.length}`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("❌ Error:", error);
    } finally {
        await client.end();
    }
}

migrateYtTables();
