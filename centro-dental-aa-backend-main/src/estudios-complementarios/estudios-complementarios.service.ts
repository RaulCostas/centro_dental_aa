import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { EstudioComplementario } from './entities/estudio-complementario.entity';
import { CreateEstudioComplementarioDto } from './dto/create-estudio-complementario.dto';
import { UpdateEstudioComplementarioDto } from './dto/update-estudio-complementario.dto';
import { SupabaseStorageService } from '../common/storage/supabase-storage.service';
import * as path from 'path';

@Injectable()
export class EstudiosComplementariosService {
  constructor(
    @InjectRepository(EstudioComplementario)
    private readonly repository: Repository<EstudioComplementario>,
    private readonly storageService: SupabaseStorageService,
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

  async uploadFile(id: number, originalname: string, buffer: Buffer, mimetype: string) {
    const record = await this.findOne(id);
    const bucket = 'clinica-media';
    const ext = path.extname(originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const storagePath = `estudios/${id}/resultado-${uniqueSuffix}${ext}`;

    if (record.archivo_url && record.archivo_url.startsWith('http')) {
      await this.storageService.deleteFile(bucket, record.archivo_url).catch(e => console.warn(e));
    }

    const publicUrl = await this.storageService.uploadFile(bucket, storagePath, buffer, mimetype);
    await this.repository.update(id, { archivo_url: publicUrl });
    return this.findOne(id);
  }

  async uploadOrdenFile(id: number, originalname: string, buffer: Buffer, mimetype: string) {
    const record = await this.findOne(id);
    const bucket = 'clinica-media';
    const ext = path.extname(originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const storagePath = `estudios/${id}/orden-${uniqueSuffix}${ext}`;

    if (record.orden_estudio_url && record.orden_estudio_url.startsWith('http')) {
      await this.storageService.deleteFile(bucket, record.orden_estudio_url).catch(e => console.warn(e));
    }

    const publicUrl = await this.storageService.uploadFile(bucket, storagePath, buffer, mimetype);
    await this.repository.update(id, { orden_estudio_url: publicUrl });
    return this.findOne(id);
  }

  async updateFileUrl(id: number, filename: string) {
    await this.findOne(id);
    await this.repository.update(id, { archivo_url: filename });
    return this.findOne(id);
  }

  async updateOrdenFileUrl(id: number, filename: string) {
    await this.findOne(id);
    await this.repository.update(id, { orden_estudio_url: filename });
    return this.findOne(id);
  }

  async remove(id: number) {
    const record = await this.findOne(id);
    if (record.archivo_url && record.archivo_url.startsWith('http')) {
      await this.storageService.deleteFile('clinica-media', record.archivo_url).catch(e => console.warn(e));
    }
    if (record.orden_estudio_url && record.orden_estudio_url.startsWith('http')) {
      await this.storageService.deleteFile('clinica-media', record.orden_estudio_url).catch(e => console.warn(e));
    }
    await this.repository.remove(record);
    return { success: true };
  }
}
