const { Client } = require('pg');

async function fix() {
  const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: 'postgrespg',
    database: 'centro_dental_a_a',
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    // Check if a sequence exists or if we should just create it
    console.log('Creating sequence if not exists...');
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS ficha_clinica_id_seq;
    `);

    // Assign the sequence to the column default
    console.log('Setting column default to sequence nextval...');
    await client.query(`
      ALTER TABLE ficha_clinica ALTER COLUMN id SET DEFAULT nextval('ficha_clinica_id_seq');
    `);

    // Set ownership
    console.log('Setting sequence ownership to the table column...');
    await client.query(`
      ALTER SEQUENCE ficha_clinica_id_seq OWNED BY ficha_clinica.id;
    `);

    // Sync sequence value with current max id to avoid duplicate key errors
    console.log('Syncing sequence value with current max ID...');
    const res = await client.query(`
      SELECT setval('ficha_clinica_id_seq', COALESCE((SELECT MAX(id) FROM ficha_clinica), 0) + 1, false);
    `);
    console.log('Sequence synced. Next value will be:', res.rows[0].setval);

    console.log('Ficha Clinica ID sequence fix applied successfully!');
  } catch (err) {
    console.error('Error applying fix:', err);
  } finally {
    await client.end();
  }
}

fix();
