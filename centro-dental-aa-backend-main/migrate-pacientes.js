const fs = require('fs');
const { Client } = require('pg');

async function run() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'centro_dental_a_a',
        password: 'postgrespg',
        port: 5433,
    });
    
    await client.connect();
    
    console.log('Connected to PostgreSQL database');
    
    const sql = fs.readFileSync('../backup_dental (2).sql', 'utf8');
    
    // Extract INSERT INTO `pacientes`
    // It might be multiple lines or one single line
    const regex = /INSERT INTO `pacientes` VALUES ([\s\S]*?);/g;
    
    let match;
    const allTuples = [];
    
    while ((match = regex.exec(sql)) !== null) {
        const valuesStr = match[1];
        
        // State machine to parse MySQL values like (1,'A','B'),(2,'C','D')
        let inString = false;
        let isEscaped = false;
        let currentTuple = [];
        let currentValue = '';
        
        for (let i = 0; i < valuesStr.length; i++) {
            const char = valuesStr[i];
            
            if (isEscaped) {
                currentValue += char;
                isEscaped = false;
                continue;
            }
            
            if (char === '\\') {
                isEscaped = true;
                continue;
            }
            
            if (char === "'") {
                inString = !inString;
                continue;
            }
            
            if (!inString) {
                if (char === '(' && currentValue.trim() === '') {
                    currentTuple = [];
                    currentValue = '';
                } else if (char === ',') {
                    currentTuple.push(currentValue);
                    currentValue = '';
                } else if (char === ')') {
                    currentTuple.push(currentValue);
                    allTuples.push(currentTuple);
                    currentValue = '';
                } else if (char.trim() !== '') {
                    currentValue += char;
                }
            } else {
                currentValue += char;
            }
        }
    }
    
    console.log(`Found ${allTuples.length} records in SQL dump.`);
    
    const seen = new Set();
    let inserted = 0;
    let skippedEmpty = 0;
    let skippedDup = 0;

    for (const tuple of allTuples) {
        // Indices:
        // 1: nombrePaciente
        // 2: ciPaciente
        // 3: sexoPaciente
        // 5: fechaPaciente
        // 6: ocupacionPaciente
        // 8: celularPaciente
        // 9: direccionPaciente
        // 12: emailPaciente
        
        const nombreCompleto = (tuple[1] || '').trim();
        if (!nombreCompleto || nombreCompleto.toLowerCase() === 'null') {
            skippedEmpty++;
            continue;
        }
        
        const lowerName = nombreCompleto.toLowerCase();
        if (seen.has(lowerName)) {
            skippedDup++;
            continue;
        }
        seen.add(lowerName);
        
        let ci = (tuple[2] || '').trim();
        if (ci === 'NULL') ci = '';
        
        let genero = (tuple[3] || '').trim();
        if (genero === 'NULL') genero = '';
        
        let fecha_nacimiento = (tuple[5] || '').trim();
        if (fecha_nacimiento === 'NULL' || fecha_nacimiento === '0000-00-00') fecha_nacimiento = null;
        
        let ocupacion = (tuple[6] || '').trim();
        if (ocupacion === 'NULL') ocupacion = '';
        
        let celular = (tuple[8] || '').trim();
        if (celular === 'NULL') celular = '';
        if (celular && !celular.startsWith('+591')) {
            celular = '+591 ' + celular;
        } else if (celular) {
            // Ensure spacing is nice if it starts with +591
            celular = celular.replace(/^\+591\s*/, '+591 ');
        }
        
        let direccion = (tuple[9] || '').trim();
        if (direccion === 'NULL') direccion = '';
        
        let email = (tuple[12] || '').trim();
        if (email === 'NULL') email = '';
        
        // Split name (Rule: Nombres + Apellido Paterno + Apellido Materno)
        // If 4 words: Nombre1 Nombre2 Paterno Materno
        // If 3 words: Nombre Paterno Materno
        // If 2 words: Nombre Paterno
        // If 1 word: Nombre
        const words = nombreCompleto.split(/\s+/).filter(w => w.length > 0);
        let nombre = '';
        let paterno = '';
        let materno = '';
        
        if (words.length >= 4) {
            materno = words.pop();
            paterno = words.pop();
            nombre = words.join(' ');
        } else if (words.length === 3) {
            nombre = words[0];
            paterno = words[1];
            materno = words[2];
        } else if (words.length === 2) {
            nombre = words[0];
            paterno = words[1];
        } else {
            nombre = words[0] || '';
        }
        
        // Insert into postgres using parameterized query
        // The table is "pacientes"
        // We will insert the parsed fields. Other required fields have defaults.
        const query = `
            INSERT INTO pacientes (
                nombre, paterno, materno, ci, genero, fecha_nacimiento, ocupacion,
                telefono_celular, direccion, email, estado, estado_civil, grado_instruccion, esta_firmado, "createdAt", "updatedAt"
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'activo', 'Soltero', 'Ninguna', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            ) RETURNING id;
        `;
        
        try {
            await client.query(query, [
                nombre, paterno, materno, ci, genero, fecha_nacimiento, ocupacion,
                celular, direccion, email
            ]);
            inserted++;
        } catch (err) {
            console.error(`Error inserting ${nombreCompleto}:`, err.message);
        }
    }
    
    console.log(`\nMigration summary:`);
    console.log(`- Inserted: ${inserted}`);
    console.log(`- Skipped Empty Names: ${skippedEmpty}`);
    console.log(`- Skipped Duplicates: ${skippedDup}`);
    
    await client.end();
}

run().catch(console.error);
