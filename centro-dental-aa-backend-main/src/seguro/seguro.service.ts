import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { CreateSeguroDto } from './dto/create-seguro.dto';
import { UpdateSeguroDto } from './dto/update-seguro.dto';
import { Seguro } from './entities/seguro.entity';

@Injectable()
export class SeguroService {
    constructor(
        @InjectRepository(Seguro)
        private repository: Repository<Seguro>,
    ) { }

    create(createDto: CreateSeguroDto) {
        const entity = this.repository.create(createDto);
        return this.repository.save(entity);
    }

    async findAll(search?: string, page: number = 1, limit: number = 5) {
        const skip = (page - 1) * limit;
        const where = search
            ? { nombre: ILike(`%${search}%`) }
            : {};

        const [data, total] = await this.repository.findAndCount({
            where,
            skip,
            take: limit,
            order: { nombre: 'ASC' },
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
        return this.repository.findOneBy({ id });
    }

    async update(id: number, updateDto: UpdateSeguroDto) {
        await this.repository.update(id, updateDto);
        return this.findOne(id);
    }

    remove(id: number) {
        return this.repository.delete(id);
    }
}
