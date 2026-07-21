const { Client } = require('pg');
async function check() {
  const c = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'postgrespg', database: 'codel' });
  await c.connect();
  const res = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  console.log('Tables in DB:', res.rows.map(r => r.table_name).filter(t => t.includes('seguro') || t.includes('arancel')));
  await c.end();
}
check();
