import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Paciente } from './entities/paciente.entity';
import { FichaClinica } from './entities/ficha_clinica.entity';

import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';

@Injectable()
export class PacientesService {
    constructor(
        @InjectRepository(Paciente)
        private pacientesRepository: Repository<Paciente>,
        @InjectRepository(FichaClinica)
        private fichaRepository: Repository<FichaClinica>,
        private dataSource: DataSource,
    ) { }

    private readonly pacienteWhitelistedFields = [
        'fecha_ingreso', 'paterno', 'materno', 'nombre', 'fecha_nacimiento', 
        'genero', 'ci', 'direccion', 'ocupacion', 'telefono_celular', 
        'email', 'tutor_nombre', 'tutor_ci', 'estado',
        'estado_civil', 'grado_instruccion', 'tutor_celular',
        'persona_brinda_informacion', 'usuarioId', 'seguroId'
    ];

    // Whitelist de campos permitidos para la entidad FichaClinica
    private readonly fichaWhitelistedFields = [
        'motivo_consulta', 'ant_pat_familiares',
        'ant_pat_anemia', 'ant_pat_cardiopatias', 'ant_pat_gastricas', 'ant_pat_hepatitis',
        'ant_pat_tuberculosis', 'ant_pat_asma', 'ant_pat_diabetes', 'ant_pat_epilepsia',
        'ant_pat_hipertension', 'ant_pat_vih', 'ant_pat_ninguno',
        'ant_pat_cirugia', 'ant_pat_cirugia_detalle',
        'ant_pat_otros', 'ant_pat_alergias', 'ant_pat_alergias_detalle',
        'ant_pat_embarazo', 'ant_pat_embarazo_semanas',
        'ant_pat_tratamiento_medico', 'ant_pat_tratamiento_medico_detalle',
        'ant_pat_toma_medicamentos', 'ant_pat_toma_medicamentos_detalle',
        'ant_pat_hemorragias', 'ant_pat_hemorragias_tipo',
        'exam_extra_atm', 'exam_extra_ganglios', 'exam_extra_respirador', 'exam_extra_otros',
        'exam_intra_labios', 'exam_intra_lengua', 'exam_intra_paladar', 'exam_intra_piso_boca',
        'exam_intra_mucosa_yugal', 'exam_intra_encias', 'exam_intra_protesis',
        'ant_buco_ultima_visita', 'habito_fuma', 'habito_bebe', 'habito_otros',
        'hig_cepillo', 'hig_hilo', 'hig_enjuague', 'hig_waterpik', 'hig_frecuencia_cepillado',
        'hig_sangrado_encias', 'hig_bucal_estado',
        'observaciones_ficha', 'usuarioId'
    ];

    private splitDto(dto: any): { pacienteData: any; fichaData: any } {
        const pacienteData: any = {};
        const fichaData: any = {};
        
        for (const [key, value] of Object.entries(dto)) {
            if (key === 'usuarioId') {
                pacienteData[key] = value;
                fichaData[key] = value;
            } else if (this.pacienteWhitelistedFields.includes(key)) {
                pacienteData[key] = value;
            } else if (this.fichaWhitelistedFields.includes(key)) {
                fichaData[key] = value;
            } else {
                if (key !== 'id' && !key.startsWith('_')) {
                    console.log(`[PacientesService] Campo ignorado: ${key}`);
                }
            }
        }
        return { pacienteData, fichaData };
    }

