import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Agenda } from './entities/agenda.entity';
import { CreateAgendaDto } from './dto/create-agenda.dto';
import { UpdateAgendaDto } from './dto/update-agenda.dto';
import { ChatbotService } from '../chatbot/chatbot.service';
import { PersonalService } from '../personal/personal.service';

@Injectable()
export class AgendaService {
    constructor(
        @InjectRepository(Agenda)
        private readonly agendaRepository: Repository<Agenda>,
        @Inject(forwardRef(() => ChatbotService))
        private readonly chatbotService: ChatbotService,
        private readonly personalService: PersonalService,
    ) { }

    async enviarRecordatoriosManana(): Promise<{ success: boolean; message: string; enviados: number; fallidos: number }> {
        // Calculate tomorrow's date string (YYYY-MM-DD)
        const manana = new Date();
        manana.setDate(manana.getDate() + 1);
        const year = manana.getFullYear();
        const month = String(manana.getMonth() + 1).padStart(2, '0');
        const day = String(manana.getDate()).padStart(2, '0');
        const fechaManana = `${year}-${month}-${day}`;

        // Find all appointments for tomorrow
        const citasManana = await this.findAll(fechaManana, undefined, undefined);

        // Si no hay ninguna cita para mañana, retornar mensaje informativo (sin WhatsApp)
        if (citasManana.length === 0) {
            console.log(`[AgendaService] No hay citas para mañana (${fechaManana}).`);
            return {
                success: true,
                message: `No hay pacientes agendados para mañana (${fechaManana}). La agenda está libre.`,
                enviados: 0,
                fallidos: 0
            };
        }

        // El usuario solo quiere mandar a los que están "agendado". Los que están "confirmado" o en "sala de espera" no reciben mensaje.
        const citasParaRecordar = citasManana.filter(cita => {
            const tieneCelular = (cita.paciente?.telefono_celular);
            return cita.estado === 'agendado' && tieneCelular && !cita.recordatorioEnviado;
        });

        const ignoradas = citasManana.length - citasParaRecordar.length;
        console.log(`[AgendaService] Citas mañana: ${citasManana.length}. Filtradas a 'agendado'+sin_enviar+celular: ${citasParaRecordar.length} (Ignoradas: ${ignoradas})`);

        let enviados = 0;
        let fallidos = 0;

        for (const cita of citasParaRecordar) {
            let p: any = null;
            try {
                p = cita.paciente;
                if (!p) continue;

                // Remove all non-digit characters to prevent Baileys connection hangs on "+" or spaces
                let celular = (p.telefono_celular || p.celular || '').replace(/\D/g, '');

                // Automatically prepend country code 591 if it's a standard Bolivian length missing it
                if (celular.length === 8 && /^[67]/.test(celular)) {
                    celular = '591' + celular;
                }

                const jid = `${celular}@s.whatsapp.net`;
                const horaStr = cita.hora ? cita.hora.substring(0, 5) : 'la hora acordada';
                const nombrePaciente = p.nombre;
                const nomClinica = 'CENTRO DENTAL A&A';

                const mensaje = `Hola *${nombrePaciente}*, ${nomClinica} te recuerda que tienes una cita mañana a las *${horaStr}*.\n\n📌 Hola, somos ${nomClinica}, por favor guarda nuestro número para recibir tus recordatorios.`;

                await this.chatbotService.sendAgendaMenu(
                    jid,
                    mensaje,
                    cita.id
                );

                // Marcar como enviado en la base de datos
                await this.agendaRepository.update(cita.id, { recordatorioEnviado: true });

                enviados++;
            } catch (error) {
                console.error(`Error enviando recordatorio a ${p?.telefono_celular || p?.celular || 'sin numero'}:`, error);
                fallidos++;
            }
        }

        return {
            success: true,
            message: `Proceso completado. Enviados: ${enviados}, Fallidos: ${fallidos}`,
            enviados,
            fallidos
        };
    }

