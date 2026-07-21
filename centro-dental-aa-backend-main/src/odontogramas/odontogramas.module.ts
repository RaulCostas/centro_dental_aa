import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OdontogramasService } from './odontogramas.service';
import { OdontogramasController } from './odontogramas.controller';
import { Odontograma } from '../pacientes/entities/odontograma.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Odontograma])],
    controllers: [OdontogramasController],
    providers: [OdontogramasService],
    exports: [OdontogramasService],
})
export class OdontogramasModule {}
