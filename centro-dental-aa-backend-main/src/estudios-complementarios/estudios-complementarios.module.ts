import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstudiosComplementariosService } from './estudios-complementarios.service';
import { EstudiosComplementariosController } from './estudios-complementarios.controller';
import { EstudioComplementario } from './entities/estudio-complementario.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EstudioComplementario])],
  controllers: [EstudiosComplementariosController],
  providers: [EstudiosComplementariosService],
  exports: [EstudiosComplementariosService],
})
export class EstudiosComplementariosModule {}
