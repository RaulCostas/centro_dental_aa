import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Not } from 'typeorm';
import { PrecioLaboratorio } from './entities/precio-laboratorio.entity';
import { CreatePrecioLaboratorioDto } from './dto/create-precio-laboratorio.dto';
import { UpdatePrecioLaboratorioDto } from './dto/update-precio-laboratorio.dto';

@Injectable()
export class PreciosLaboratoriosService {
    constructor(
        @InjectRepository(PrecioLaboratorio)
        private preciosLaboratoriosRepository: Repository<PrecioLaboratorio>,
    ) { }

    async create(createPrecioLaboratorioDto: CreatePrecioLaboratorioDto) {
        const { detalle, idLaboratorio } = createPrecioLaboratorioDto;

        const existing = await this.preciosLaboratoriosRepository.findOne({
            where: {
                detalle: ILike(detalle.trim()),
                idLaboratorio: idLaboratorio
            }
        });

        if (existing) {
            throw new BadRequestException(`Ya existe un precio con el detalle "${detalle}" para este laboratorio.`);
        }

        const precioLaboratorio = this.preciosLaboratoriosRepository.create(createPrecioLaboratorioDto);
        return this.preciosLaboratoriosRepository.save(precioLaboratorio);
    }

    async findAll(page: number = 1, limit: number = 10, search?: string, laboratorioId?: number) {
        const skip = (page - 1) * limit;
        const where: any = {};

        if (search) {
            where.detalle = ILike(`%${search}%`);
        }

        if (laboratorioId) {
            where.idLaboratorio = laboratorioId;
        }

        const [data, total] = await this.preciosLaboratoriosRepository.findAndCount({
            where,
            skip,
            take: limit,
            order: {
                detalle: 'ASC',
            },
            relations: ['laboratorio'],
        });

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: number) {
        const precioLaboratorio = await this.preciosLaboratoriosRepository.findOne({
            where: { id },
            relations: ['laboratorio'],
        });
        if (!precioLaboratorio) {
            throw new NotFoundException(`PrecioLaboratorio with ID ${id} not found`);
        }
        return precioLaboratorio;
    }

    async update(id: number, updatePrecioLaboratorioDto: UpdatePrecioLaboratorioDto) {
        if (updatePrecioLaboratorioDto.detalle) {
            const { detalle, idLaboratorio } = updatePrecioLaboratorioDto;
            
            // We need to know the idLaboratorio to check uniqueness within a lab
            // If it's not provided in the update DTO, we should fetch the current record
            let labId = idLaboratorio;
            if (!labId) {
                const current = await this.findOne(id);
                labId = current.idLaboratorio;
            }

            const existing = await this.preciosLaboratoriosRepository.findOne({
                where: {
                    detalle: ILike(detalle.trim()),
                    idLaboratorio: labId,
                    id: Not(id)
                }
            });

            if (existing) {
                throw new BadRequestException(`Ya existe otro precio con el detalle "${detalle}" para este laboratorio.`);
            }
        }

        const precioLaboratorio = await this.preciosLaboratoriosRepository.preload({
            id,
            ...updatePrecioLaboratorioDto,
        });
        if (!precioLaboratorio) {
            throw new NotFoundException(`PrecioLaboratorio with ID ${id} not found`);
        }
        return this.preciosLaboratoriosRepository.save(precioLaboratorio);
    }

    async remove(id: number) {
        const precioLaboratorio = await this.findOne(id);
        return this.preciosLaboratoriosRepository.remove(precioLaboratorio);
    }
}
