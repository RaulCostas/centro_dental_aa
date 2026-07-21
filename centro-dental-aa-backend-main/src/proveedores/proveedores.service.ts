import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { Proveedor } from './entities/proveedor.entity';

@Injectable()
export class ProveedoresService {
    constructor(
        @InjectRepository(Proveedor)
        private proveedoresRepository: Repository<Proveedor>,
    ) { }

    async create(createProveedorDto: CreateProveedorDto) {
        const existing = await this.proveedoresRepository.findOne({
            where: { proveedor: ILike(createProveedorDto.proveedor.trim()) }
        });

        if (existing) {
            throw new BadRequestException('Este proveedor ya se encuentra registrado.');
        }

        const proveedor = this.proveedoresRepository.create(createProveedorDto);
        return this.proveedoresRepository.save(proveedor);
    }

    async findAll(search?: string, page: number = 1, limit: number = 5) {
        const skip = (page - 1) * limit;
        const where = search
            ? { proveedor: ILike(`%${search}%`) }
            : {};

        const [data, total] = await this.proveedoresRepository.findAndCount({
            where,
            skip,
            take: limit,
            order: { proveedor: 'ASC' },
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
        return this.proveedoresRepository.findOneBy({ id });
    }

    async update(id: number, updateProveedorDto: UpdateProveedorDto) {
        if (updateProveedorDto.proveedor) {
            const existing = await this.proveedoresRepository.createQueryBuilder('prov')
                .where('LOWER(prov.proveedor) = LOWER(:nombre)', { nombre: updateProveedorDto.proveedor.trim() })
                .andWhere('prov.id != :id', { id })
                .getOne();

            if (existing) {
                throw new BadRequestException('Ya existe otro proveedor con este nombre.');
            }
        }
        return this.proveedoresRepository.update(id, updateProveedorDto);
    }

    remove(id: number) {
        return this.proveedoresRepository.delete(id);
    }
}
