import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Especialidad } from '../../especialidad/entities/especialidad.entity';

@Entity()
export class Doctor {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'text',  nullable: true })
    access_id: string;

    @Column({ type: 'text' })
    paterno: string;

    @Column({ type: 'text' })
    materno: string;

    @Column({ type: 'text' })
    nombre: string;

    @Column({ type: 'text' })
    celular: string;

    @Column({ type: 'text' })
    direccion: string;

    @Column({ type: 'text',  default: 'activo' })
    estado: string;

    @Column({ type: 'int',  nullable: true })
    idEspecialidad: number;

    @ManyToOne(() => Especialidad)
    @JoinColumn({ name: 'idEspecialidad' })
    especialidad: Especialidad;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