    async create(createPacienteDto: CreatePacienteDto): Promise<Paciente> {
        const { pacienteData, fichaData } = this.splitDto(createPacienteDto);

        // --- DUPLICATE CHECK ---
        const whereConditions: any[] = [];
        
        if (pacienteData.ci) {
            whereConditions.push({ ci: pacienteData.ci });
        }

        if (pacienteData.nombre && pacienteData.paterno && pacienteData.fecha_nacimiento) {
            whereConditions.push({
                nombre: pacienteData.nombre,
                paterno: pacienteData.paterno,
                fecha_nacimiento: pacienteData.fecha_nacimiento
            });
        }

        if (whereConditions.length > 0) {
            const existing = await this.pacientesRepository.findOne({
                where: whereConditions
            });
            if (existing) {
                const dupField = existing.ci === pacienteData.ci ? `CI: ${existing.ci}` : `Nombre y Fecha Nac.`;
                throw new BadRequestException(`Ya existe un paciente registrado con estos datos (${dupField}). Registrado como: ${existing.nombre} ${existing.paterno}`);
            }
        }
        // -----------------------

        return await this.dataSource.transaction(async (manager) => {
            const paciente = manager.create(Paciente, pacienteData);
            if (pacienteData.usuarioId) {
                paciente.usuario = { id: Number(pacienteData.usuarioId) } as any;
            }
            if (pacienteData.seguroId) {
                paciente.seguro = { id: Number(pacienteData.seguroId) } as any;
            }
            const savedPaciente = await manager.save(Paciente, paciente);

            const ficha = manager.create(FichaClinica, {
                ...fichaData,
                pacienteId: savedPaciente.id,
            });
            await manager.save(FichaClinica, ficha);

            return (await manager.findOne(Paciente, {
                where: { id: savedPaciente.id },
                relations: ['fichaClinica'],
            }))!;
        });
    }

    async findAll(
        page: number = 1, 
        limit: number = 10, 
        search: string = '',
    ): Promise<{ data: Paciente[], total: number, page: number, limit: number, totalPages: number }> {
        const skip = (page - 1) * limit;

        const queryBuilder = this.pacientesRepository.createQueryBuilder('paciente')
            .leftJoinAndSelect('paciente.seguro', 'seguro');


        if (search) {
            const searchTerm = `%${search}%`;
            queryBuilder.where(
                "(paciente.nombre ILIKE :search OR paciente.paterno ILIKE :search OR paciente.materno ILIKE :search OR CONCAT(paciente.nombre, ' ', paciente.paterno, ' ', paciente.materno) ILIKE :search OR CONCAT(paciente.paterno, ' ', paciente.materno, ' ', paciente.nombre) ILIKE :search)",
                { search: searchTerm }
            );
        }

        queryBuilder
            .orderBy('paciente.paterno', 'ASC')
            .addOrderBy('paciente.materno', 'ASC')
            .addOrderBy('paciente.nombre', 'ASC')
            .skip(skip)
            .take(limit);

        const [data, total] = await queryBuilder.getManyAndCount();

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: number): Promise<Paciente> {
        const paciente = await this.pacientesRepository.findOne({
            where: { id },
            relations: ['fichaClinica', 'seguro'],
        });
        if (!paciente) {
            throw new NotFoundException(`Paciente #${id} not found`);
        }
        return paciente;
    }

    async update(id: number, updatePacienteDto: UpdatePacienteDto): Promise<Paciente> {
        return await this.dataSource.transaction(async (manager) => {
            const { pacienteData, fichaData } = this.splitDto(updatePacienteDto);

            const paciente = await manager.findOne(Paciente, { where: { id } });
            if (!paciente) throw new NotFoundException(`Paciente #${id} not found`);

            manager.merge(Paciente, paciente, pacienteData);
            if (pacienteData.usuarioId) {
                paciente.usuario = { id: Number(pacienteData.usuarioId) } as any;
            }
            if (pacienteData.seguroId) {
                paciente.seguro = { id: Number(pacienteData.seguroId) } as any;
            } else if (pacienteData.hasOwnProperty('seguroId')) {
                paciente.seguro = null;
            }
            await manager.save(Paciente, paciente);

            // Update or create ficha
            if (Object.keys(fichaData).length > 0) {
                let ficha = await manager.findOne(FichaClinica, { where: { pacienteId: id } });
                if (ficha) {
                    manager.merge(FichaClinica, ficha, fichaData);
                    await manager.save(FichaClinica, ficha);
                } else {
                    const newFicha = manager.create(FichaClinica, { ...fichaData, pacienteId: id });
                    await manager.save(FichaClinica, newFicha);
                }
            }

            return (await manager.findOne(Paciente, {
                where: { id },
                relations: ['fichaClinica'],
            }))!;
        });
    }

