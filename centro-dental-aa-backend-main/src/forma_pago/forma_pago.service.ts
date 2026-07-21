import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { CreateFormaPagoDto } from './dto/create-forma_pago.dto';
import { UpdateFormaPagoDto } from './dto/update-forma_pago.dto';
import { FormaPago } from './entities/forma_pago.entity';

@Injectable()
export class FormaPagoService {
    constructor(
        @InjectRepository(FormaPago)
        private formaPagoRepository: Repository<FormaPago>,
    ) { }

    async create(createFormaPagoDto: CreateFormaPagoDto) {
        const existing = await this.formaPagoRepository.findOne({
            where: { forma_pago: ILike(createFormaPagoDto.forma_pago.trim()) }
        });

        if (existing) {
            throw new BadRequestException('Esta forma de pago ya se encuentra registrada.');
        }

        const formaPago = this.formaPagoRepository.create(createFormaPagoDto);
        return this.formaPagoRepository.save(formaPago);
    }

    async findAll(search?: string, page: number = 1, limit: number = 5): Promise<{
        data: FormaPago[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;
        const queryBuilder = this.formaPagoRepository.createQueryBuilder('formaPago');

        if (search) {
            queryBuilder.where('formaPago.forma_pago ILIKE :search', { search: `%${search}%` });
        }

        const [data, total] = await queryBuilder
            .orderBy('formaPago.forma_pago', 'ASC')
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    findOne(id: number) {
        return this.formaPagoRepository.findOneBy({ id });
    }

    async update(id: number, updateFormaPagoDto: UpdateFormaPagoDto) {
        if (updateFormaPagoDto.forma_pago) {
            const existing = await this.formaPagoRepository.createQueryBuilder('formaPago')
                .where('LOWER(formaPago.forma_pago) = LOWER(:forma_pago)', { forma_pago: updateFormaPagoDto.forma_pago.trim() })
                .andWhere('formaPago.id != :id', { id })
                .getOne();

            if (existing) {
                throw new BadRequestException('Ya existe otra forma de pago con este nombre.');
            }
        }
        return this.formaPagoRepository.update(id, updateFormaPagoDto);
    }

    remove(id: number) {
        return this.formaPagoRepository.delete(id);
    }
}
