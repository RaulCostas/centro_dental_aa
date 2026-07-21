import { Client } from 'pg';

async function checkCols() {
    const config = {
        user: 'postgres',
        host: 'localhost',
        database: 'codel',
        password: 'postgrespg',
        port: 5433,
    };

    const client = new Client(config);
    try {
        await client.connect();
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'doctors'
        `);
        console.log('Columns in doctors:', res.rows.map(r => r.column_name));
        
        const res2 = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'proformas'
        `);
        console.log('Columns in proformas:', res2.rows.map(r => r.column_name));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

checkCols();
