import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PacientesService } from './pacientes.service';
import { PacientesController } from './pacientes.controller';
import { Paciente } from './entities/paciente.entity';
import { Odontograma } from './entities/odontograma.entity';
import { FichaClinica } from './entities/ficha_clinica.entity';
import { StorageModule } from '../common/storage/storage.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Paciente, Odontograma, FichaClinica]),
        StorageModule
    ],
    controllers: [PacientesController],
    providers: [PacientesService],
    exports: [PacientesService],
})
export class PacientesModule { }
