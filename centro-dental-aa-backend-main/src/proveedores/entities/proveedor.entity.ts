import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Pedidos } from '../../pedidos/entities/pedidos.entity';

@Entity('proveedores')
export class Proveedor {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'text' })
    proveedor: string;

    @Column({ type: 'text' })
    celular: string;

    @Column({ type: 'text' })
    direccion: string;

    @Column({ type: 'text' })
    email: string;

    @Column({ type: 'text' })
    nombre_contacto: string;

    @Column({ type: 'text' })
    celular_contacto: string;

    @Column({ type: 'text',  default: 'activo' })
    estado: string;

    @OneToMany(() => Pedidos, (pedido) => pedido.proveedor)
    pedidos: Pedidos[];
}
