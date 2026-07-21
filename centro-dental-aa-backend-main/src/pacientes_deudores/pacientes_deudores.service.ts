import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Proforma } from '../proformas/entities/proforma.entity';

@Injectable()
export class PacientesDeudoresService {
    constructor(
        @InjectRepository(Proforma)
        private readonly proformaRepository: Repository<Proforma>,
        private dataSource: DataSource,
    ) { }

    async findAll(estado: 'terminado' | 'no terminado') {
        // Step 1: Get all proformas
        let proformasQuery = `SELECT * FROM proformas`;
        const proformas = await this.proformaRepository.query(proformasQuery);


        if (proformas.length === 0) return [];

        const proformaIds = proformas.map(p => p.id);

        // Step 2: Fetch all payments for these proformas
        const pagos = await this.dataSource.query(
            `SELECT * FROM pagos WHERE "proformaId" IN (${proformaIds.join(',')})`
        );

        // Step 3: Fetch history entries for display fields only (ultima cita, especialidad, tratamiento)
        const history = await this.dataSource.query(
            `SELECT * FROM historia_clinica WHERE "proformaId" IN (${proformaIds.join(',')})`
        );

        // Step 4: Fetch Patients
        const sampleProforma = proformas[0];
        const patientIdKey = Object.keys(sampleProforma).find(k => k.toLowerCase().includes('pacienteid') || k.toLowerCase().includes('paciente_id')) || 'pacienteId';

        const patientIds = [...new Set(proformas.map(p => p[patientIdKey]))].filter(id => id);

        let patients: any[] = [];
        if (patientIds.length > 0) {
            patients = await this.dataSource.query(
                `SELECT * FROM pacientes WHERE id IN (${patientIds.join(',')})`
            );
        }

        // Step 5: Fetch Specialties (for display)
        const espIds = [...new Set(history.map(h => h.especialidadId))].filter(id => id);
        let specialties: any[] = [];
        if (espIds.length > 0) {
            specialties = await this.dataSource.query(
                `SELECT * FROM especialidad WHERE id IN (${espIds.join(',')})`
            );
        }

        // Helper to find key case-insensitively
        const getVal = (obj: any, keySub: string) => {
            if (!obj) return null;
            const k = Object.keys(obj).find(key => key.toLowerCase().includes(keySub.toLowerCase()));
            return k ? obj[k] : null;
        }

        const espMap = new Map(specialties.map(e => [e.id, e.especialidad]));
        const patientMap = new Map(patients.map(p => [p.id, p]));

        // Build payments totals per proforma
        const pagosMap = new Map<number, number>();
        pagos.forEach(pg => {
            const current = pagosMap.get(pg.proformaId) || 0;
            pagosMap.set(pg.proformaId, current + parseFloat(pg.monto));
        });

        // Map and Filter
        const results = proformas.map(p => {
            const pid = p[patientIdKey];
            const pac = patientMap.get(pid);

            const pacName = pac ? getVal(pac, 'nombre') : '';
            const pacPaterno = pac ? getVal(pac, 'paterno') : '';
            const pacMaterno = pac ? getVal(pac, 'materno') : '';

            const totalPresupuesto = parseFloat(p.total);
            const paid = pagosMap.get(p.id) || 0;

            // *** NEW LOGIC: Saldo = Total Presupuesto - Total Pagado ***
            const saldo = totalPresupuesto - paid;

            // Get history for display fields only
            const pHistory = history.filter(h => h.proformaId === p.id);

            // Sort to find the latest cita
            const sortedHistory = pHistory.sort((a, b) => {
                const dateDiff = new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
                if (dateDiff !== 0) return dateDiff;
                const ca = getVal(a, 'createdAt');
                const cb = getVal(b, 'createdAt');
                if (ca && cb) {
                    const createdDiff = new Date(cb).getTime() - new Date(ca).getTime();
                    if (createdDiff !== 0) return createdDiff;
                }
                return b.id - a.id;
            });

            const latest = sortedHistory[0] || {};

            // Determine Status based on proforma's estadoPresupuesto
            const proformaStatus = p.estadoPresupuesto || 'no terminado';

            return {
                proformaId: p.id,
                numeroPresupuesto: p.numero,
                pacienteId: pid,
                totalPresupuesto: totalPresupuesto,
                totalPagado: paid,
                saldo: saldo,
                ultimaCita: latest.fecha || null,
                especialidad: latest.especialidadId ? (espMap.get(latest.especialidadId) || '') : '',
                tratamiento: latest.tratamiento || '',
                paciente: `${pacName} ${pacPaterno || ''} ${pacMaterno || ''}`.trim().replace(/\s+/g, ' '),
                status: proformaStatus
            };
        });

        // Filter: only show records with a positive balance AND matching the requested status filter
        if (estado === 'terminado') {
            return results.filter(r => r.status === 'terminado' && r.saldo > 0);
        } else {
            // 'activos' = all non-terminated proformas with a pending balance
            return results.filter(r => r.status !== 'terminado' && r.saldo > 0);
        }
    }

}
