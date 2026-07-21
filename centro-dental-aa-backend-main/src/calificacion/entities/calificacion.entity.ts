import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Personal } from '../../personal/entities/personal.entity';
import { Paciente } from '../../pacientes/entities/paciente.entity';
import { User } from '../../users/entities/user.entity';

@Entity('calificacion')
export class Calificacion {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    personalId: number;

    @ManyToOne(() => Personal)
    @JoinColumn({ name: 'personalId' })
    personal: Personal;

    @Column({ type: 'int' })
    pacienteId: number;

    @ManyToOne(() => Paciente)
    @JoinColumn({ name: 'pacienteId' })
    paciente: Paciente;

    @Column({ type: 'int' })
    consultorio: number;

    @Column({ type: 'text' })
    calificacion: string; // 'Malo', 'Regular', 'Bueno'

    @Column({ type: 'date' })
    fecha: Date;

    @Column({ type: 'text', nullable: true })
    observaciones: string;

    @Column({ type: 'int' })
    evaluadorId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'evaluadorId' })
    evaluador: User;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
