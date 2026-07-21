import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateConsentimientosPlantillaDto } from './dto/create-consentimientos-plantilla.dto';
import { UpdateConsentimientosPlantillaDto } from './dto/update-consentimientos-plantilla.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ConsentimientoPlantilla } from './entities/consentimientos-plantilla.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ConsentimientosPlantillasService {
  constructor(
    @InjectRepository(ConsentimientoPlantilla)
    private readonly plantillaRepository: Repository<ConsentimientoPlantilla>,
  ) {}

  create(createDto: CreateConsentimientosPlantillaDto) {
    const plantilla = this.plantillaRepository.create(createDto);
    return this.plantillaRepository.save(plantilla);
  }

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const qb = this.plantillaRepository.createQueryBuilder('plantilla')
      .leftJoinAndSelect('plantilla.especialidad', 'especialidad');
    
    if (search) {
      qb.where('plantilla.titulo LIKE :search', { search: `%${search}%` });
    }

    qb.orderBy('plantilla.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number) {
    const plantilla = await this.plantillaRepository.findOneBy({ id });
    if (!plantilla) {
      throw new NotFoundException(`Plantilla #${id} no encontrada`);
    }
    return plantilla;
  }

  async update(id: number, updateDto: UpdateConsentimientosPlantillaDto) {
    const plantilla = await this.findOne(id);
    this.plantillaRepository.merge(plantilla, updateDto);
    return this.plantillaRepository.save(plantilla);
  }

  async remove(id: number) {
    const plantilla = await this.findOne(id);
    return this.plantillaRepository.remove(plantilla);
  }
}
