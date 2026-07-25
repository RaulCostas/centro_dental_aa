import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Odontograma } from '../pacientes/entities/odontograma.entity';
import { CreateOdontogramaDto } from './dto/create-odontograma.dto';

@Injectable()
export class OdontogramasService {
    constructor(
        @InjectRepository(Odontograma)
        private readonly repository: Repository<Odontograma>,
    ) {}

    async create(createDto: CreateOdontogramaDto): Promise<Odontograma> {
        if (createDto.tipo === 'inicial' && createDto.pacienteId) {
            const existing = await this.repository.findOne({
                where: { pacienteId: createDto.pacienteId, tipo: 'inicial' },
                order: { id: 'DESC' },
            });
            if (existing) {
                existing.mapa_dientes = createDto.mapa_dientes;
                if (createDto.notas !== undefined) existing.notas = createDto.notas;
                if (createDto.usuarioId) existing.usuarioId = createDto.usuarioId;
                return await this.repository.save(existing);
            }
        }
        const odontograma = this.repository.create(createDto);
        return await this.repository.save(odontograma);
    }

    async findAllByPaciente(pacienteId: number): Promise<Odontograma[]> {
        return await this.repository.find({
            where: { pacienteId },
            order: { fecha: 'DESC', id: 'DESC' },
        });
    }

    async findLatestByPaciente(pacienteId?: number): Promise<Odontograma | null> {
        if (!pacienteId) return null;
        return await this.repository.findOne({
            where: { pacienteId },
            order: { fecha: 'DESC', id: 'DESC' },
        });
    }

    async findInicialByPaciente(pacienteId: number): Promise<Odontograma | null> {
        if (!pacienteId) return null;
        return await this.repository.findOne({
            where: { pacienteId, tipo: 'inicial' },
            order: { id: 'DESC' },
        });
    }

    async findOne(id: number): Promise<Odontograma> {
        const odontograma = await this.repository.findOneBy({ id });
        if (!odontograma) {
            throw new NotFoundException(`Odontograma #${id} no encontrado`);
        }
        return odontograma;
    }

    async remove(id: number): Promise<void> {
        const result = await this.repository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Odontograma #${id} no encontrado`);
        }
    }
}
