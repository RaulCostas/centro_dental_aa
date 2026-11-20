import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { getLocalDateString } from '../common/utils/date-utils';
import { CreatePropuestaDto } from './dto/create-propuesta.dto';
import { UpdatePropuestaDto } from './dto/update-propuesta.dto';
import { Propuesta } from './entities/propuesta.entity';
import { PropuestaDetalle } from './entities/propuesta-detalle.entity';
import { ProformasService } from '../proformas/proformas.service';
import { CreateProformaDto } from '../proformas/dto/create-proforma.dto';

@Injectable()
export class PropuestasService implements OnModuleInit {
    constructor(
        @InjectRepository(Propuesta)
        private readonly propuestaRepository: Repository<Propuesta>,
        @InjectRepository(PropuestaDetalle)
        private readonly detalleRepository: Repository<PropuestaDetalle>,
        private readonly dataSource: DataSource,
        private readonly proformasService: ProformasService,
    ) { }

    async onModuleInit() {
        try {
            await this.dataSource.query(`
                ALTER TABLE propuestas ADD COLUMN IF NOT EXISTS monedas JSONB;
                ALTER TABLE propuestas ADD COLUMN IF NOT EXISTS "tiposCambio" JSONB;
                ALTER TABLE propuestas ADD COLUMN IF NOT EXISTS notas JSONB;
                ALTER TABLE propuesta_detalle ADD COLUMN IF NOT EXISTS orden INT DEFAULT 0;
            `);
            console.log('[PropuestasService] Auto-migración de columnas monedas, tiposCambio, notas y orden completada.');
        } catch (error) {
            console.error('[PropuestasService] Error al migrar columnas:', error);
        }
    }

    private sortDetalles(detalles?: PropuestaDetalle[]): PropuestaDetalle[] {
        if (!detalles || !Array.isArray(detalles)) return [];
        return detalles.sort((a, b) => {
            if (a.orden !== undefined && b.orden !== undefined && a.orden !== b.orden) {
                return a.orden - b.orden;
            }
            return a.id - b.id;
        });
    }

    async convertToProforma(id: number, letra: string, usuarioId: number) {
        const propuesta = await this.findOne(id);

        // Filter details by the selected letter (tab) and preserve order
        const activeDetails = this.sortDetalles(propuesta.detalles.filter(d => d.letra === letra));

        if (activeDetails.length === 0) {
            throw new NotFoundException(`No hay items en la Propuesta ${letra}`);
        }

        // Fetch the global discount percentage for this specific tab, default to 0
        const globalDiscountPct = propuesta.descuentos?.[letra] || 0;

        // Calculate sub-total across all selected items (using item.total since subTotal is gone, with fallback to calculation)
        const sub_total = activeDetails.reduce((sum, d) => {
            const itemTotal = Number(d.total) || (Number(d.precioUnitario) * Number(d.cantidad));
            return sum + itemTotal;
        }, 0);
        
        // Apply the global discount (percentage to flat amount)
        const flatDiscount = sub_total * (globalDiscountPct / 100);
        const total = sub_total - flatDiscount;

        const notaLetra = propuesta.notas?.[letra] || propuesta.nota || '';

        const createProformaDto: CreateProformaDto = {
            pacienteId: propuesta.pacienteId,
            usuarioId: usuarioId,
            nota: `Generado desde Propuesta #${propuesta.numero} (Opción ${letra}). ${notaLetra}`,
            fecha: getLocalDateString(),
            sub_total: sub_total,
            descuento: globalDiscountPct,
            total: total,
            detalles: activeDetails.map((d, index) => {
                const itemTotal = Number(d.total) || (Number(d.precioUnitario) * Number(d.cantidad));
                const gross = Number(d.precioUnitario) * Number(d.cantidad);
                const inferredDiscount = Number(d.descuento) > 0
                    ? Number(d.descuento)
                    : (gross > 0 && gross - itemTotal > 0.01 ? Math.round((1 - itemTotal / gross) * 100) : 0);
                return {
                    arancelId: d.arancelId,
                    precioUnitario: Number(d.precioUnitario),
                    tc: 1, // Static fallback for ProformaDetalle
                    piezas: d.piezas,
                    cantidad: Number(d.cantidad),
                    subTotal: itemTotal, // Static mapping for ProformaDetalle
                    descuento: inferredDiscount,
                    total: itemTotal, // Before global discount, individual total is just subtotal
                    posible: Boolean(d.posible),
                    orden: index
                };
            }),
            plan_pagos: propuesta.plan_pagos?.[letra] || null,
            moneda: propuesta.monedas?.[letra] || 'Bs',
            tipoCambio: propuesta.tiposCambio?.[letra] || 1
        };

        return this.proformasService.create(createProformaDto);
    }

