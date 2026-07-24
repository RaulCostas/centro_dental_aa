import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CasoClinico } from './entities/caso_clinico.entity';
import { CasoClinicoFoto } from './entities/caso_clinico_foto.entity';
import { CreateCasoClinicoDto } from './dto/create-caso-clinico.dto';
import { UpdateCasoClinicoDto } from './dto/update-caso-clinico.dto';

@Injectable()
export class CasosClinicosService {
    constructor(
        @InjectRepository(CasoClinico)
        private casoClinicoRepository: Repository<CasoClinico>,
        @InjectRepository(CasoClinicoFoto)
        private fotoRepository: Repository<CasoClinicoFoto>,
    ) {}

    async create(createDto: CreateCasoClinicoDto): Promise<CasoClinico> {
        const { fotos, ...casoData } = createDto;
        const caso = this.casoClinicoRepository.create(casoData);
        
        if (fotos && fotos.length > 0) {
            caso.fotos = fotos.map(f => this.fotoRepository.create(f));
        }

        return await this.casoClinicoRepository.save(caso);
    }

    async findAll(query: { page?: number; limit?: number; search?: string }): Promise<{
        data: CasoClinico[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const skip = (page - 1) * limit;

        const qb = this.casoClinicoRepository
            .createQueryBuilder('caso')
            .leftJoinAndSelect('caso.especialidad', 'especialidad')
            .leftJoinAndSelect('caso.fotos', 'fotos')
            .orderBy('caso.id', 'DESC');

        if (query.search) {
            const term = `%${query.search.toLowerCase()}%`;
            qb.where('LOWER(caso.nombre) LIKE :term OR LOWER(especialidad.especialidad) LIKE :term', { term });
        }

        const [data, total] = await qb.take(limit).skip(skip).getManyAndCount();
        const totalPages = Math.ceil(total / limit) || 1;

        return {
            data,
            total,
            page,
            limit,
            totalPages,
        };
    }

    async findOne(id: number): Promise<CasoClinico> {
        const caso = await this.casoClinicoRepository.findOne({
            where: { id },
            relations: ['especialidad', 'fotos'],
        });
        if (!caso) {
            throw new NotFoundException(`Caso clínico con ID ${id} no encontrado`);
        }
        return caso;
    }

    async update(id: number, updateDto: UpdateCasoClinicoDto): Promise<CasoClinico> {
        const caso = await this.findOne(id);
        const { fotos, ...casoData } = updateDto;

        Object.assign(caso, casoData);

        if (fotos !== undefined) {
            // Delete existing photos
            await this.fotoRepository.delete({ casoClinicoId: id });
            // Create new photos
            caso.fotos = fotos.map(f => this.fotoRepository.create({ ...f, casoClinicoId: id }));
        }

        return await this.casoClinicoRepository.save(caso);
    }

    async remove(id: number): Promise<void> {
        const caso = await this.findOne(id);
        await this.casoClinicoRepository.remove(caso);
    }
}
