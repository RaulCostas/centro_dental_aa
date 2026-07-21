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

    const tables = [
        'historia_clinica_seguro',
        'proforma_seguro',
        'pacientes_seguro',
        'arancel_seguro',
        'particular_seguro',
        'seguro'
    ];

    for (const table of tables) {
        try {
            console.log(`Truncating ${table}...`);
            await client.query(`TRUNCATE TABLE "${table}" CASCADE;`);
        } catch (e) {
            console.log(`Table ${table} not found or error: ${e.message}`);
        }
    }

    console.log('Final check:');
    const res = await client.query('SELECT count(*) FROM pacientes_seguro');
    console.log(`Pacientes seguro count: ${res.rows[0].count}`);

    console.log('Insurance data cleared successfully');
  } catch (err) {
    console.error('Error clearing data:', err);
  } finally {
    await client.end();
  }
}

clearData();
