import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { getLocalDateString } from '../common/utils/date-utils';
import { Inventario } from './entities/inventario.entity';
import { PedidosDetalle } from '../pedidos/entities/pedidos-detalle.entity';
import { CreateInventarioDto, UpdateInventarioDto } from './dto/create-inventario.dto';

@Injectable()
export class InventarioService {
    constructor(
        @InjectRepository(Inventario)
        private inventarioRepository: Repository<Inventario>,
    ) { }

    async create(createInventarioDto: CreateInventarioDto) {
        const existing = await this.inventarioRepository.findOne({
            where: { descripcion: ILike(createInventarioDto.descripcion.trim()) }
        });

        if (existing) {
            throw new BadRequestException('Ya existe un producto en el inventario con esta descripción.');
        }

        const inventario = this.inventarioRepository.create(createInventarioDto);
        return this.inventarioRepository.save(inventario);
    }

    async findAll(search?: string, page: number = 1, limit: number = 10, expirationStatus?: string) {
        const queryBuilder = this.inventarioRepository.createQueryBuilder('inventario')
            .leftJoinAndSelect('inventario.especialidad', 'especialidad')
            .leftJoinAndSelect('inventario.grupoInventario', 'grupoInventario');

        if (search) {
            queryBuilder.andWhere('inventario.descripcion ILIKE :search', { search: `%${search}%` });
        }

        if (expirationStatus) {
            const today = getLocalDateString();
            let dateCondition = "";
            let params = {};

            if (expirationStatus === '3months') {
                dateCondition = "pd.fecha_vencimiento >= :today AND pd.fecha_vencimiento <= :futureDate";
                params = { today, futureDate: this.getDateAfterMonths(3) };
            } else if (expirationStatus === '6months') {
                dateCondition = "pd.fecha_vencimiento >= :today AND pd.fecha_vencimiento <= :futureDate";
                params = { today, futureDate: this.getDateAfterMonths(6) };
            } else if (expirationStatus === '9months') {
                dateCondition = "pd.fecha_vencimiento >= :today AND pd.fecha_vencimiento <= :futureDate";
                params = { today, futureDate: this.getDateAfterMonths(9) };
            } else if (expirationStatus === 'expired') {
                dateCondition = "pd.fecha_vencimiento < :today";
                params = { today };
            }

            if (dateCondition) {
                queryBuilder.andWhere((qb) => {
                    const subQuery = qb.subQuery()
                        .select("1")
                        .from(PedidosDetalle, "pd")
                        .where("pd.idinventario = inventario.id")
                        .andWhere(dateCondition, params)
                        .getQuery();
                    return "EXISTS " + subQuery;
                });
            }
        }

        const [data, total] = await queryBuilder
            .skip((page - 1) * limit)
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

    private getDateAfterMonths(months: number): string {
        const date = new Date();
        date.setMonth(date.getMonth() + months);
        return getLocalDateString(date);
    }

    async findLowStock() {
        const query = this.inventarioRepository.createQueryBuilder('inventario')
            .leftJoinAndSelect('inventario.especialidad', 'especialidad')
            .leftJoinAndSelect('inventario.grupoInventario', 'grupoInventario')
            .where('inventario.cantidad_existente < inventario.stock_minimo')
            .andWhere('inventario.estado = :estado', { estado: 'Activo' });

        return query.getMany();
    }

    findOne(id: number) {
        return this.inventarioRepository.findOne({
            where: { id },
            relations: ['especialidad', 'grupoInventario'],
        });
    }

    async update(id: number, updateInventarioDto: UpdateInventarioDto) {
        if (updateInventarioDto.descripcion) {
            const existing = await this.inventarioRepository.createQueryBuilder('inventario')
                .where('LOWER(inventario.descripcion) = LOWER(:descripcion)', { descripcion: updateInventarioDto.descripcion.trim() })
                .andWhere('inventario.id != :id', { id })
                .getOne();

            if (existing) {
                throw new BadRequestException('Ya existe otro producto con esta descripción.');
            }
        }
        return this.inventarioRepository.update(id, updateInventarioDto);
    }

    remove(id: number) {
        return this.inventarioRepository.delete(id);
    }
    async findExpiringDetails(expirationStatus: string) {
        const queryBuilder = this.inventarioRepository.manager.createQueryBuilder(PedidosDetalle, 'pd')
            .leftJoinAndSelect('pd.inventario', 'inventario')
            .leftJoinAndSelect('inventario.especialidad', 'especialidad')
            .leftJoinAndSelect('inventario.grupoInventario', 'grupoInventario');

        const today = getLocalDateString();

        if (expirationStatus === '3months') {
            queryBuilder.andWhere(
                "pd.fecha_vencimiento >= :today AND pd.fecha_vencimiento <= :threeMonths",
                { today, threeMonths: this.getDateAfterMonths(3) }
            );
        } else if (expirationStatus === '6months') {
            queryBuilder.andWhere(
                "pd.fecha_vencimiento > :threeMonths AND pd.fecha_vencimiento <= :sixMonths",
                { threeMonths: this.getDateAfterMonths(3), sixMonths: this.getDateAfterMonths(6) }
            );
        } else if (expirationStatus === '9months') {
            queryBuilder.andWhere(
                "pd.fecha_vencimiento > :sixMonths AND pd.fecha_vencimiento <= :nineMonths",
                { sixMonths: this.getDateAfterMonths(6), nineMonths: this.getDateAfterMonths(9) }
            );
        } else if (expirationStatus === 'expired') {
            queryBuilder.andWhere("pd.fecha_vencimiento < :today", { today });
        }

        return queryBuilder.getMany();
    }

    async findUsedGroups() {
        const query = this.inventarioRepository.createQueryBuilder('inventario')
            .innerJoin('inventario.grupoInventario', 'grupoInventario')
            .select(['grupoInventario.id as id', 'grupoInventario.grupo as grupo'])
            .where('inventario.idgrupo_inventario IS NOT NULL');

        return query.distinct(true).orderBy('grupo', 'ASC').getRawMany();
    }

    async findUsedSpecialties(grupoId?: number) {
        const query = this.inventarioRepository.createQueryBuilder('inventario')
            .innerJoin('inventario.especialidad', 'especialidad')
            .select(['especialidad.id as id', 'especialidad.especialidad as especialidad'])
            .where('inventario.idespecialidad IS NOT NULL');

        if (grupoId) {
            query.andWhere('inventario.idgrupo_inventario = :grupoId', { grupoId });
        }

        return query.distinct(true).orderBy('especialidad', 'ASC').getRawMany();
    }
}
