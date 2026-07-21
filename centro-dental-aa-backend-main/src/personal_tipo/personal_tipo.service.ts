import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { PersonalTipo } from './entities/personal_tipo.entity';
import { CreatePersonalTipoDto } from './dto/create-personal-tipo.dto';
import { UpdatePersonalTipoDto } from './dto/update-personal-tipo.dto';

@Injectable()
export class PersonalTipoService {
    constructor(
        @InjectRepository(PersonalTipo)
        private personalTipoRepository: Repository<PersonalTipo>,
    ) { }

    async create(createDto: CreatePersonalTipoDto): Promise<PersonalTipo> {
        // Check if area already exists
        const existing = await this.personalTipoRepository.findOne({
            where: { area: ILike(createDto.area.trim()) },
        });

        if (existing) {
            throw new BadRequestException('El área ya existe.');
        }

        const personalTipo = this.personalTipoRepository.create(createDto);
        return await this.personalTipoRepository.save(personalTipo);
    }

    async findAll(): Promise<PersonalTipo[]> {
        return await this.personalTipoRepository.find({
            order: { id: 'DESC' },
        });
    }

    async findOne(id: number): Promise<PersonalTipo | null> {
        return await this.personalTipoRepository.findOne({
            where: { id },
        });
    }

    async update(id: number, updateDto: UpdatePersonalTipoDto): Promise<PersonalTipo> {
        // Check if new area name already exists (if area is being updated)
        if (updateDto.area) {
            const existing = await this.personalTipoRepository.createQueryBuilder('personal_tipo')
                .where('LOWER(personal_tipo.area) = LOWER(:area)', { area: updateDto.area.trim() })
                .andWhere('personal_tipo.id != :id', { id })
                .getOne();

            if (existing) {
                throw new BadRequestException('Ya existe otra área con este nombre.');
            }
        }

        await this.personalTipoRepository.update(id, updateDto);
        const updated = await this.findOne(id);
        if (!updated) {
            throw new BadRequestException('Error al actualizar el área');
        }
        return updated;
    }

    async remove(id: number): Promise<void> {
        await this.personalTipoRepository.update(id, { estado: 'inactivo' });
    }

    async reactivate(id: number): Promise<void> {
        await this.personalTipoRepository.update(id, { estado: 'activo' });
    }
}
