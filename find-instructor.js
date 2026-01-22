const { Client } = require('pg');
const connectionString = "postgresql://postgres:lxp_password_change_me@localhost:5433/lxp_asn";

async function findInstructor() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        const res = await client.query("SELECT id, name, role FROM \"User\" WHERE role = 'INSTRUCTOR' LIMIT 5");
        console.log("Instructors found:");
        res.rows.forEach(r => console.log(`- [${r.id}] ${r.name} (${r.role})`));

        if (res.rows.length === 0) {
            const any = await client.query("SELECT id, name, role FROM \"User\" LIMIT 1");
            console.log("No instructors found, here is a default user:");
            any.rows.forEach(r => console.log(`- [${r.id}] ${r.name} (${r.role})`));
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

findInstructor();
