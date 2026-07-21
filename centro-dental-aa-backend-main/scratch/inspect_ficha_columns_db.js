const { Client } = require('pg');
async function check() {
  const c = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'postgrespg', database: 'centro_dental_a_a' });
  await c.connect();
  const res = await c.query("SELECT column_name, data_type, column_default, is_nullable FROM information_schema.columns WHERE table_name = 'ficha_clinica' ORDER BY ordinal_position LIMIT 10");
  console.log(JSON.stringify(res.rows, null, 2));
  await c.end();
}
check();
