import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeguroService } from './seguro.service';
import { SeguroController } from './seguro.controller';
import { Seguro } from './entities/seguro.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Seguro])],
    controllers: [SeguroController],
    providers: [SeguroService],
    exports: [SeguroService],
})
export class SeguroModule { }
