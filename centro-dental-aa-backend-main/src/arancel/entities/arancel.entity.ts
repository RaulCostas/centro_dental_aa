import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Especialidad } from '../../especialidad/entities/especialidad.entity';

@Entity('arancel')
export class Arancel {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'text' })
    detalle: string;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    precio: number;

    @Column({ type: 'varchar', length: 10, nullable: false })
    moneda: string;

    @Column({ type: 'text', default: 'activo' })
    estado: string;

    @Column({ type: 'int' })
    idEspecialidad: number;

    @ManyToOne(() => Especialidad)
    @JoinColumn({ name: 'idEspecialidad' })
    especialidad: Especialidad;

    @Column({ type: 'varchar', length: 10, nullable: true })
    odontogramaColor: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    odontogramaFigura: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
