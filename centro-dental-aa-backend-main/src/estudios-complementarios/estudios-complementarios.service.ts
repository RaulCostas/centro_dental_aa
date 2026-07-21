import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { EstudioComplementario } from './entities/estudio-complementario.entity';
import { CreateEstudioComplementarioDto } from './dto/create-estudio-complementario.dto';
import { UpdateEstudioComplementarioDto } from './dto/update-estudio-complementario.dto';

@Injectable()
export class EstudiosComplementariosService {
  constructor(
    @InjectRepository(EstudioComplementario)
    private readonly repository: Repository<EstudioComplementario>,
  ) {}

  async create(createDto: CreateEstudioComplementarioDto) {
    const newRecord = this.repository.create(createDto);
    return await this.repository.save(newRecord);
  }

  async findAll(pacienteId?: number, page: number = 1, limit: number = 10, search?: string) {
    const where: any = {};
    if (pacienteId) {
      where.pacienteId = pacienteId;
    }
    if (search) {
      where.tipo_estudio = Like(`%${search}%`);
    }

    const [data, total] = await this.repository.findAndCount({
      where,
      order: { fecha: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['paciente'],
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
    const record = await this.repository.findOne({ where: { id }, relations: ['paciente'] });
    if (!record) {
      throw new NotFoundException(`Estudio Complementario con ID ${id} no encontrado`);
    }
    return record;
  }

  async update(id: number, updateDto: UpdateEstudioComplementarioDto) {
    await this.findOne(id);
    await this.repository.update(id, updateDto);
    return this.findOne(id);
  }

  async updateFileUrl(id: number, filename: string) {
    await this.findOne(id);
    await this.repository.update(id, { archivo_url: filename });
    return this.findOne(id);
  }

  async remove(id: number) {
    const record = await this.findOne(id);
    await this.repository.remove(record);
    return { success: true };
  }
}
