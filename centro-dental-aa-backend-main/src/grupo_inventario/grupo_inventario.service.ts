import { Injectable, NotFoundException, OnModuleInit, BadRequestException } from '@nestjs/common';
import { CreateGrupoInventarioDto } from './dto/create-grupo_inventario.dto';
import { UpdateGrupoInventarioDto } from './dto/update-grupo_inventario.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { GrupoInventario } from './entities/grupo_inventario.entity';
import { Repository, Like, ILike } from 'typeorm';

@Injectable()
export class GrupoInventarioService implements OnModuleInit {
  constructor(
    @InjectRepository(GrupoInventario)
    private readonly grupoInventarioRepository: Repository<GrupoInventario>,
  ) { }

  async onModuleInit() {
    await this.migrateStatusToLowercase();
  }

  private async migrateStatusToLowercase() {
    console.log('[GrupoInventario] Running status migration to lowercase...');
    const resultActivo = await this.grupoInventarioRepository.update(
      { estado: 'Activo' },
      { estado: 'activo' }
    );
    const resultInactivo = await this.grupoInventarioRepository.update(
      { estado: 'Inactivo' },
      { estado: 'inactivo' }
    );
    if (resultActivo.affected || resultInactivo.affected) {
      console.log(`[GrupoInventario] Migration complete. Updated ${resultActivo.affected || 0} active and ${resultInactivo.affected || 0} inactive records.`);
    } else {
      console.log('[GrupoInventario] No records needed migration.');
    }
  }

  async create(createGrupoInventarioDto: CreateGrupoInventarioDto) {
    const existing = await this.grupoInventarioRepository.findOne({
      where: { grupo: ILike(createGrupoInventarioDto.grupo.trim()) }
    });

    if (existing) {
      throw new BadRequestException('Este grupo de inventario ya se encuentra registrado.');
    }

    const grupo = this.grupoInventarioRepository.create(createGrupoInventarioDto);
    return this.grupoInventarioRepository.save(grupo);
  }

  async findAll(search?: string, page: number = 1, limit: number = 5) {
    const skip = (page - 1) * limit;
    const whereCondition = search ? [
      { grupo: Like(`%${search}%`) },
    ] : {};

    const [data, total] = await this.grupoInventarioRepository.findAndCount({
      where: whereCondition,
      take: limit,
      skip: skip,
      order: { id: 'DESC' },
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
    const grupo = await this.grupoInventarioRepository.findOneBy({ id });
    if (!grupo) throw new NotFoundException(`Grupo con ID ${id} no encontrado`);
    return grupo;
  }

  async update(id: number, updateGrupoInventarioDto: UpdateGrupoInventarioDto) {
    if (updateGrupoInventarioDto.grupo) {
      const existing = await this.grupoInventarioRepository.createQueryBuilder('grupo')
        .where('LOWER(grupo.grupo) = LOWER(:nombre)', { nombre: updateGrupoInventarioDto.grupo.trim() })
        .andWhere('grupo.id != :id', { id })
        .getOne();

      if (existing) {
        throw new BadRequestException('Ya existe otro grupo de inventario con este nombre.');
      }
    }
    const grupo = await this.findOne(id);
    this.grupoInventarioRepository.merge(grupo, updateGrupoInventarioDto);
    return this.grupoInventarioRepository.save(grupo);
  }

  async remove(id: number) {
    const grupo = await this.findOne(id);
    return this.grupoInventarioRepository.remove(grupo);
  }
}
