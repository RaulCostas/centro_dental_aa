const { Client } = require('pg');

// SQL script to update the arancel table
// 1. Add 'codigo' column
// 2. Remove 'comision' column
// 3. Remove 'precio_sin_seguro' column

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgrespg',
  database: process.env.DB_DATABASE || 'codel',
});

async function updateDb() {
  try {
    await client.connect();
    console.log('Conectado a la base de datos PostgreSQL');

    const queries = [
      'ALTER TABLE arancel ADD COLUMN IF NOT EXISTS codigo VARCHAR(50);',
      'ALTER TABLE arancel DROP COLUMN IF EXISTS comision;',
      'ALTER TABLE arancel DROP COLUMN IF EXISTS precio_sin_seguro;'
    ];

    for (const query of queries) {
      console.log(`Ejecutando: ${query}`);
      await client.query(query);
    }

    console.log('Base de datos actualizada exitosamente');
  } catch (err) {
    console.error('Error al actualizar la base de datos:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

updateDb();
