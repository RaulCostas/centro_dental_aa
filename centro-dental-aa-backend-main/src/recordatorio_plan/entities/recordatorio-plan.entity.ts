import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Proforma } from '../../proformas/entities/proforma.entity';

@Entity('recordatorio_plan')
export class RecordatorioPlan {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    proformaId: number;

    @ManyToOne(() => Proforma)
    @JoinColumn({ name: 'proformaId' })
    proforma: Proforma;

    @Index()
    @Column({ type: 'date' })
    fechaRecordatorio: string;

    @Column({ type: 'int' })
    dias: number;

    @Column({ type: 'text', nullable: true })
    mensaje: string;

    @Index()
    @Column({ type: 'text',  default: 'activo' })
    estado: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
