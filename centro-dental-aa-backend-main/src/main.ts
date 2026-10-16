import 'dotenv/config'; // Cargar variables de entorno
process.env.TZ = 'America/La_Paz'; // Configurar zona horaria local
import { NestFactory } from '@nestjs/core'; // Force Rebuild 5
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import * as express from 'express';
import { join } from 'path';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Auto-migración segura de columnas requeridas en producción
  try {
    const dataSource = app.get(DataSource);
    await dataSource.query(`
      ALTER TABLE propuesta_detalle ADD COLUMN IF NOT EXISTS descuento DECIMAL(5,2) DEFAULT 0;
      ALTER TABLE propuestas ADD COLUMN IF NOT EXISTS plan_pagos JSONB;
      ALTER TABLE pagos ADD COLUMN IF NOT EXISTS numero_transaccion TEXT;
      ALTER TABLE proformas ADD COLUMN IF NOT EXISTS aprobado BOOLEAN DEFAULT false;
      ALTER TABLE proformas ADD COLUMN IF NOT EXISTS fecha_aprobado DATE;
      ALTER TABLE proformas ADD COLUMN IF NOT EXISTS usuario_aprobado INT;
      ALTER TABLE "user" ADD COLUMN IF NOT EXISTS codigo_proforma INT;
      ALTER TABLE agenda ADD COLUMN IF NOT EXISTS "asistenteId" INT;
      ALTER TABLE personal ADD COLUMN IF NOT EXISTS sueldo DECIMAL(10,2);
    `);
    console.log('[AutoMigration] Columnas de base de datos verificadas y actualizadas correctamente.');
  } catch (error) {
    console.error('[AutoMigration] Error al verificar/actualizar columnas:', error);
  }
  app.enableCors({
    origin: [
      'https://clinica-dental-frontend.onrender.com',
      'https://clinicadental.com',
      'https://www.clinicadental.com',
      'https://centrodentalaa.cloud',
      'https://www.centrodentalaa.cloud',
      'http://localhost:5173',
      'http://localhost:3001'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  
  // Serve static files from uploads folder
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
  console.log(`Backend is running on: ${await app.getUrl()}`);
  console.log('Force Restart Triggered 27: ' + new Date().toISOString());
}
bootstrap();
 
