const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5433,
  user: 'postgres',
  password: 'postgrespg',
  database: 'centro_dental_a_a',
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to DB');

    // 1. Drop column 'idioma_dialecto' from 'pacientes' if it exists
    await client.query(`
      ALTER TABLE pacientes DROP COLUMN IF EXISTS idioma_dialecto CASCADE;
    `);
    console.log("Column 'idioma_dialecto' dropped from table 'pacientes'");

    // 2. Add columns to 'ficha_clinica'
    await client.query(`
      ALTER TABLE ficha_clinica 
      ADD COLUMN IF NOT EXISTS motivo_consulta text,
      ADD COLUMN IF NOT EXISTS ant_pat_cirugia boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS ant_pat_cirugia_detalle text,
      ADD COLUMN IF NOT EXISTS hig_waterpik boolean DEFAULT false;
    `);
    console.log("Columns added to table 'ficha_clinica'");

  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    await client.end();
  }
}

run();
