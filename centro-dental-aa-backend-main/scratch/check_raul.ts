
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PacientesService } from './src/pacientes/pacientes.service';
import { DataSource } from 'typeorm';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);
    
    const results = await dataSource.query(`
        SELECT p.id, p.nombre, p.paterno, hc.id as hc_id, hc."proformaId", hc."estadoPresupuesto", hc.fecha
        FROM pacientes p
        LEFT JOIN historia_clinica hc ON hc."pacienteId" = p.id
        WHERE p.nombre ILIKE '%Raul%' AND p.paterno ILIKE '%Costas%'
    `);
    
    console.log('--- Raul Costas HC Records ---');
    console.log(JSON.stringify(results, null, 2));

    const agenda = await dataSource.query(`
        SELECT a.id, a.fecha, a.estado
        FROM agenda a
        JOIN pacientes p ON p.id = a."pacienteId"
        WHERE p.nombre ILIKE '%Raul%' AND p.paterno ILIKE '%Costas%'
    `);
    console.log('--- Raul Costas Agenda Records ---');
    console.log(JSON.stringify(agenda, null, 2));

    await app.close();
}

bootstrap();
