const { Client } = require('pg');
const connectionString = "postgresql://postgres:lxp_password_change_me@localhost:5433/lxp_asn";

async function listAllTables() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        const res = await client.query(`
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
        ORDER BY table_schema, table_name
    `);
        console.log("All tables in lxp_asn:");
        res.rows.forEach(row => console.log(`- ${row.table_schema}.${row.table_name}`));

        // Also check if any table has data
        console.log("\nChecking for data in yt_ tables...");
        const ytTables = res.rows.filter(r => r.table_name.startsWith('yt_'));
        for (const t of ytTables) {
            const countRes = await client.query(`SELECT COUNT(*) FROM "${t.table_schema}"."${t.table_name}"`);
            console.log(`- ${t.table_schema}.${t.table_name}: ${countRes.rows[0].count}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

listAllTables();