    async remove(id: number): Promise<void> {
        await this.pacientesRepository.delete(id);
    }

    async getDashboardStats(): Promise<{ totalPacientes: number, birthdayPacientes: Paciente[] }> {
        const totalPacientes = await this.pacientesRepository.count({ where: { estado: 'activo' } });

        const today = new Date();
        const month = today.getMonth() + 1;
        const day = today.getDate();

        const birthdayPacientes = await this.pacientesRepository
            .createQueryBuilder('paciente')
            .where('EXTRACT(MONTH FROM paciente.fecha_nacimiento) = :month', { month })
            .andWhere('EXTRACT(DAY FROM paciente.fecha_nacimiento) = :day', { day })
            .andWhere('paciente.estado = :estado', { estado: 'activo' })
            .getMany();

        return { totalPacientes, birthdayPacientes };
    }

    async findByCelular(celular: string): Promise<Paciente | null> {
        let paciente = await this.pacientesRepository.findOne({
            where: { telefono_celular: celular },
        });
        if (paciente) return paciente;

        const cleanCelular = celular.replace(/[^0-9]/g, '');
        if (!cleanCelular || cleanCelular.length < 7) return null;

        try {
            paciente = await this.pacientesRepository.createQueryBuilder('p')
                .where("REGEXP_REPLACE(p.telefono_celular, '[^0-9]', '', 'g') LIKE :suffix", { suffix: `%${cleanCelular}` })
                .orWhere(":cleanCelular LIKE CONCAT('%', REGEXP_REPLACE(p.telefono_celular, '[^0-9]', '', 'g'))", { cleanCelular })
                .getOne();
        } catch (e) {
            console.error('Error in fuzzy search:', e);
        }

        return paciente || null;
    }

