const https = require('https');

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data: body }));
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function fixGenero() {
    console.log('Logging in to production API...');
    const loginData = JSON.stringify({ email: 'raul@gmail.com', password: '123456' });
    const loginOpts = {
        hostname: 'api.centrodentalaa.cloud', port: 443, path: '/auth/login', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length }
    };
    
    const loginRes = await request(loginOpts, loginData);
    if (loginRes.status !== 200 && loginRes.status !== 201) return console.error('Login failed');
    const token = JSON.parse(loginRes.data).access_token;
    
    // Fetch all patients
    let allPacientes = [];
    let page = 1;
    let totalPages = 1;
    
    while (page <= totalPages) {
        const getOpts = {
            hostname: 'api.centrodentalaa.cloud', port: 443, path: `/pacientes?limit=100&page=${page}`, method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        };
        const res = await request(getOpts);
        const data = JSON.parse(res.data);
        if (data.data) allPacientes = allPacientes.concat(data.data);
        totalPages = data.totalPages || 1;
        page++;
    }
    
    console.log(`Found ${allPacientes.length} patients. Fixing genero...`);
    
    let fixed = 0;
    for (const p of allPacientes) {
        let newGenero = null;
        if (p.genero === 'Masculino') newGenero = 'M';
        if (p.genero === 'Femenino') newGenero = 'F';
        
        if (newGenero) {
            const patchData = JSON.stringify({ genero: newGenero });
            const patchOpts = {
                hostname: 'api.centrodentalaa.cloud', port: 443, path: `/pacientes/${p.id}`, method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(patchData),
                    'Authorization': `Bearer ${token}`
                }
            };
            const patchRes = await request(patchOpts, patchData);
            if (patchRes.status === 200) fixed++;
            else console.log('Error patching', p.id, patchRes.status);
        }
    }
    console.log(`Fixed ${fixed} patients.`);
}
fixGenero().catch(console.error);
