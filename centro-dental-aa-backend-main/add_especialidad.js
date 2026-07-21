const { Client } = require('pg');
const client = new Client({
  user: 'postgres',
  password: 'postgrespg',
  host: 'localhost',
  port: 5433,
  database: 'centro_dental_a_a',
});
async function run() {
  await client.connect();
  try {
    await client.query('ALTER TABLE consentimiento_plantillas ADD COLUMN IF NOT EXISTS especialidad VARCHAR;');
    console.log('Column added successfully');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
