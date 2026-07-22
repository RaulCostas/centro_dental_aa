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
    await client.query(`
      CREATE TABLE IF NOT EXISTS recetas_predisenadas (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        "especialidadId" INT NOT NULL,
        diagnostico TEXT,
        indicaciones TEXT,
        estado VARCHAR(20) DEFAULT 'activo',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Table "recetas_predisenadas" created successfully.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS receta_predisenada_detalles (
        id SERIAL PRIMARY KEY,
        "recetaPredisenadaId" INT NOT NULL REFERENCES recetas_predisenadas(id) ON DELETE CASCADE,
        medicamento VARCHAR(255) NOT NULL,
        cantidad VARCHAR(100),
        indicacion TEXT
      );
    `);
    console.log('Table "receta_predisenada_detalles" created successfully.');

    // Insert sample data if table is empty
    const checkRes = await client.query('SELECT COUNT(*) FROM recetas_predisenadas');
    if (parseInt(checkRes.rows[0].count, 10) === 0) {
      const insResult = await client.query(`
        INSERT INTO recetas_predisenadas (nombre, "especialidadId", diagnostico, indicaciones, estado)
        VALUES 
          ('Tratamiento Post-Extracción Dental', 1, 'Extracción dental simple / quirúrgica', 'Mantener la gasa presionada por 45 minutos. No escupir ni usar sorbetes. Aplicar hielo local por 15 min.', 'activo'),
          ('Infección Aguda / Endodoncia', 2, 'Pulpitis irreversible / Absceso periapical', 'Completar el ciclo de antibióticos sin suspender. Evitar masticar alimentos duros por el lado afectado.', 'activo'),
          ('Profilaxis Antibiótica Pre-Procedimiento', 1, 'Prevención de endocarditis infecciosa / Paciente de alto riesgo', 'Tomar la dosis única 1 hora antes de la cita odontológica.', 'activo')
        RETURNING id;
      `);

      const id1 = insResult.rows[0].id;
      const id2 = insResult.rows[1].id;
      const id3 = insResult.rows[2].id;

      await client.query(`
        INSERT INTO receta_predisenada_detalles ("recetaPredisenadaId", medicamento, cantidad, indicacion)
        VALUES 
          (${id1}, 'Amoxicilina 500mg', '1 caja (21 tabletas)', 'Tomar 1 tableta cada 8 horas por 7 días.'),
          (${id1}, 'Ibuprofeno 600mg', '1 caja (10 tabletas)', 'Tomar 1 tableta cada 8 horas en caso de dolor o inflamación.'),
          (${id1}, 'Paracetamol 500mg', '1 caja (10 tabletas)', 'Tomar 1 tableta cada 8 horas como refuerzo analgésico si hay dolor persistente.'),
          (${id2}, 'Amoxicilina + Ácido Clavulánico 875/125mg', '1 caja (14 tabletas)', 'Tomar 1 tableta cada 12 horas por 7 días con los alimentos.'),
          (${id2}, 'Ketorolaco 10mg', '1 caja (10 tabletas)', 'Tomar 1 tableta sublingual cada 8 horas por máximo 5 días.'),
          (${id3}, 'Amoxicilina 500mg', '4 cápsulas', 'Tomar 2g (4 cápsulas de 500mg) en dosis única 1 hora antes del tratamiento.');
      `);
      console.log('Sample pre-designed recipes inserted successfully into PostgreSQL!');
    }

  } catch (err) {
    console.error('Error executing query:', err);
  } finally {
    await client.end();
  }
}

run();
