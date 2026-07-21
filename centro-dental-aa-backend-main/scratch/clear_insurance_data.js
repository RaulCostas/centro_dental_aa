const { Client } = require('pg');

async function clearData() {
  const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: 'postgrespg',
    database: 'codel',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Truncate tables with CASCADE to handle foreign keys
    // We truncate the ones related to insurance
    await client.query('TRUNCATE TABLE historia_clinica_seguro CASCADE;');
    await client.query('TRUNCATE TABLE proforma_seguro CASCADE;');
    await client.query('TRUNCATE TABLE pacientes_seguro CASCADE;');
    
    // Also truncate the insurance tables if they exist
    try {
        await client.query('TRUNCATE TABLE particular_seguro CASCADE;');
    } catch (e) {}
    
    try {
        await client.query('TRUNCATE TABLE seguro CASCADE;');
    } catch (e) {}

    console.log('Insurance data cleared successfully');
  } catch (err) {
    console.error('Error clearing data:', err);
  } finally {
    await client.end();
  }
}

clearData();
