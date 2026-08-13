const fs = require('fs');
const https = require('https');

// Helper to make API requests
function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data: body }));
        });
        req.on('error', reject);
        if (data) {
            req.write(data);
        }
        req.end();
    });
}

async function run() {
    console.log('Logging in to production API...');
    
    // Login to get token
    const loginData = JSON.stringify({ email: 'raul@gmail.com', password: '123456' });
    const loginOpts = {
        hostname: 'api.centrodentalaa.cloud',
        port: 443,
        path: '/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': loginData.length
        }
    };
    
    const loginRes = await request(loginOpts, loginData);
    if (loginRes.status !== 200 && loginRes.status !== 201) {
        console.error('Failed to login:', loginRes.status, loginRes.data);
        return;
    }
    
    const token = JSON.parse(loginRes.data).access_token;
    console.log('Token acquired. Reading SQL dump...');
    
    const sql = fs.readFileSync('../backup_dental (2).sql', 'utf8');
    const regex = /INSERT INTO `pacientes` VALUES ([\s\S]*?);/g;
    
    let match;
    const allTuples = [];
    
    while ((match = regex.exec(sql)) !== null) {
        const valuesStr = match[1];
        let inString = false;
        let isEscaped = false;
        let currentTuple = [];
        let currentValue = '';
        
        for (let i = 0; i < valuesStr.length; i++) {
            const char = valuesStr[i];
            if (isEscaped) { currentValue += char; isEscaped = false; continue; }
            if (char === '\\') { isEscaped = true; continue; }
            if (char === "'") { inString = !inString; continue; }
            if (!inString) {
                if (char === '(' && currentValue.trim() === '') {
                    currentTuple = []; currentValue = '';
                } else if (char === ',') {
                    currentTuple.push(currentValue); currentValue = '';
                } else if (char === ')') {
                    currentTuple.push(currentValue); allTuples.push(currentTuple); currentValue = '';
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
        const nombreCompleto = (tuple[1] || '').trim();
        if (!nombreCompleto || nombreCompleto.toLowerCase() === 'null') {
            skippedEmpty++; continue;
        }
        
        const lowerName = nombreCompleto.toLowerCase();
        if (seen.has(lowerName)) {
            skippedDup++; continue;
        }
        seen.add(lowerName);
        
        let ci = (tuple[2] || '').trim(); if (ci === 'NULL') ci = '';
        let genero = (tuple[3] || '').trim(); if (genero === 'NULL') genero = '';
        let fecha_nacimiento = (tuple[5] || '').trim();
        if (fecha_nacimiento === 'NULL' || fecha_nacimiento === '0000-00-00') fecha_nacimiento = null;
        
        let ocupacion = (tuple[6] || '').trim(); if (ocupacion === 'NULL') ocupacion = '';
        let celular = (tuple[8] || '').trim(); if (celular === 'NULL') celular = '';
        if (celular && !celular.startsWith('+591')) {
            celular = '+591 ' + celular;
        } else if (celular) {
            celular = celular.replace(/^\+591\s*/, '+591 ');
        }
        
        let direccion = (tuple[9] || '').trim(); if (direccion === 'NULL') direccion = '';
        let email = (tuple[12] || '').trim(); if (email === 'NULL') email = '';
        
        const words = nombreCompleto.split(/\s+/).filter(w => w.length > 0);
        let nombre = ''; let paterno = ''; let materno = '';
        if (words.length >= 4) {
            materno = words.pop(); paterno = words.pop(); nombre = words.join(' ');
        } else if (words.length === 3) {
            nombre = words[0]; paterno = words[1]; materno = words[2];
        } else if (words.length === 2) {
            nombre = words[0]; paterno = words[1];
        } else {
            nombre = words[0] || '';
        }
        
        // POST to production API
        const payloadObj = {
            nombre, paterno, materno, ci, genero, ocupacion,
            telefono_celular: celular, direccion, email,
            estado: 'activo'
        };
        // API requires strict date format (ISO-8601 or YYYY-MM-DD), only pass if valid
        if (fecha_nacimiento) payloadObj.fecha_nacimiento = fecha_nacimiento;

        const payload = JSON.stringify(payloadObj);
        
        const opts = {
            hostname: 'api.centrodentalaa.cloud',
            port: 443,
            path: '/pacientes',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                'Authorization': `Bearer ${token}`
            }
        };
        
        try {
            const res = await request(opts, payload);
            if (res.status === 200 || res.status === 201) {
                inserted++;
            } else {
                console.error(`Error API ${nombreCompleto}:`, res.status, res.data);
            }
        } catch (err) {
            console.error(`Error network ${nombreCompleto}:`, err.message);
        }
    }
    
    console.log(`\nMigration to PRODUCTION summary:`);
    console.log(`- Inserted: ${inserted}`);
    console.log(`- Skipped Empty Names: ${skippedEmpty}`);
    console.log(`- Skipped Duplicates: ${skippedDup}`);
}

run().catch(console.error);
