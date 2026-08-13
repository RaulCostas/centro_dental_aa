const { Client } = require('pg');

async function fixProformas() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'centro_dental_a_a',
        password: 'postgrespg',
        port: 5433,
    });

    try {
        await client.connect();
        console.log('Connected to database centro_dental_a_a');

        const res = await client.query(`
            UPDATE proformas 
            SET total = sub_total * (1 - descuento / 100) 
            WHERE descuento > 0 AND sub_total > 0;
        `);

        console.log(`Updated ${res.rowCount} proformas with corrected totals.`);
    } catch (err) {
        console.error('Error updating proformas DB:', err);
    } finally {
        await client.end();
    }
}

fixProformas();