    async enviarRecordatorioIndividual(id: number): Promise<{ success: boolean; message: string }> {
        const cita = await this.findOne(id);
        const p: any = cita.paciente;

        if (!p) {
            throw new BadRequestException('La cita no tiene un paciente asociado.');
        }

        let celular = (p.telefono_celular || p.celular || '').replace(/\D/g, '');
        if (!celular) {
            throw new BadRequestException('El paciente no tiene un número de celular registrado.');
        }

        // Automatically prepend country code 591 if it's a Bolivian number missing it
        if (celular.length === 8 && /^[67]/.test(celular)) {
            celular = '591' + celular;
        }

        const jid = `${celular}@s.whatsapp.net`;
        const horaStr = cita.hora ? cita.hora.substring(0, 5) : 'la hora acordada';
        const nombrePaciente = p.nombre;
        const nomClinica = 'CENTRO DENTAL A&A';

        // Calculate relative date text (today, tomorrow, or specific date)
        const hoy = new Date();
        const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

        const manana = new Date();
        manana.setDate(manana.getDate() + 1);
        const tomorrowStr = `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, '0')}-${String(manana.getDate()).padStart(2, '0')}`;

        let fechaRelativa = '';
        if (cita.fecha === hoyStr) {
            fechaRelativa = 'hoy';
        } else if (cita.fecha === tomorrowStr) {
            fechaRelativa = 'mañana';
        } else {
            const [y, m, d] = cita.fecha.split('-');
            fechaRelativa = `el día ${d}/${m}/${y}`;
        }

        const mensaje = `Hola *${nombrePaciente}*, ${nomClinica} te recuerda que tienes una cita ${fechaRelativa} a las *${horaStr}*.`;

        try {
            await this.chatbotService.sendAgendaMenu(
                jid,
                mensaje,
                cita.id
            );

            // Marcar como enviado en la base de datos
            await this.agendaRepository.update(cita.id, { recordatorioEnviado: true });

            return {
                success: true,
                message: `Recordatorio enviado con éxito a ${nombrePaciente}.`
            };
        } catch (error) {
            console.error(`Error enviando recordatorio individual a ${p?.telefono_celular || p?.celular || 'sin numero'}:`, error);
            throw new InternalServerErrorException(`No se pudo enviar el recordatorio: ${error.message}`);
        }
    }

    /**
     * Notifica a todo el personal registrado (con celular) que no hay citas para el día dado.
     */
    private async notificarSinCitasAlPersonal(fechaManana: string): Promise<void> {
        try {
            const { data: personalList } = await this.personalService.findAll(undefined, 1, 200);
            const mensaje = `📅 *Aviso de Agenda*\n\nNo hay pacientes agendados para mañana *${fechaManana}*. La agenda del día está libre.`;

            for (const personal of personalList) {
                if (!personal.celular) continue;
                try {
                    let celular = personal.celular.replace(/\D/g, '');
                    if (celular.length === 8 && /^[67]/.test(celular)) {
                        celular = '591' + celular;
                    }
                    const jid = `${celular}@s.whatsapp.net`;
                    await this.chatbotService.sendMessage(jid, mensaje);
                    console.log(`[AgendaService] Aviso 'sin citas' enviado a personal: ${personal.nombre} (${jid})`);
                } catch (err) {
                    console.error(`[AgendaService] Error enviando aviso 'sin citas' a ${personal.nombre}:`, err);
                }
            }
        } catch (err) {
            console.error('[AgendaService] Error al notificar sin citas al personal:', err);
        }
    }

    async create(createDto: CreateAgendaDto): Promise<Agenda> {
        try {
            const cita = this.agendaRepository.create(createDto);
            return await this.agendaRepository.save(cita);
        } catch (error) {
            console.error('Error creating agenda:', error);
            const detail = `DB Error: ${error.message} | Code: ${error.code} | Detail: ${error.detail || 'None'}`;
            throw new BadRequestException(detail);
        }
    }

