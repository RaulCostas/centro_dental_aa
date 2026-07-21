import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

async function runCleanup() {
    const config = {
        user: 'postgres',
        host: 'localhost',
        database: 'codel',
        password: 'postgrespg',
        port: 5433,
    };

    const sqlPath = 'C:\\Users\\raulc\\.gemini\\antigravity\\brain\\ba20b70b-8c63-4d70-b5ce-7dd9d4c160a8\\db_cleanup.sql';
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Starting DB cleanup on:', config.database);
    const client = new Client(config);
    
    try {
        await client.connect();
        console.log('Connected to DB.');
        
        // Split queries by semicolon and run one by one
        const queries = sql.split(';').map(q => q.trim()).filter(q => q.length > 0);
        
        for (const query of queries) {
            try {
                console.log(`Executing: ${query.substring(0, 50)}...`);
                await client.query(query);
            } catch (err) {
                console.warn(`Warning: Failed to execute query: ${query.substring(0, 50)}...`);
                console.warn(`Reason: ${err.message}`);
            }
        }
        console.log('DB cleanup process finished!');
        
    } catch (err) {
        console.error('Error during cleanup:', err.message);
    } finally {
        await client.end();
        console.log('Disconnected from DB.');
    }
}

runCleanup();
