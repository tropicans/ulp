const { Client } = require('pg');
const connectionString = "postgresql://postgres:lxp_password_change_me@localhost:5433/lxp_asn";

async function checkMigration() {
    const client = new Client({ connectionString });
    try {
        await client.connect();

        const courses = await client.query('SELECT COUNT(*) FROM "Course" WHERE "ytPlaylistId" IS NOT NULL');
        const modules = await client.query('SELECT COUNT(*) FROM "Module" WHERE "courseId" IN (SELECT id FROM "Course" WHERE "ytPlaylistId" IS NOT NULL)');
        const lessons = await client.query('SELECT COUNT(*) FROM "Lesson" WHERE "moduleId" IN (SELECT id FROM "Module" WHERE "courseId" IN (SELECT id FROM "Course" WHERE "ytPlaylistId" IS NOT NULL))');

        console.log("Migration Status:");
        console.log(`- Courses migrated: ${courses.rows[0].count}`);
        console.log(`- Modules created: ${modules.rows[0].count}`);
        console.log(`- Lessons created: ${lessons.rows[0].count}`);

        const ytPlaylists = await client.query('SELECT COUNT(*) FROM "yt_playlists"');
        const ytItems = await client.query('SELECT COUNT(*) FROM "yt_playlist_items"');

        console.log("\nyt_ table status:");
        console.log(`- yt_playlists: ${ytPlaylists.rows[0].count}`);
        console.log(`- yt_playlist_items: ${ytItems.rows[0].count}`);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkMigration();
