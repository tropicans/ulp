const { Client } = require('pg');
const connectionString = "postgresql://postgres:4ed0abc7506f3cca83e65a26b4d01e3f0413e362ec148de91b8ad3d847ad1f7f@localhost:5432/n8n_new";

async function listDbs() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        const res = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false');
        console.log("Databases on server:");
        res.rows.forEach(row => console.log(`- ${row.datname}`));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

listDbs();
