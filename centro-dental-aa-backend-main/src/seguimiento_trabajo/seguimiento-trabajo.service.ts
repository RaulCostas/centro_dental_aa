import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeguimientoTrabajo } from './entities/seguimiento-trabajo.entity';
import { CreateSeguimientoTrabajoDto } from './dto/create-seguimiento-trabajo.dto';
import { UpdateSeguimientoTrabajoDto } from './dto/update-seguimiento-trabajo.dto';

@Injectable()
export class SeguimientoTrabajoService {
    constructor(
        @InjectRepository(SeguimientoTrabajo)
        private readonly seguimientoRepository: Repository<SeguimientoTrabajo>,
    ) { }

    async create(createDto: CreateSeguimientoTrabajoDto) {
        try {
            const { trabajoLaboratorioId, ...rest } = createDto;
            const newSeguimiento = this.seguimientoRepository.create({
                ...rest,
                trabajoLaboratorioId,
                trabajoLaboratorio: { id: trabajoLaboratorioId } as any
            });
            return await this.seguimientoRepository.save(newSeguimiento);
        } catch (error) {
            console.error('DATABASE_ERROR_SEGUIMIENTO:', error);
            throw new InternalServerErrorException(`Error DB: ${error.message || 'Error desconocido'}`);
        }
    }

    findAll(trabajoId?: number) {
        if (trabajoId) {
            return this.seguimientoRepository.find({
                where: { trabajoLaboratorioId: trabajoId },
                order: { fecha: 'DESC', id: 'DESC' }
            });
        }
        return this.seguimientoRepository.find({
            order: { fecha: 'DESC', id: 'DESC' }
        });
    }

    findOne(id: number) {
        return this.seguimientoRepository.findOneBy({ id });
    }

    update(id: number, updateDto: UpdateSeguimientoTrabajoDto) {
        return this.seguimientoRepository.update(id, updateDto);
    }

    remove(id: number) {
        return this.seguimientoRepository.delete(id);
    }
}