    async findPendientes(tab: 'agendados' | 'no_agendados', search?: string, page: number = 1, limit: number = 10) {
        const offset = (page - 1) * limit;
        
        let searchFilter = '';
        if (search) {
            searchFilter = `AND (p.nombre ILIKE '%${search}%' OR p.paterno ILIKE '%${search}%' OR p.materno ILIKE '%${search}%')`;
        }

        // Definimos la subconsulta para obtener el último seguimiento de presupuestos NO terminados por PROFORMA
        const subqueryUltimoSeguimiento = `
            SELECT "pacienteId", "proformaId", MAX(fecha) as fecha_seguimiento
            FROM historia_clinica hc
            WHERE (hc."estadoPresupuesto" IS NULL OR hc."estadoPresupuesto" NOT ILIKE 'terminado')
            GROUP BY "pacienteId", "proformaId"
        `;

        let condition = '';
        const activeStatuses = "'agendado', 'confirmado'";
        if (tab === 'agendados') {
            condition = `EXISTS (SELECT 1 FROM agenda a WHERE a."pacienteId" = p.id AND a.fecha >= us.fecha_seguimiento AND LOWER(a.estado) IN (${activeStatuses}))`;
        } else {
            condition = `NOT EXISTS (SELECT 1 FROM agenda a WHERE a."pacienteId" = p.id AND a.fecha >= us.fecha_seguimiento AND LOWER(a.estado) IN (${activeStatuses}))`;
        }

        const countQuery = `
            SELECT COUNT(*) as total
            FROM pacientes p
            INNER JOIN (${subqueryUltimoSeguimiento}) us ON us."pacienteId" = p.id
            WHERE ${condition} ${searchFilter}
        `;

        const query = `
            SELECT 
                p.id, p.nombre, p.paterno, p.materno, p.telefono_celular as celular,
                us.fecha_seguimiento as ultima_fecha_seguimiento,
                us."proformaId",
                (SELECT a.fecha FROM agenda a WHERE a."pacienteId" = p.id ORDER BY a.fecha DESC LIMIT 1) as ultima_cita,
                (SELECT CONCAT(d.nombre, ' ', d.paterno) 
                 FROM historia_clinica hc 
                 LEFT JOIN doctor d ON d.id = hc."doctorId" 
                 WHERE hc."pacienteId" = p.id AND hc."proformaId" = us."proformaId"
                 ORDER BY hc.fecha DESC LIMIT 1) as ultimo_doctor,
                (SELECT hc.tratamiento 
                 FROM historia_clinica hc 
                 WHERE hc."pacienteId" = p.id AND hc."proformaId" = us."proformaId"
                 ORDER BY hc.fecha DESC LIMIT 1) as ultimo_tratamiento,
                 (SELECT e.especialidad 
                  FROM historia_clinica hc 
                  LEFT JOIN especialidad e ON e.id = hc."especialidadId" 
                  WHERE hc."pacienteId" = p.id AND hc."proformaId" = us."proformaId"
                  ORDER BY hc.fecha DESC LIMIT 1) as ultima_especialidad,
                  (SELECT pr.numero 
                   FROM proformas pr 
                   WHERE pr.id = us."proformaId"
                   LIMIT 1) as numero_presupuesto
            FROM pacientes p
            INNER JOIN (${subqueryUltimoSeguimiento}) us ON us."pacienteId" = p.id
            WHERE ${condition} ${searchFilter}
            ORDER BY us.fecha_seguimiento DESC
            LIMIT ${limit} OFFSET ${offset}
        `;

        const [data, countResult] = await Promise.all([
            this.pacientesRepository.query(query),
            this.pacientesRepository.query(countQuery)
        ]);

        const total = parseInt(countResult[0].total);
        return {
            data,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        };
    }

    async findNoRegistrados() {
        const today = new Date().toISOString().split('T')[0];
        const query = `
            SELECT 
                p.id as "pacienteId",
                p.nombre, p.paterno, p.materno,
                a.fecha, a.hora, a.consultorio,
                'particular' as tipo,
                NULL as "seguroColor"
            FROM agenda a
            JOIN pacientes p ON p.id = a."pacienteId"
            WHERE a.fecha <= '${today}' 
              AND LOWER(a.estado) = 'atendido'
              AND NOT EXISTS (
                  SELECT 1 
                  FROM historia_clinica hc 
                  WHERE hc."pacienteId" = a."pacienteId" 
                    AND hc.fecha = a.fecha
              )
            ORDER BY fecha DESC
        `;
        return await this.pacientesRepository.query(query);
    }

    async getStatistics(year: number): Promise<any[]> {
        const rawParticular = await this.pacientesRepository.createQueryBuilder('p')
            .select('EXTRACT(MONTH FROM p.fecha_ingreso)', 'month')
            .addSelect('COUNT(p.id)', 'count')
            .where('EXTRACT(YEAR FROM p.fecha_ingreso) = :year', { year })
            .groupBy('EXTRACT(MONTH FROM p.fecha_ingreso)')
            .getRawMany();

        const monthlyStats = Array.from({ length: 12 }, (_, i) => ({ 
            month: i + 1, 
            countParticular: 0,
            countSeguro: 0,
            count: 0 
        }));

        rawParticular.forEach(r => {
            const mIndex = parseInt(r.month) - 1;
            if (mIndex >= 0 && mIndex < 12) {
                const count = parseInt(r.count);
                monthlyStats[mIndex].countParticular = count;
                monthlyStats[mIndex].count += count;
            }
        });

        return monthlyStats;
    }
}
