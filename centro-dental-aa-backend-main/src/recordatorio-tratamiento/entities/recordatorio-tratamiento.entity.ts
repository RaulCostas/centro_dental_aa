import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { HistoriaClinica } from '../../historia_clinica/entities/historia_clinica.entity';

@Entity('recordatorio_tratamientos')
export class RecordatorioTratamiento {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    historiaClinicaId: number;

    @ManyToOne(() => HistoriaClinica)
    @JoinColumn({ name: 'historiaClinicaId' })
    historiaClinica: HistoriaClinica;

    @Index()
    @Column({ type: 'date' })
    fechaRecordatorio: string;

    @Column({ type: 'text', nullable: true })
    mensaje: string;

    @Column({ type: 'int' })
    dias: number;

    @Index()
    @Column({ type: 'enum', enum: ['pendiente', 'completado', 'cancelado', 'archivado'], default: 'pendiente' })
    estado: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
