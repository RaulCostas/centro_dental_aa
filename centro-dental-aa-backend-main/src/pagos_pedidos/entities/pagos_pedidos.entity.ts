import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
import { Pedidos } from '../../pedidos/entities/pedidos.entity';


@Entity('pagos_pedidos')
export class PagosPedidos {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'date' })
    fecha: Date;

    @OneToOne(() => Pedidos)
    @JoinColumn({ name: 'idPedido' })
    pedido: Pedidos;

    @Column({ type: 'int' })
    idPedido: number;

    @Column('decimal', { precision: 10, scale: 2 })
    monto: number;

    @Column({ type: 'text',  nullable: true })
    factura: string;

    @Column({ type: 'text',  nullable: true })
    recibo: string;

    @Column({ type: 'text' })
    forma_pago: string;

    

    
}
