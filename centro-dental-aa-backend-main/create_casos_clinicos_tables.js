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
    console.error('Failed to connect to PostgreSQL on standard ports.');
    process.exit(1);
  }

  try {
    // 1. Crear tabla casos_clinicos
    await client.query(`
      CREATE TABLE IF NOT EXISTS casos_clinicos (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        "especialidadId" INT NOT NULL REFERENCES especialidad(id) ON DELETE CASCADE,
        video TEXT,
        estado TEXT DEFAULT 'activo',
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Tabla "casos_clinicos" creada exitosamente.');

    // 2. Crear tabla casos_clinicos_fotos
    await client.query(`
      CREATE TABLE IF NOT EXISTS casos_clinicos_fotos (
        id SERIAL PRIMARY KEY,
        "casoClinicoId" INT NOT NULL REFERENCES casos_clinicos(id) ON DELETE CASCADE,
        foto TEXT NOT NULL,
        descripcion TEXT
      );
    `);
    console.log('Tabla "casos_clinicos_fotos" creada exitosamente.');

    // 3. Índices de rendimiento
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_casos_clinicos_especialidad ON casos_clinicos("especialidadId");
      CREATE INDEX IF NOT EXISTS idx_casos_clinicos_fotos_caso ON casos_clinicos_fotos("casoClinicoId");
    `);
    console.log('Índices creados exitosamente.');

  } catch (err) {
    console.error('Error executing query:', err);
  } finally {
    await client.end();
  }
}

run();
