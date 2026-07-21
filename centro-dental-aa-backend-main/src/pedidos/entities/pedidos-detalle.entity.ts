import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Pedidos } from './pedidos.entity';
import { Inventario } from '../../inventario/entities/inventario.entity';

@Entity('pedidos_detalle')
export class PedidosDetalle {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Pedidos, (pedido) => pedido.detalles, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'idpedidos' })
    pedido: Pedidos;

    @Column({ type: 'int' })
    idpedidos: number;

    @ManyToOne(() => Inventario, (inventario) => inventario.pedidosDetalle)
    @JoinColumn({ name: 'idinventario' })
    inventario: Inventario;

    @Column({ type: 'int' })
    idinventario: number;

    @Column('int')
    cantidad: number;

    @Column('decimal', { precision: 10, scale: 2 })
    precio_unitario: number;

    @Column({ type: 'text' })
    fecha_vencimiento: string;

    @Column('int', { default: 0 })
    cantidad_restante: number;
}
