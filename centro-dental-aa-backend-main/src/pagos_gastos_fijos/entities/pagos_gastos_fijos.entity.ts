import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { GastosFijos } from '../../gastos_fijos/entities/gastos_fijos.entity';
import { FormaPago } from '../../forma_pago/entities/forma_pago.entity';


@Entity('pagos_gastos_fijos')
export class PagosGastosFijos {
    @PrimaryGeneratedColumn()
    id: number;

    

    @ManyToOne(() => GastosFijos)
    @JoinColumn({ name: 'gasto_fijo_id' })
    gastoFijo: GastosFijos;

    @Column({ type: 'date' })
    fecha: Date;

    @Column('decimal', { precision: 10, scale: 2 })
    monto: number;

    @Column({ type: 'text' })
    moneda: string; // 'Bolivianos' | 'Dólares'

    @ManyToOne(() => FormaPago)
    @JoinColumn({ name: 'forma_pago_id' })
    formaPago: FormaPago;

    @Column({ type: 'text',  nullable: true })
    observaciones: string;

    
}
