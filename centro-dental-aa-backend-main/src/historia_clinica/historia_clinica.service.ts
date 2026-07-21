import { HistoriaClinica } from './entities/historia_clinica.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Pago } from '../pagos/entities/pago.entity';
import { CreateHistoriaClinicaDto } from './dto/create-historia_clinica.dto';
import { UpdateHistoriaClinicaDto } from './dto/update-historia_clinica.dto';
import { TrabajoLaboratorio } from '../trabajos_laboratorios/entities/trabajo_laboratorio.entity';
import { Proforma } from '../proformas/entities/proforma.entity';
import { SupabaseStorageService } from '../common/storage/supabase-storage.service';

@Injectable()
export class HistoriaClinicaService {
    constructor(
        @InjectRepository(HistoriaClinica)
        private readonly historiaClinicaRepository: Repository<HistoriaClinica>,
        @InjectRepository(Pago)
        private readonly pagoRepository: Repository<Pago>,
        @InjectRepository(TrabajoLaboratorio)
        private readonly trabajoLaboratorioRepository: Repository<TrabajoLaboratorio>,
        @InjectRepository(Proforma)
        private readonly proformaRepository: Repository<Proforma>,
        private readonly storageService: SupabaseStorageService,
    ) { }

    async create(createDto: CreateHistoriaClinicaDto): Promise<HistoriaClinica> {
        if (createDto.firmaPaciente && createDto.firmaPaciente.startsWith('data:image')) {
            createDto.firmaPaciente = await this.storageService.uploadBase64('clinica-media', `signature-hc-${createDto.pacienteId}-${Date.now()}`, createDto.firmaPaciente);
        }
        const historia = this.historiaClinicaRepository.create(createDto);
        const saved = await this.historiaClinicaRepository.save(historia);
        
        if (saved.proformaId) {
            await this.syncPagadoStatus(saved.proformaId);
        }
        
        return saved;
    }

    async findAll(): Promise<HistoriaClinica[]> {
        return await this.historiaClinicaRepository.find({
            relations: ['paciente', 'doctor', 'especialidad', 'proforma', 'proformaDetalle', 'proformaDetalle.arancel'],
            order: { fecha: 'DESC' }
        });
    }

    async findAllByPaciente(pacienteId: number): Promise<HistoriaClinica[]> {
        return await this.historiaClinicaRepository.find({
            where: { pacienteId },
            relations: ['paciente', 'doctor', 'especialidad', 'proforma', 'proformaDetalle'],
            order: { fecha: 'DESC' }
        });
    }

    async findPendientesPago(doctorId?: number): Promise<any[]> {
        const qb = this.historiaClinicaRepository.createQueryBuilder('hc')
            .leftJoinAndSelect('hc.paciente', 'paciente')
            .leftJoinAndSelect('hc.doctor', 'doctor')
            .leftJoinAndSelect('hc.especialidad', 'especialidad')
            .leftJoinAndSelect('hc.proforma', 'proforma')
            .leftJoinAndSelect('hc.proformaDetalle', 'proformaDetalle')
            .leftJoinAndSelect('proformaDetalle.arancel', 'arancel')
            .where('hc.doctorId = :doctorId', { doctorId })
            .andWhere('hc.pagado = :pagado', { pagado: 'NO' });


        qb.orderBy('hc.fecha', 'ASC');

        const pendientes = await qb.getMany();

        const resultados = await Promise.all(pendientes.map(async (hc) => {
            let ultimoPago: Pago | null = null;
            if (hc.pacienteId && hc.proformaId) {
                ultimoPago = await this.pagoRepository.findOne({
                    where: {
                        pacienteId: hc.pacienteId,
                        proformaId: hc.proformaId
                    },
                    relations: ['formaPagoRel'],
                    order: { fecha: 'DESC', createdAt: 'DESC' }
                });
            }

            // Sum lab costs for this specific historia clinica
            const labWorks = await this.trabajoLaboratorioRepository.find({
                where: { idHistoriaClinica: hc.id }
            });
            const costoLaboratorioAuto = labWorks.reduce((acc, work) => acc + (Number(work.total) || 0), 0);

            return {
                ...hc,
                ultimoPagoPaciente: ultimoPago ? {
                    fecha: ultimoPago.fecha,
                    forma_pago: ultimoPago.formaPagoRel?.forma_pago || '',
                    monto: ultimoPago.monto,
                    moneda: ultimoPago.moneda,
                    factura: ultimoPago.factura // Added factura info
                } : null,
                comisionDefault: 0, // comision field removed from Arancel
                costoLaboratorioAuto // Automated lab cost
            };
        }));

        return resultados;
    }

    async findDoctoresConPendientes(): Promise<any[]> {
        const qb = this.historiaClinicaRepository
            .createQueryBuilder('hc')
            .select('doctor.id', 'id')
            .addSelect('doctor.nombre', 'nombre')
            .addSelect('doctor.paterno', 'paterno')
            .addSelect('doctor.materno', 'materno')
            .innerJoin('hc.doctor', 'doctor')
            .where('hc.pagado = :pagado', { pagado: 'NO' });


        const results = await qb.distinct(true)
            .orderBy('doctor.paterno', 'ASC')
            .getRawMany();
        console.log('Doctores con pendientes:', results);
        return results;
    }

