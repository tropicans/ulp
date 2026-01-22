const { Client } = require('pg');
const connectionString = "postgresql://postgres:lxp_password_change_me@localhost:5433/lxp_asn";

async function listSchemas() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        const res = await client.query('SELECT schema_name FROM information_schema.schemata');
        console.log("Schemas in lxp_asn:");
        res.rows.forEach(row => console.log(`- ${row.schema_name}`));

        // Also check for all tables in all schemas that start with yt_
        const tables = await client.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name LIKE 'yt_%'");
        console.log("\nTables starting with yt_:");
        tables.rows.forEach(row => console.log(`- ${row.table_schema}.${row.table_name}`));

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

listSchemas();
