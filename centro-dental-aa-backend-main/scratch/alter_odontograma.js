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
      connected = true;
      break;
    } catch (e) {}
  }

  if (!connected || !client) process.exit(1);

  try {
    await client.query(`ALTER TABLE odontogramas ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'seguimiento';`);
    console.log('Column "tipo" added to "odontogramas" table successfully.');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
