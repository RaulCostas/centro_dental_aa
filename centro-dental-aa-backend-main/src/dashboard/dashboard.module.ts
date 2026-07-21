import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { PersonalModule } from '../personal/personal.module';
import { PacientesModule } from '../pacientes/pacientes.module';
import { AgendaModule } from '../agenda/agenda.module';
import { GastosFijosModule } from '../gastos_fijos/gastos_fijos.module';
import { TrabajosLaboratoriosModule } from '../trabajos_laboratorios/trabajos_laboratorios.module';
import { InventarioModule } from '../inventario/inventario.module';
import { RecordatorioModule } from '../recordatorio/recordatorio.module';
import { RecordatorioTratamientoModule } from '../recordatorio-tratamiento/recordatorio-tratamiento.module';
import { RecordatorioPlanModule } from '../recordatorio_plan/recordatorio-plan.module';
import { ProformasModule } from '../proformas/proformas.module';

@Module({
  imports: [
    PersonalModule,
    PacientesModule,
    AgendaModule,
    GastosFijosModule,
    TrabajosLaboratoriosModule,
    InventarioModule,
    RecordatorioModule,
    RecordatorioTratamientoModule,
    RecordatorioPlanModule,
    ProformasModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
