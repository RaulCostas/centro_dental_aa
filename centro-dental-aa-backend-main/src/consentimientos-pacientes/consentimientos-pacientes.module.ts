import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsentimientosPacientesService } from './consentimientos-pacientes.service';
import { ConsentimientosPacientesController } from './consentimientos-pacientes.controller';
import { ConsentimientoPaciente } from './entities/consentimientos-paciente.entity';
import { PacientesModule } from '../pacientes/pacientes.module';

@Module({
  imports: [TypeOrmModule.forFeature([ConsentimientoPaciente]), PacientesModule],
  controllers: [ConsentimientosPacientesController],
  providers: [ConsentimientosPacientesService],
})
export class ConsentimientosPacientesModule {}
