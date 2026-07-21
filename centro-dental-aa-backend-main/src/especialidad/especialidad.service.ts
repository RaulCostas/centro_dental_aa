import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { CreateEspecialidadDto } from './dto/create-especialidad.dto';
import { UpdateEspecialidadDto } from './dto/update-especialidad.dto';
import { Especialidad } from './entities/especialidad.entity';
import { HistoriaClinica } from '../historia_clinica/entities/historia_clinica.entity';



@Injectable()
export class EspecialidadService {
    constructor(
        @InjectRepository(Especialidad)
        private especialidadRepository: Repository<Especialidad>,
        @InjectRepository(HistoriaClinica)
        private historiaClinicaRepository: Repository<HistoriaClinica>,
    ) { }

    async create(createEspecialidadDto: CreateEspecialidadDto) {
        const existing = await this.especialidadRepository.findOne({
            where: { especialidad: ILike(createEspecialidadDto.especialidad.trim()) }
        });

        if (existing) {
            throw new BadRequestException('La especialidad ya se encuentra registrada.');
        }

        const especialidad = this.especialidadRepository.create(createEspecialidadDto);
        return this.especialidadRepository.save(especialidad);
    }

    async getStatistics(year: number, month: number, status?: string): Promise<any[]> {
        // Date and Clinic Filter
        let dateCondition = 'hc.estadoTratamiento = :estadoTrat';
        const params: any = { estadoTrat: 'terminado' };

        if (year) {
            dateCondition += ' AND EXTRACT(YEAR FROM hc.fecha) = :year';
            params.year = year;
        }
        if (month) {
            dateCondition += ' AND EXTRACT(MONTH FROM hc.fecha) = :month';
            params.month = month;
        }

        const qb = this.especialidadRepository.createQueryBuilder('especialidad')
            .leftJoin(
                'historia_clinica',
                'hc',
                `hc.especialidadId = especialidad.id AND ${dateCondition}`,
                params
            )
            .leftJoin('hc.doctor', 'd')
            .select([
                'especialidad.id AS "id"',
                'especialidad.especialidad AS "nombre"',
                'COALESCE(SUM(hc.cantidad), 0) AS "cantidad"'
            ])
            .groupBy('especialidad.id')
            .addGroupBy('especialidad.especialidad')
            .orderBy('"cantidad"', 'DESC');


        if (status && status !== 'ambos') {
            qb.andWhere('d.estado = :status', { status: status.toLowerCase() });
        }

        const rawResults = await qb.getRawMany();

        return rawResults.map(r => ({
            id: r.id,
            nombre: r.nombre,
            cantidad: parseInt(r.cantidad)
        }));
    }

    async findAll(search?: string, page: number = 1, limit: number = 5) {
        const skip = (page - 1) * limit;
        const where = search
            ? { especialidad: ILike(`%${search}%`) }
            : {};

        const [data, total] = await this.especialidadRepository.findAndCount({
            where,
            skip,
            take: limit,
            order: { especialidad: 'ASC' },
        });

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    findOne(id: number) {
        return this.especialidadRepository.findOneBy({ id });
    }

    async update(id: number, updateEspecialidadDto: UpdateEspecialidadDto) {
        if (updateEspecialidadDto.especialidad) {
            const existing = await this.especialidadRepository.createQueryBuilder('especialidad')
                .where('LOWER(especialidad.especialidad) = LOWER(:nombre)', { nombre: updateEspecialidadDto.especialidad.trim() })
                .andWhere('especialidad.id != :id', { id })
                .getOne();

            if (existing) {
                throw new BadRequestException('Ya existe otra especialidad con este nombre.');
            }
        }
        return this.especialidadRepository.update(id, updateEspecialidadDto);
    }

    remove(id: number) {
        return this.especialidadRepository.delete(id);
    }
}
