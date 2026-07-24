import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { getLocalDateString } from '../common/utils/date-utils';
import { CreateProformaDto } from './dto/create-proforma.dto';
import { UpdateProformaDto } from './dto/update-proforma.dto';
import { Proforma } from './entities/proforma.entity';
import { User } from '../users/entities/user.entity';
import { ProformaDetalle } from './entities/proforma-detalle.entity';
import { ProformaImagen } from './entities/proforma-imagen.entity';
import { UsersService } from '../users/users.service';
import { ChatbotService } from '../chatbot/chatbot.service';
import * as fs from 'fs';
import * as path from 'path';

import { SupabaseStorageService } from '../common/storage/supabase-storage.service';
import { HistoriaClinica } from '../historia_clinica/entities/historia_clinica.entity';

@Injectable()
export class ProformasService {
  constructor(
    @InjectRepository(Proforma)
    private readonly proformaRepository: Repository<Proforma>,
    @InjectRepository(ProformaDetalle)
    private readonly detalleRepository: Repository<ProformaDetalle>,
    @InjectRepository(ProformaImagen)
    private readonly imagenRepository: Repository<ProformaImagen>,
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly storageService: SupabaseStorageService,
    @Inject(forwardRef(() => ChatbotService))
    private readonly chatbotService: ChatbotService,
  ) { }

  async create(createProformaDto: CreateProformaDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Get correlative number for patient
      const lastProforma = await queryRunner.manager.findOne(Proforma, {
        where: { pacienteId: createProformaDto.pacienteId },
        order: { numero: 'DESC' },
      });
      const nextNumero = (lastProforma?.numero || 0) + 1;

      // 2. Create Proforma Header
      const proforma = new Proforma();
      proforma.pacienteId = createProformaDto.pacienteId;
      proforma.usuarioId = createProformaDto.usuarioId;
      proforma.numero = nextNumero;
      proforma.nota = createProformaDto.nota || '';
      proforma.fecha = createProformaDto.fecha
        ? createProformaDto.fecha.split('T')[0]
        : getLocalDateString();

      // 4. Totals and Discount fields
      proforma.sub_total = createProformaDto.sub_total || 0;
      proforma.descuento = createProformaDto.descuento || 0;
      proforma.total = createProformaDto.total || 0;
      proforma.moneda = createProformaDto.moneda || 'Bs';
      proforma.tipoCambio = createProformaDto.tipoCambio || 1;

      // 5. Odontograma Map
      proforma.odontograma_mapa = createProformaDto.odontograma_mapa || null;

      const savedProforma = await queryRunner.manager.save(proforma);

      // 3. Create Details
      const detalles = createProformaDto.detalles.map(item => {
        const detalle = new ProformaDetalle();
        detalle.proforma = savedProforma;
        detalle.arancelId = item.arancelId;
        detalle.precioUnitario = item.precioUnitario;
        detalle.piezas = item.piezas || '';
        detalle.cantidad = item.cantidad;
        detalle.descuento = item.descuento || 0;
        detalle.total = item.total;
        detalle.posible = item.posible;
        return detalle;
      });

      await queryRunner.manager.save(ProformaDetalle, detalles);

      await queryRunner.commitTransaction();
      return this.findOne(savedProforma.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error('Error creating proforma:', err);
      // Construct a meaningful error message
      const msg = err instanceof Error ? err.message : 'Unknown error';
      throw new NotFoundException(`Error creando proforma: ${msg}`);
    } finally {
      await queryRunner.release();
    }
  }

  async findDuePlanesPago() {
    const query = this.proformaRepository.createQueryBuilder('p')
      .leftJoinAndSelect('p.paciente', 'pac')
      .leftJoinAndSelect('p.pagos', 'pagos')
      .where("p.plan_pagos IS NOT NULL")
      .getMany();

    const proformas = await query;
    const duePlanes: any[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const p of proformas) {
      if (!p.plan_pagos || p.plan_pagos.activo !== true) continue;

      const plan = p.plan_pagos;
      let totalPagado = 0;
      if (p.pagos && p.pagos.length > 0) {
        totalPagado = p.pagos.reduce((acc, pago) => acc + Number(pago.monto), 0);
      }

      const totalTratamiento = Number(p.total || 0);
      const cuotaInicial = plan.cuotaInicial ? Number(plan.cuotaInicial) : 0;
      const montoParaCuotas = Math.max(0, totalTratamiento - cuotaInicial);
      const cuotaMensual = montoParaCuotas / plan.meses;
      const fechaActual = new Date(plan.fechaInicio || p.fecha);

      let nextDueCuota: any = null;

      // Check Initial Quota
      if (cuotaInicial > 0) {
        if (totalPagado < cuotaInicial - 0.1) {
          nextDueCuota = {
             numero: 0,
             fecha: fechaActual,
             monto: cuotaInicial,
             pagado: false,
          };
        }
      }

      if (!nextDueCuota) {
        for (let i = 1; i <= plan.meses; i++) {
          let nextMonth = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + i, plan.diaPago);
          if (nextMonth.getMonth() !== (fechaActual.getMonth() + i) % 12) {
              nextMonth = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + i + 1, 0);
          }

          const montoAcumuladoRequerido = cuotaInicial + (cuotaMensual * i);
          const isPaid = totalPagado >= montoAcumuladoRequerido - 0.1;

          if (!isPaid) {
            nextDueCuota = {
               numero: i,
               fecha: nextMonth,
               monto: cuotaMensual,
               pagado: isPaid,
            };
            break;
          }
        }
      }

