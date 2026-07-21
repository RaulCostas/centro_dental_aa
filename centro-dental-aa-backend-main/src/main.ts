import 'dotenv/config'; // Cargar variables de entorno
process.env.TZ = 'America/La_Paz'; // Configurar zona horaria local
import { NestFactory } from '@nestjs/core'; // Force Rebuild 5
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import * as express from 'express';
import { join } from 'path';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [
      'https://clinica-dental-frontend.onrender.com',
      'https://clinicadental.com',
      'https://www.clinicadental.com',
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
 
