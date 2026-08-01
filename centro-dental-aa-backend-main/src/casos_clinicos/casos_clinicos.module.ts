import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CasoClinico } from './entities/caso_clinico.entity';
import { CasoClinicoFoto } from './entities/caso_clinico_foto.entity';
import { CasosClinicosService } from './casos_clinicos.service';
import { CasosClinicosController } from './casos_clinicos.controller';
import { StorageModule } from '../common/storage/storage.module';

@Module({
    imports: [TypeOrmModule.forFeature([CasoClinico, CasoClinicoFoto]), StorageModule],
    controllers: [CasosClinicosController],
    providers: [CasosClinicosService],
    exports: [CasosClinicosService],
})
export class CasosClinicosModule {}
