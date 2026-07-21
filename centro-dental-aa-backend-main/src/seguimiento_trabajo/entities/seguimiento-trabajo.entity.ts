import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { TrabajoLaboratorio } from '../../trabajos_laboratorios/entities/trabajo_laboratorio.entity';

@Entity('seguimiento_trabajo')
export class SeguimientoTrabajo {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'text' })
    envio_retorno: string;

    @Column({ type: 'date' })
    fecha: string;

    @Column({ type: 'text', nullable: true })
    observaciones: string;

    @Column({ type: 'int' })
    trabajoLaboratorioId: number;

    @ManyToOne(() => TrabajoLaboratorio)
    @JoinColumn({ name: 'trabajoLaboratorioId' })
    trabajoLaboratorio: TrabajoLaboratorio;
}
