import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrabajosLaboratoriosService } from './trabajos_laboratorios.service';
import { TrabajosLaboratoriosController } from './trabajos_laboratorios.controller';
import { TrabajosLaboratoriosPdfService } from './trabajos_laboratorios-pdf.service';
import { TrabajoLaboratorio } from './entities/trabajo_laboratorio.entity';
import { CubetasModule } from '../cubetas/cubetas.module';
import { Agenda } from '../agenda/entities/agenda.entity';
import { HistoriaClinica } from '../historia_clinica/entities/historia_clinica.entity';
import { ChatbotModule } from '../chatbot/chatbot.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([TrabajoLaboratorio, Agenda, HistoriaClinica]),
        CubetasModule,
        forwardRef(() => ChatbotModule),
    ],
    controllers: [TrabajosLaboratoriosController],
    providers: [TrabajosLaboratoriosService, TrabajosLaboratoriosPdfService],
    exports: [TrabajosLaboratoriosService, TrabajosLaboratoriosPdfService],
})
export class TrabajosLaboratoriosModule { }
