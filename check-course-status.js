const { Client } = require('pg');
const connectionString = "postgresql://postgres:lxp_password_change_me@localhost:5433/lxp_asn";

async function checkCourseStatus() {
    const client = new Client({ connectionString });
    try {
        await client.connect();

        console.log("=== Course Publication Status ===\n");

        // Total courses
        const total = await client.query('SELECT COUNT(*) FROM "Course"');
        console.log(`Total Courses: ${total.rows[0].count}`);

        // Published vs Unpublished
        const published = await client.query('SELECT COUNT(*) FROM "Course" WHERE "isPublished" = true');
        const unpublished = await client.query('SELECT COUNT(*) FROM "Course" WHERE "isPublished" = false');
        console.log(`- Published: ${published.rows[0].count}`);
        console.log(`- Unpublished: ${unpublished.rows[0].count}`);

        // Migrated courses status
        const migratedTotal = await client.query('SELECT COUNT(*) FROM "Course" WHERE "ytPlaylistId" IS NOT NULL');
        const migratedPublished = await client.query('SELECT COUNT(*) FROM "Course" WHERE "ytPlaylistId" IS NOT NULL AND "isPublished" = true');
        console.log(`\nMigrated Courses (with ytPlaylistId):`);
        console.log(`- Total: ${migratedTotal.rows[0].count}`);
        console.log(`- Published: ${migratedPublished.rows[0].count}`);
        console.log(`- Unpublished: ${migratedTotal.rows[0].count - migratedPublished.rows[0].count}`);

        // Sample unpublished migrated courses
        const samples = await client.query(`
      SELECT id, title, slug, "isPublished", "isFeatured", category, thumbnail 
      FROM "Course" 
      WHERE "ytPlaylistId" IS NOT NULL AND "isPublished" = false
      LIMIT 5
    `);

        if (samples.rows.length > 0) {
            console.log(`\n=== Sample Unpublished Migrated Courses ===`);
            samples.rows.forEach(c => {
                console.log(`\n[${c.id}]`);
                console.log(`  Title: ${c.title}`);
                console.log(`  Slug: ${c.slug}`);
                console.log(`  isPublished: ${c.isPublished}`);
                console.log(`  isFeatured: ${c.isFeatured}`);
                console.log(`  Category: ${c.category || 'NULL'}`);
                console.log(`  Thumbnail: ${c.thumbnail ? 'YES' : 'NULL'}`);
            });
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkCourseStatus();
