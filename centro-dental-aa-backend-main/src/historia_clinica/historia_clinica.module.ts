import { HistoriaClinica } from './entities/historia_clinica.entity';
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HistoriaClinicaService } from './historia_clinica.service';
import { HistoriaClinicaController } from './historia_clinica.controller';
import { HistoriaClinicaPdfService } from './historia-clinica-pdf.service';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { Pago } from '../pagos/entities/pago.entity';
import { TrabajoLaboratorio } from '../trabajos_laboratorios/entities/trabajo_laboratorio.entity';
import { StorageModule } from '../common/storage/storage.module';
import { Proforma } from '../proformas/entities/proforma.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([HistoriaClinica, Pago, TrabajoLaboratorio, Proforma]),
        forwardRef(() => ChatbotModule),
        StorageModule,
    ],
    controllers: [HistoriaClinicaController],
    providers: [HistoriaClinicaService, HistoriaClinicaPdfService],
    exports: [HistoriaClinicaService]
})
export class HistoriaClinicaModule { }
