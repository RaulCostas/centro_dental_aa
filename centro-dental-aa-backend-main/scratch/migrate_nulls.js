const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5433,
  user: 'postgres',
  password: 'postgrespg',
  database: 'codel',
});

async function migrate() {
  try {
    await client.connect();
    console.log('Migrando registros IS NULL a ID 1...');
    const res = await client.query('UPDATE arancel SET "idParticularSeguro" = 1 WHERE "idParticularSeguro" IS NULL');
    console.log(`Registros actualizados: ${res.rowCount}`);
  } catch (err) {
    console.error('Error en migración:', err);
  } finally {
    await client.end();
  }
}

migrate();