    async findCancelados(): Promise<any[]> {
        const results = await this.historiaClinicaRepository.createQueryBuilder('hc')
            .leftJoinAndSelect('hc.paciente', 'paciente')
            .leftJoinAndSelect('hc.doctor', 'doctor')
            .leftJoinAndSelect('hc.proforma', 'proforma')
            .leftJoinAndSelect('proforma.pagos', 'pagos')
            .leftJoinAndSelect('pagos.formaPagoRel', 'formaPagoRel')
            .leftJoinAndSelect('hc.proformaDetalle', 'detalle')
            .leftJoinAndSelect('hc.pagosDetalleDoctores', 'pagosDetalleDoctores') // Join with doctor payment details
            .leftJoinAndSelect('pagosDetalleDoctores.pago', 'pagoDoctor') // Join to get the doctor payment header
            .where('hc.pagado = :pagado', { pagado: 'SI' })
            .orderBy('hc.fecha', 'DESC')
            .getMany();

        return results.map(hc => {
            // Find latest payment from patient
            const latestPayment = hc.proforma?.pagos?.sort((a, b) =>
                new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
            )[0];

            // Get payment detail to doctor if it exists
            const detailDoc = hc.pagosDetalleDoctores?.[0];
            const doctorPaymentDate = detailDoc?.pago?.fecha;

            return {
                ...hc,
                numeroPresupuesto: hc.proforma?.numero,
                costoLaboratorio: detailDoc ? Number(detailDoc.costo_laboratorio) : 0,
                fechaPagoPaciente: latestPayment?.fecha,
                formaPagoPaciente: latestPayment?.formaPagoRel?.forma_pago,
                descuento: detailDoc ? Number(detailDoc.descuento) : 0,
                comision: detailDoc ? Number(detailDoc.comision) : 0,
                pagoDoctorMonto: detailDoc ? Number(detailDoc.total) : 0,
                fechaPagoDoctor: doctorPaymentDate,
                factura: latestPayment?.factura // Boolean SI/NO or similar
            };
        });
    }

    async findOne(id: number): Promise<HistoriaClinica> {
        const historia = await this.historiaClinicaRepository.findOne({
            where: { id },
            relations: ['paciente', 'doctor', 'especialidad', 'proforma', 'proformaDetalle']
        });
        if (!historia) {
            throw new NotFoundException(`HistoriaClinica Clínica #${id} not found`);
        }
        return historia;
    }

    async update(id: number, updateDto: UpdateHistoriaClinicaDto): Promise<HistoriaClinica> {
        const historia = await this.historiaClinicaRepository.findOne({ where: { id } });
        if (!historia) {
            throw new NotFoundException(`HistoriaClinica Clínica #${id} not found`);
        }

        if (updateDto.firmaPaciente && updateDto.firmaPaciente.startsWith('data:image')) {
            // Delete old signature if it exists and is a URL
            if (historia.firmaPaciente && historia.firmaPaciente.startsWith('http')) {
                await this.storageService.deleteFile('clinica-media', historia.firmaPaciente);
            }
            updateDto.firmaPaciente = await this.storageService.uploadBase64('clinica-media', `signature-hc-${historia.pacienteId}-${id}`, updateDto.firmaPaciente);
        }

        this.historiaClinicaRepository.merge(historia, updateDto);
        const updated = await this.historiaClinicaRepository.save(historia);
        
        if (updated.proformaId) {
            await this.syncPagadoStatus(updated.proformaId);
        }
        
        return updated;
    }

    async remove(id: number): Promise<void> {
        const historia = await this.findOne(id);
        await this.historiaClinicaRepository.remove(historia);
    }

    async syncPagadoStatus(proformaId: number): Promise<void> {
        console.log(`Sincronizando estado de pago para Proforma #${proformaId}`);
        
        // 1. Obtener la Proforma y su total
        const proforma = await this.proformaRepository.findOne({ where: { id: proformaId } });
        if (!proforma) {
            console.warn(`No se encontró la Proforma #${proformaId} para sincronizar.`);
            return;
        }

        // 2. Obtener todos los pagos asociados a esta proforma
        const pagos = await this.pagoRepository.find({ where: { proformaId } });
        const totalPagado = pagos.reduce((acc, curr) => acc + Number(curr.monto || 0), 0);

        // 3. Comparar con el total de la proforma
        // Usamos un pequeño margen para evitar problemas de redondeo
        const totalProforma = Number(proforma.total || 0);
        const isPaid = totalPagado >= (totalProforma - 0.01);

        console.log(`Proforma #${proformaId}: Total=${totalProforma}, Pagado=${totalPagado}. Estado: ${isPaid ? 'SI' : 'NO'}`);

        // 4. Actualizar todos los registros de Historia Clínica vinculados
        await this.historiaClinicaRepository.update(
            { proformaId },
            { pagado: isPaid ? 'SI' : 'NO' }
        );
    }
}
