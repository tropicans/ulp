const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function addColumns() {
    const columns = [
        'course_short_desc VARCHAR',
        'course_desc TEXT',
        "course_level VARCHAR DEFAULT 'Beginner'",
        "language VARCHAR DEFAULT 'Bahasa Indonesia'",
        'requirements TEXT',
        'outcomes TEXT',
        'recommended_next TEXT',
        'jp DECIMAL(8,2)'
    ];

    for (const col of columns) {
        const cmd = `docker exec lxp-postgres psql -U postgres -d lxp_asn -c "ALTER TABLE \\\"Course\\\"  ADD COLUMN IF NOT EXISTS ${col};"`;
        console.log(`Adding column: ${col.split(' ')[0]}`);
        try {
            const { stdout, stderr } = await execPromise(cmd);
            console.log(stdout || 'OK');
        } catch (error) {
            console.log(`  Skip: ${col.split(' ')[0]} (already exists)`);
        }
    }
    console.log('\n✅ All columns added!');
}

addColumns();
