const { Client } = require('pg');

async function run() {
  const ports = [5433, 5432];
  let connected = false;
  let client = null;

  for (const port of ports) {
    try {
      client = new Client({
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgrespg',
        host: process.env.DB_HOST || 'localhost',
        port: port,
        database: process.env.DB_NAME || 'centro_dental_a_a',
      });
      await client.connect();
      console.log(`Successfully connected to PostgreSQL database on port ${port}!`);
      connected = true;
      break;
    } catch (e) {
      console.log(`Could not connect on port ${port}: ${e.message}`);
    }
  }

  if (!connected || !client) {
    console.error('Failed to connect to PostgreSQL.');
    process.exit(1);
  }

  try {
    // Drop medicamentos column if exists
    await client.query('ALTER TABLE receta DROP COLUMN IF EXISTS medicamentos;');
    console.log('Column "medicamentos" dropped from table "receta".');

    // Drop esta_firmado column if exists
    await client.query('ALTER TABLE receta DROP COLUMN IF EXISTS esta_firmado;');
    console.log('Column "esta_firmado" dropped from table "receta".');

    // Make indicaciones column nullable if it exists
    await client.query('ALTER TABLE receta ALTER COLUMN indicaciones DROP NOT NULL;');
    console.log('Column "indicaciones" altered to DROP NOT NULL in table "receta".');

  } catch (err) {
    console.error('Error altering table "receta":', err);
  } finally {
    await client.end();
  }
}

run();