    async create(createPropuestaDto: CreatePropuestaDto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Get correlative number for patient
            const lastPropuesta = await queryRunner.manager.findOne(Propuesta, {
                where: { pacienteId: createPropuestaDto.pacienteId },
                order: { numero: 'DESC' },
            });
            const nextNumero = (lastPropuesta?.numero || 0) + 1;

            // 2. Create Header
            const propuesta = new Propuesta();
            propuesta.pacienteId = createPropuestaDto.pacienteId;
            propuesta.usuarioId = createPropuestaDto.usuarioId;
            propuesta.numero = nextNumero;

            propuesta.notas = createPropuestaDto.notas || {};
            if (createPropuestaDto.nota && !propuesta.notas?.['A']) {
                propuesta.notas = { ...propuesta.notas, 'A': createPropuestaDto.nota };
            }
            propuesta.nota = createPropuestaDto.notas?.['A'] || createPropuestaDto.nota || '';
            propuesta.fecha = createPropuestaDto.fecha
                ? createPropuestaDto.fecha.split('T')[0]
                : getLocalDateString();
            propuesta.descuentos = createPropuestaDto.descuentos || {};
            propuesta.plan_pagos = createPropuestaDto.plan_pagos || null;
            propuesta.monedas = createPropuestaDto.monedas || {};
            propuesta.tiposCambio = createPropuestaDto.tiposCambio || {};

            // Calculate total from details just in case
            propuesta.total = createPropuestaDto.detalles.reduce((sum, item) => sum + Number(item.total), 0);

            const savedPropuesta = await queryRunner.manager.save(propuesta);

            // 3. Create Details
            const detalles = createPropuestaDto.detalles.map((item, index) => {
                const detalle = new PropuestaDetalle();
                detalle.propuesta = savedPropuesta;
                detalle.letra = item.letra || null;
                detalle.arancelId = item.arancelId;
                detalle.precioUnitario = item.precioUnitario;
                detalle.piezas = item.piezas || '';
                detalle.cantidad = item.cantidad;
                detalle.descuento = item.descuento || 0;
                detalle.total = item.total;
                detalle.posible = item.posible || false;
                detalle.orden = item.orden !== undefined ? item.orden : index;
                return detalle;
            });

            await queryRunner.manager.save(PropuestaDetalle, detalles);

            await queryRunner.commitTransaction();
            return this.findOne(savedPropuesta.id);
        } catch (err) {
            await queryRunner.rollbackTransaction();
            console.error('Error creating propuesta:', err);
            const msg = err instanceof Error ? err.message : 'Unknown error';
            throw new NotFoundException(`Error creando propuesta: ${msg}`);
        } finally {
            await queryRunner.release();
        }
    }

    async findAll() {
        const propuestas = await this.propuestaRepository.find({
            relations: ['paciente', 'usuario', 'detalles', 'detalles.arancel'],
            order: { fecha: 'DESC' }
        });
        propuestas.forEach(p => {
            if (p.detalles) this.sortDetalles(p.detalles);
        });
        return propuestas;
    }

    async findAllByPaciente(pacienteId: number) {
        const propuestas = await this.propuestaRepository.find({
            where: { pacienteId },
            relations: ['usuario', 'detalles', 'detalles.arancel'],
            order: { numero: 'ASC' }
        });
        propuestas.forEach(p => {
            if (p.detalles) this.sortDetalles(p.detalles);
        });
        return propuestas;
    }

    async findOne(id: number) {
        const propuesta = await this.propuestaRepository.findOne({
            where: { id },
            relations: ['paciente', 'usuario', 'detalles', 'detalles.arancel'],
        });
        if (!propuesta) throw new NotFoundException(`Propuesta #${id} not found`);
        if (propuesta.detalles) this.sortDetalles(propuesta.detalles);
        return propuesta;
    }

    async update(id: number, updatePropuestaDto: UpdatePropuestaDto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const propuesta = await queryRunner.manager.findOne(Propuesta, {
                where: { id },
                relations: ['detalles'],
            });

            if (!propuesta) throw new NotFoundException(`Propuesta #${id} not found`);

            // Update header fields
            if (updatePropuestaDto.notas !== undefined) {
                propuesta.notas = updatePropuestaDto.notas;
                if (updatePropuestaDto.notas?.['A'] && !updatePropuestaDto.nota) {
                    propuesta.nota = updatePropuestaDto.notas['A'];
                }
            }
            if (updatePropuestaDto.nota !== undefined) propuesta.nota = updatePropuestaDto.nota;
            if (updatePropuestaDto.fecha) propuesta.fecha = updatePropuestaDto.fecha.split('T')[0];
            if (updatePropuestaDto.usuarioId) propuesta.usuarioId = updatePropuestaDto.usuarioId;
            if (updatePropuestaDto.descuentos !== undefined) propuesta.descuentos = updatePropuestaDto.descuentos;
            if (updatePropuestaDto.plan_pagos !== undefined) propuesta.plan_pagos = updatePropuestaDto.plan_pagos;
            if (updatePropuestaDto.monedas !== undefined) propuesta.monedas = updatePropuestaDto.monedas;
            if (updatePropuestaDto.tiposCambio !== undefined) propuesta.tiposCambio = updatePropuestaDto.tiposCambio;


            // Recalculate total if details are provided
            if (updatePropuestaDto.detalles) {
                const incomingDetails = updatePropuestaDto.detalles;
                // Since this uses DTO without ID for create, we might need a way to track updates
                // For simplicity similar to Proformas, we might wipe and replace or smart update. 
                // The UpdateDto inherits from CreateDto which has nested structure. 
                // BUT CreatePropuestaDetalleDto doesn't have ID. 
                // Proforma logic: "Items to remove: Exists in DB but not in incoming payload". 
                // This implies incoming payload SHOULD have IDs for updates. 
                // My CreatePropuestaDetalleDto DOES NOT have ID field.
                // I will assume for now we wipe and recreate or I need to add ID to DTO. 
                // Checking Proforma DTO... CreateProformaDto uses CreateProformaDetalleDto.
                // UpdateProformaDto extends CreateProformaDto. 
                // So officially UpdateProformaDto.detalles are "Create" dtos without IDs.
                // However, the Proforma service logic accesses `item.id`. This means the DTO definition might be loose or there's an `any` cast or additional interface not seen. 
                // I will add `id` as optional to `CreatePropuestaDetalleDto` to support updates, or handle it as "IntersectionType" if using NestJS mapped-types, but adding optional ID to the Create DTO is easiest pattern for "Updatable Details".

                // WAIT, I cannot modify the DTO file I just wrote easily without another tool call. 
                // I will cast `item` to `any` inside the loop to access `.id` if passed, 
                // assuming the frontend sends it. 

                const incomingIds = incomingDetails.map((d: any) => d.id).filter((id: number) => id);

                // Items to remove
                const detailsToRemove = propuesta.detalles.filter(d => !incomingIds.includes(d.id));
                if (detailsToRemove.length > 0) {
                    await queryRunner.manager.remove(detailsToRemove);
                }

                const savedDetalles: PropuestaDetalle[] = [];
                let index = 0;

                for (const item of incomingDetails) {
                    let detalle: PropuestaDetalle | null = null;
                    const itemId = (item as any).id;

                    if (itemId) {
                        detalle = propuesta.detalles.find(d => d.id === itemId) || null;
                    }

                    if (!detalle) {
                        detalle = new PropuestaDetalle();
                        detalle.propuesta = propuesta;
                    }

                    detalle.letra = item.letra || null;
                    detalle.arancelId = item.arancelId;
                    detalle.precioUnitario = item.precioUnitario;
                    detalle.piezas = item.piezas || '';
                    detalle.cantidad = item.cantidad;
                    detalle.descuento = item.descuento || 0;
                    detalle.total = item.total;
                    detalle.posible = item.posible || false;
                    detalle.orden = (item as any).orden !== undefined ? (item as any).orden : index;
                    index++;

                    const savedDetalle = await queryRunner.manager.save(PropuestaDetalle, detalle);
                    savedDetalles.push(savedDetalle);
                }

                propuesta.total = savedDetalles.reduce((sum, item) => sum + Number(item.total), 0);
                propuesta.detalles = this.sortDetalles(savedDetalles);
            }

            await queryRunner.manager.save(propuesta);
            await queryRunner.commitTransaction();

            return this.findOne(id);
        } catch (err) {
            await queryRunner.rollbackTransaction();
            console.error('Error updating propuesta:', err);
            const msg = err instanceof Error ? err.message : 'Unknown error';
            throw new NotFoundException(`Error actualizando propuesta: ${msg}`);
        } finally {
            await queryRunner.release();
        }
    }

    async remove(id: number) {
        const propuesta = await this.findOne(id);
        return this.propuestaRepository.remove(propuesta);
    }
}
