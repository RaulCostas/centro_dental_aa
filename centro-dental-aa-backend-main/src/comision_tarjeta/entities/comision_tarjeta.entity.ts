import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('comision_tarjeta')
export class ComisionTarjeta {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'text',  name: 'red_banco' })
    redBanco: string;

    @Column('decimal', { precision: 10, scale: 2 })
    monto: number;

    @Column({ type: 'text',  default: 'activo' })
    estado: string;
}
