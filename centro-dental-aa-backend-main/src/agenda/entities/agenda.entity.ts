import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Paciente } from '../../pacientes/entities/paciente.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { Proforma } from '../../proformas/entities/proforma.entity';
import { User } from '../../users/entities/user.entity';
import { Personal } from '../../personal/entities/personal.entity';


@Entity('agenda')
export class Agenda {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({ type: 'date' })
    fecha: string;

    @Column({ type: 'time' })
    hora: string;

    @Column({ type: 'int' })
    duracion: number; // en minutos

    @Column({ type: 'int' })
    consultorio: number; // 1 - 4

    @Index()
    @Column({ type: 'int', nullable: true })
    pacienteId: number;

    @ManyToOne(() => Paciente, { nullable: true })
    @JoinColumn({ name: 'pacienteId' })
    paciente: Paciente;

    @Column({ type: 'int' })
    doctorId: number;

    @ManyToOne(() => Doctor)
    @JoinColumn({ name: 'doctorId' })
    doctor: Doctor;

    @Column({ type: 'int', nullable: true })
    proformaId: number;

    @ManyToOne(() => Proforma, { nullable: true })
    @JoinColumn({ name: 'proformaId' })
    proforma: Proforma;

    @Column({ type: 'text', nullable: true })
    tratamiento: string;

    @Column({ type: 'int' })
    usuarioId: number; // Quien agendó

    @ManyToOne(() => User)
    @JoinColumn({ name: 'usuarioId' })
    usuario: User;

    @Column({ name: 'fecha_agendado', type: 'timestamp', default: () => "timezone('America/La_Paz', now())" })
    fechaAgendado: Date;

    // Hora agendado is implicitly part of fecha_agendado timestamp, but if specific column needed:
    // We will rely on fechaAgendado being a full timestamp.

    @Index()
    @Column({ type: 'text', default: 'agendado' })
    estado: string;

    @Column({ type: 'text', nullable: true })
    motivoCancelacion: string;

    @Column({ type: 'boolean', default: false })
    recordatorioEnviado: boolean;

    @Column({ type: 'timestamp', default: () => "timezone('America/La_Paz', now())", onUpdate: "timezone('America/La_Paz', now())" })
    updatedAt: Date;
}
