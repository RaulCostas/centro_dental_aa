const { Client } = require('pg');
const client = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'postgrespg', database: 'codel' });
client.connect().then(async () => {
    try {
        await client.query('ALTER TABLE historia_clinica DROP COLUMN IF EXISTS "personalId" CASCADE;');
        console.log('SQL success');
    } catch (e) {
        console.error('SQL error:', e.message);
    } finally {
        client.end();
    }
}).catch(e => {
    console.error('Connection error:', e.message);
    process.exit(1);
});