    async findAll(date?: string, fechaInicio?: string, fechaFinal?: string, pacienteId?: number, usuarioId?: number): Promise<Agenda[]> {
        const query = this.agendaRepository.createQueryBuilder('agenda')
            .leftJoinAndSelect('agenda.paciente', 'paciente')
            .leftJoinAndSelect('agenda.doctor', 'doctor')
            .leftJoinAndSelect('agenda.proforma', 'proforma')
            .leftJoinAndSelect('agenda.usuario', 'usuario')
            .where("agenda.estado != 'eliminado'"); // Filter out deleted

        if (date) {
            query.andWhere('agenda.fecha = :date', { date });
        }



        // Filter by date range (fecha)
        if (fechaInicio) {
            query.andWhere('agenda.fecha >= :fechaInicio', { fechaInicio });
        }
        if (fechaFinal) {
            query.andWhere('agenda.fecha <= :fechaFinal', { fechaFinal });
        }

        // Filter by patient
        if (pacienteId) {
            query.andWhere('agenda.pacienteId = :pacienteId', { pacienteId });
        }



        // Filter by user who created the appointment
        if (usuarioId) {
            query.andWhere('agenda.usuarioId = :usuarioId', { usuarioId });
        }

        query.orderBy('agenda.hora', 'ASC');

        return await query.getMany();
    }

    async findAllByPaciente(pacienteId: number): Promise<Agenda[]> {
        return await this.agendaRepository.find({
            where: { pacienteId } as any, // Return all history for this patient
            relations: {
                paciente: true,
                doctor: true,
                proforma: true,
                usuario: true
            },
            order: { fecha: 'DESC', hora: 'ASC' }
        });
    }



    async findOne(id: number): Promise<Agenda> {
        const cita = await this.agendaRepository.findOne({
            where: { id },
            relations: {
                paciente: true,
                doctor: true,
                proforma: true,
                usuario: true
            }
        });
        if (!cita) {
            throw new NotFoundException(`Cita #${id} not found`);
        }
        return cita;
    }

    async update(id: number, updateDto: UpdateAgendaDto): Promise<Agenda> {
        const cita = await this.findOne(id);

        // If relation IDs are being updated, we must clear the eager relationship object
        // to prevent TypeORM from ignoring the ID change in favor of the existing object.
        
        if (updateDto.pacienteId !== undefined && updateDto.pacienteId !== cita.pacienteId) {
            console.log(`[AgendaService] Patient change detected: ${cita.pacienteId} -> ${updateDto.pacienteId}. Clearing relation object.`);
            (cita as any).paciente = null;
        }



        if (updateDto.doctorId !== undefined && updateDto.doctorId !== cita.doctorId) {
            console.log(`[AgendaService] Doctor change detected: ${cita.doctorId} -> ${updateDto.doctorId}. Clearing relation object.`);
            (cita as any).doctor = null;
        }

        if (updateDto.proformaId !== undefined && updateDto.proformaId !== cita.proformaId) {
            console.log(`[AgendaService] Proforma change detected: ${cita.proformaId} -> ${updateDto.proformaId}. Clearing relation object.`);
            (cita as any).proforma = null;
        }

        this.agendaRepository.merge(cita, updateDto);
        const saved = await this.agendaRepository.save(cita);
        console.log(`[AgendaService] Appointment #${id} saved. New pacienteId:`, saved.pacienteId);
        return saved;
    }

    async remove(id: number, userId: number): Promise<void> {
        console.log(`Soft deleting agenda #${id} by user ${userId}`);
        // Use update() to explicitly set the columns, avoiding potential relation conflicts
        await this.agendaRepository.update(id, {
            estado: 'eliminado',
            usuarioId: userId
        });
        console.log(`Updated agenda #${id} via direct update query`);
    }

    async findAllByDoctor(doctorId: number): Promise<Agenda[]> {
        return await this.agendaRepository.find({
            where: { 
                doctorId, 
                estado: In(['agendado', 'confirmado', 'sala de espera'])
            } as any,
            relations: {
                paciente: true,
                doctor: true,
                proforma: true,
                usuario: true
            },
            order: { fecha: 'ASC', hora: 'ASC' }
        });
    }

    async deleteAll(): Promise<{ message: string; deletedCount: number }> {
        try {
            // Count records before deletion
            const count = await this.agendaRepository.count();

            // Delete all records using TRUNCATE which also resets the sequence
            await this.agendaRepository.query('TRUNCATE TABLE agenda RESTART IDENTITY CASCADE');

            return {
                message: `Todos los registros de la tabla Agenda han sido eliminados y el ID ha sido reiniciado`,
                deletedCount: count
            };
        } catch (error) {
            console.error('Error deleting all agenda records:', error);
            throw new InternalServerErrorException(`Error al eliminar registros: ${error.message}`);
        }
    }
}
