import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('forma_pago')
export class FormaPago {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'text' })
    forma_pago: string;

    @Column({ type: 'text',  default: 'activo' })
    estado: string;
}
