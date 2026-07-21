const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5433,
  user: 'postgres',
  password: 'postgrespg',
  database: 'codel',
});

async function checkData() {
  try {
    await client.connect();
    const res = await client.query('SELECT id, detalle, "idParticularSeguro" FROM arancel');
    console.log('Resultados de la tabla arancel:');
    res.rows.forEach(r => {
      console.log(`- ID: ${r.id}, Detalle: ${r.detalle}, idParticularSeguro: ${r.idParticularSeguro} (${typeof r.idParticularSeguro})`);
    });
    
    const types = await client.query('SELECT * FROM particular_seguro');
    console.log('\nResultados de la tabla particular_seguro:');
    types.rows.forEach(t => {
      console.log(`- ID: ${t.id}, Nombre: ${t.nombre}`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkData();
