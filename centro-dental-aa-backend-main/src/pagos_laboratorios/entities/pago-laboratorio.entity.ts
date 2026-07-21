import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
import { TrabajoLaboratorio } from '../../trabajos_laboratorios/entities/trabajo_laboratorio.entity';
import { FormaPago } from '../../forma_pago/entities/forma_pago.entity';


@Entity('pagos_laboratorios')
export class PagoLaboratorio {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'date' })
    fecha: string;

    @Column({ type: 'int' })
    idTrabajos_Laboratorios: number;

    @OneToOne(() => TrabajoLaboratorio)
    @JoinColumn({ name: 'idTrabajos_Laboratorios' })
    trabajoLaboratorio: TrabajoLaboratorio;

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    monto: number;

    @Column({ type: 'text' })
    moneda: string;

    @Column({ type: 'int' })
    idforma_pago: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    tc: number;

    @ManyToOne(() => FormaPago)
    @JoinColumn({ name: 'idforma_pago' })
    formaPago: FormaPago;

    

    
}
