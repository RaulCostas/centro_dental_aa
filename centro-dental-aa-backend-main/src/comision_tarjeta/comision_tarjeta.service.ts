import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { ComisionTarjeta } from './entities/comision_tarjeta.entity';
import { CreateComisionTarjetaDto } from './dto/create-comision_tarjeta.dto';
import { UpdateComisionTarjetaDto } from './dto/update-comision_tarjeta.dto';

@Injectable()
export class ComisionTarjetaService {
    constructor(
        @InjectRepository(ComisionTarjeta)
        private comisionTarjetaRepository: Repository<ComisionTarjeta>,
    ) { }

    async create(createComisionTarjetaDto: CreateComisionTarjetaDto) {
        const existing = await this.comisionTarjetaRepository.findOne({
            where: { redBanco: ILike(createComisionTarjetaDto.redBanco.trim()) }
        });

        if (existing) {
            throw new BadRequestException('Esta Red de Banco ya se encuentra registrada.');
        }

        const comision = this.comisionTarjetaRepository.create(createComisionTarjetaDto);
        return this.comisionTarjetaRepository.save(comision);
    }

    findAll() {
        return this.comisionTarjetaRepository.find();
    }

    findOne(id: number) {
        return this.comisionTarjetaRepository.findOneBy({ id });
    }

    async update(id: number, updateComisionTarjetaDto: UpdateComisionTarjetaDto) {
        if (updateComisionTarjetaDto.redBanco) {
            const existing = await this.comisionTarjetaRepository.createQueryBuilder('comision')
                .where('LOWER(comision.red_banco) = LOWER(:redBanco)', { redBanco: updateComisionTarjetaDto.redBanco.trim() })
                .andWhere('comision.id != :id', { id })
                .getOne();

            if (existing) {
                throw new BadRequestException('Ya existe otra comisión registrada con esta Red de Banco.');
            }
        }
        return this.comisionTarjetaRepository.update(id, updateComisionTarjetaDto);
    }

    remove(id: number) {
        return this.comisionTarjetaRepository.delete(id);
    }
}
