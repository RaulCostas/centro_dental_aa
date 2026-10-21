import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrabajoLaboratorio } from './entities/trabajo_laboratorio.entity';

import { CubetasService } from '../cubetas/cubetas.service';

import { Agenda } from '../agenda/entities/agenda.entity';
import { MoreThanOrEqual, Not, In } from 'typeorm';

@Injectable()
export class TrabajosLaboratoriosService {
    constructor(
        @InjectRepository(TrabajoLaboratorio)
        private trabajosRepository: Repository<TrabajoLaboratorio>,
        @InjectRepository(Agenda)
        private agendaRepository: Repository<Agenda>,
        private cubetasService: CubetasService,
    ) { }

    private sanitizePayload(data: any): any {
        if (!data) return {};
        const allowedColumns = new Set(this.trabajosRepository.metadata.columns.map(c => c.propertyName));

        const sanitized: any = {};
        for (const key of Object.keys(data)) {
            if (allowedColumns.has(key) && key !== 'id') {
                sanitized[key] = data[key];
            }
        }

        if (data.hora_envio && !sanitized.hora) {
            sanitized.hora = data.hora_envio;
        }

        return sanitized;
    }

    async create(createTrabajoLaboratorioDto: any) {
        const cleanDto = this.sanitizePayload(createTrabajoLaboratorioDto);
        if (cleanDto.idCubeta) {
            const cubeta = await this.cubetasService.findOne(cleanDto.idCubeta);
            if (cubeta && cubeta.dentro_fuera === 'DENTRO') {
                await this.cubetasService.update(cubeta.id, { dentro_fuera: 'FUERA' });
            }
        }
        return this.trabajosRepository.save(cleanDto);
    }

    findAll(page: number = 1, limit: number = 10, search: string = '', estado: string = '') {
        const skip = (page - 1) * limit;
        const query = this.trabajosRepository.createQueryBuilder('trabajo')
            .leftJoinAndSelect('trabajo.laboratorio', 'laboratorio')
            .leftJoinAndSelect('trabajo.paciente', 'paciente')
            .leftJoinAndSelect('trabajo.precioLaboratorio', 'precioLaboratorio')
            .leftJoinAndSelect('trabajo.cubeta', 'cubeta')
            .leftJoinAndSelect('trabajo.doctor', 'doctor')
            .take(limit)
            .skip(skip)
            .orderBy('trabajo.id', 'DESC');

        if (search) {
            query.andWhere(
                '(paciente.nombre ILIKE :search OR paciente.paterno ILIKE :search OR laboratorio.laboratorio ILIKE :search)',
                { search: `%${search}%` },
            );
        }

        if (estado) {
            query.andWhere('trabajo.estado = :estado', { estado });
        }

        return query.getManyAndCount();
    }

    findOne(id: number) {
        return this.trabajosRepository.findOne({
            where: { id },
            relations: ['laboratorio', 'paciente', 'precioLaboratorio', 'cubeta', 'doctor'],
        });
    }

    async update(id: number, updateTrabajoLaboratorioDto: any) {
        const trabajoActual = await this.findOne(id);
        const cleanDto = this.sanitizePayload(updateTrabajoLaboratorioDto);

        if (!trabajoActual) {
            return this.trabajosRepository.update(id, cleanDto);
        }

        const newCubetaId = cleanDto.idCubeta ? Number(cleanDto.idCubeta) : null;
        const oldCubetaId = trabajoActual.idCubeta ? Number(trabajoActual.idCubeta) : null;

        // 1. Handle Cubeta Change (Assignment or Swapping)
        // Only if a new valid ID is provided and it differs from the old one
        if (newCubetaId && newCubetaId !== oldCubetaId) {
            // Free up the old cubeta if it existed
            if (oldCubetaId) {
                await this.cubetasService.update(oldCubetaId, { dentro_fuera: 'DENTRO' });
            }
            // Mark the new cubeta as occupied ('FUERA')
            await this.cubetasService.update(newCubetaId, { dentro_fuera: 'FUERA' });
        }

        // 2. Handle Status Completion (Terminado)
        if (cleanDto.estado === 'terminado') {
            // Auto-fill fecha_terminado if not provided
            if (!cleanDto.fecha_terminado) {
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                cleanDto.fecha_terminado = `${year}-${month}-${day}`;
            }

            // If it's being marked as finished, the cubeta (either existing or new) should be returned ('DENTRO')
            const targetCubetaId = newCubetaId || oldCubetaId;
            if (targetCubetaId) {
                await this.cubetasService.update(targetCubetaId, { dentro_fuera: 'DENTRO' });
            }
        }

        return this.trabajosRepository.update(id, cleanDto);
    }

    remove(id: number) {
        return this.trabajosRepository.delete(id);
    }
    /**
     * Finds finished lab works where the patient does NOT have a future appointment
     * (Appointment date >= Work finished date)
     */
    async findTerminadosSinCita() {
        const query = this.trabajosRepository.createQueryBuilder('trabajo')
            .leftJoinAndSelect('trabajo.paciente', 'paciente')
            .leftJoinAndSelect('trabajo.laboratorio', 'laboratorio')
            .leftJoinAndSelect('trabajo.precioLaboratorio', 'precioLaboratorio')
            .leftJoinAndSelect('trabajo.doctor', 'doctor')
            .where("trabajo.estado = 'terminado'")
            .orderBy('trabajo.fecha_terminado', 'DESC');

        const works = await query.getMany();

        const alertWorks: TrabajoLaboratorio[] = [];

        // Step 2: Filter those without future appointments
        for (const work of works) {
            if (!work.fecha_terminado) continue;

            const apptCount = await this.agendaRepository.count({
                where: {
                    pacienteId: work.idPaciente,
                    fecha: MoreThanOrEqual(work.fecha_terminado),
                    estado: In(['agendado', 'confirmado'])
                }
            });

            if (apptCount === 0) {
                alertWorks.push(work);
            }
        }

        return alertWorks;
    }

    async addFotografiaReferencia(id: number, filename: string) {
        const trabajo = await this.findOne(id);
        if (!trabajo) return null;
        const currentPhotos = Array.isArray(trabajo.fotografias_referencias) ? trabajo.fotografias_referencias : [];
        currentPhotos.push(filename);
        await this.trabajosRepository.update(id, { fotografias_referencias: currentPhotos });
        return this.findOne(id);
    }
}