      if (nextDueCuota) {
         const diffTime = nextDueCuota.fecha.getTime() - today.getTime();
         const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

         if (diffDays <= 7) {
             duePlanes.push({
                 proformaId: p.id,
                 paciente: p.paciente,
                 cuotaNumero: nextDueCuota.numero,
                 fechaVencimiento: getLocalDateString(nextDueCuota.fecha),
                 monto: nextDueCuota.monto,
                 diasParaVencer: diffDays
             });
         }
      }
    }

    return duePlanes;
  }

  async findAll(limit: number = 20, page: number = 1) {
    const options: any = {
      relations: ['paciente', 'usuario', 'detalles', 'detalles.arancel'],
      order: { fecha: 'DESC' },
      take: limit,
      skip: (page - 1) * limit
    };

    return this.proformaRepository.find(options);
  }

  async findAllByPaciente(pacienteId?: number) {
    const where: any = { pacienteId };

    const proformas = await this.proformaRepository.find({
      where,
      relations: ['usuario', 'detalles', 'detalles.arancel', 'imagenes'],
      order: { numero: 'ASC' }
    });

    // We need to include the estadoPresupuesto from HistoriaClinica
    const results = await Promise.all(proformas.map(async (p) => {
      const hcEntry = await this.dataSource.getRepository(HistoriaClinica).findOne({
        where: { proformaId: p.id },
        order: { id: 'DESC' } // Take latest status if multiple entries exist
      });

      return {
        ...p,
        imageCount: p.imagenes?.length || 0,
        estadoPresupuesto: hcEntry?.estadoPresupuesto || 'no terminado'
      };
    }));

    return results;
  }

  async findOne(id: number) {
    const proforma = await this.proformaRepository.findOne({
      where: { id },
      relations: ['paciente', 'usuario', 'detalles', 'detalles.arancel'],
    });
    if (!proforma) throw new NotFoundException(`Proforma #${id} not found`);
    return proforma;
  }

  async update(id: number, updateProformaDto: UpdateProformaDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const proforma = await queryRunner.manager.findOne(Proforma, {
        where: { id },
        relations: ['detalles'],
      });

      if (!proforma) throw new NotFoundException(`Proforma #${id} not found`);

      // Update header fields
      if (updateProformaDto.nota !== undefined) proforma.nota = updateProformaDto.nota;
      if (updateProformaDto.fecha) proforma.fecha = updateProformaDto.fecha.split('T')[0];
      if (updateProformaDto.usuarioId) proforma.usuarioId = updateProformaDto.usuarioId; // Update registered user

      if (updateProformaDto.sub_total !== undefined) proforma.sub_total = updateProformaDto.sub_total;
      if (updateProformaDto.descuento !== undefined) proforma.descuento = updateProformaDto.descuento;
      if (updateProformaDto.total !== undefined) proforma.total = updateProformaDto.total;
      if (updateProformaDto.moneda !== undefined) proforma.moneda = updateProformaDto.moneda;
      if (updateProformaDto.tipoCambio !== undefined) proforma.tipoCambio = updateProformaDto.tipoCambio;

      if (updateProformaDto.odontograma_mapa !== undefined) {
          proforma.odontograma_mapa = updateProformaDto.odontograma_mapa;
      }
      if (updateProformaDto.plan_pagos !== undefined) {
          proforma.plan_pagos = updateProformaDto.plan_pagos;
      }

      // Recalculate total if details are provided
      if (updateProformaDto.detalles) {
        // Smart Update Strategy:
        // 1. Identify which details to keep/update
        // 2. Identify which details to create
        // 3. Identify which details to remove

        const incomingDetails = updateProformaDto.detalles;
        const incomingIds = incomingDetails.filter(d => d.id).map(d => d.id);

        // Items to remove: Exists in DB but not in incoming payload
        const detailsToRemove = proforma.detalles.filter(d => !incomingIds.includes(d.id));

        if (detailsToRemove.length > 0) {
          // We attempt to remove. If this fails due to FK (item used in History), it will throw, 
          // which is expected (cannot delete used item), but at least we don't delete *everything*.
          await queryRunner.manager.remove(detailsToRemove);
        }

        const savedDetalles: ProformaDetalle[] = [];

        for (const item of incomingDetails) {
          let detalle: ProformaDetalle | null = null;

          if (item.id) {
            // Update existing
            detalle = proforma.detalles.find(d => d.id === item.id) || null;
          }

          if (!detalle) {
            // Create new
            detalle = new ProformaDetalle();
            detalle.proforma = proforma;
          }

          // Update fields
          detalle.arancelId = item.arancelId;
          detalle.precioUnitario = item.precioUnitario;
          detalle.piezas = item.piezas || '';
          detalle.cantidad = item.cantidad;
          detalle.descuento = item.descuento || 0;
          detalle.total = item.total;
          detalle.posible = item.posible;

          const savedDetalle = await queryRunner.manager.save(ProformaDetalle, detalle);
          savedDetalles.push(savedDetalle);
        }

        // Update proforma totals (exclude 'posible' items)
        const subtotal = savedDetalles.reduce((sum, item) => item.posible ? sum : sum + Number(item.total), 0);
        proforma.sub_total = subtotal;
        const discount = proforma.descuento || 0;
        proforma.total = subtotal - discount;

        // Update reference for return
        proforma.detalles = savedDetalles;
      }

      await queryRunner.manager.save(proforma);
      await queryRunner.commitTransaction();

      return this.findOne(id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error('Error updating proforma:', err);
      // Construct a meaningful error message
      const msg = err instanceof Error ? err.message : 'Unknown error';
      throw new NotFoundException(`Error actualizando proforma: ${msg}`);
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: number) {
    const proforma = await this.findOne(id);
    return this.proformaRepository.remove(proforma);
  }

  async uploadImage(proformaId: number, filename: string, buffer: Buffer, mimetype: string, descripcion?: string) {
    const proforma = await this.findOne(proformaId);
    
    // Upload to Supabase
    const bucket = 'clinica-media';
    const path = `proformas/${proformaId}/${Date.now()}-${filename}`;
    const publicUrl = await this.storageService.uploadFile(bucket, path, buffer, mimetype);

    const imagen = new ProformaImagen();
    imagen.proforma = proforma;
    imagen.nombre_archivo = filename;
    imagen.ruta = publicUrl;
    imagen.descripcion = descripcion || '';
    return this.imagenRepository.save(imagen);
  }

  async getImages(proformaId: number) {
    return this.imagenRepository.find({
      where: { proformaId },
      order: { fecha_creacion: 'DESC' }
    });
  }

  async uploadPacienteImage(pacienteId: number, tipo: 'particular', filename: string, buffer: Buffer, mimetype: string, descripcion?: string) {
    // Upload to Supabase
    const bucket = 'clinica-media';
    const folder = 'pacientes';
    const path = `${folder}/${pacienteId}/${Date.now()}-${filename}`;
    const publicUrl = await this.storageService.uploadFile(bucket, path, buffer, mimetype);

    const imagen = new ProformaImagen();
    imagen.pacienteId = pacienteId;
    imagen.nombre_archivo = filename;
    imagen.ruta = publicUrl;
    imagen.descripcion = descripcion || '';
    return this.imagenRepository.save(imagen);
  }

  async getPacienteImages(pacienteId: number, tipo: 'particular') {
    const where: any = { pacienteId };
    return this.imagenRepository.find({
      where,
      order: { fecha_creacion: 'DESC' }
    });
  }

  async removeImage(id: number) {
    const imagen = await this.imagenRepository.findOne({ where: { id } });
    if (!imagen) throw new NotFoundException('Imagen no encontrada');

    // Remove from Supabase
    await this.storageService.deleteFile('clinica-media', imagen.ruta);

    return this.imagenRepository.remove(imagen);
  }

  async sendWhatsApp(id: number, fileBuffer: Buffer) {
    const proforma = await this.findOne(id);
    const paciente = proforma.paciente;

    if (!paciente || !paciente.telefono_celular) {
      throw new NotFoundException('El paciente no tiene número de celular registrado');
    }

    // Clean phone number
    let phone = paciente.telefono_celular.replace(/\D/g, '');
    if (!phone.startsWith('591')) {
      phone = '591' + phone;
    }
    const jid = `${phone}@s.whatsapp.net`;

    try {
      await this.chatbotService.sendMessage(jid, {
        document: fileBuffer,
        mimetype: 'application/pdf',
        fileName: `Presupuesto_${proforma.numero}.pdf`,
        caption: `Hola ${paciente.nombre}, aquí tiene el detalle de su Plan de Tratamiento (N° ${proforma.numero}).`
      } );
      return { success: true, message: 'Enviado correctamente' };
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      throw new Error('Error al enviar mensaje de WhatsApp');
    }
  }
}
