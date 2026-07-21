import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Propuesta } from './propuesta.entity';
import { Arancel } from '../../arancel/entities/arancel.entity';

@Entity('propuesta_detalle')
export class PropuestaDetalle {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    propuestaId: number;

    @ManyToOne(() => Propuesta, (propuesta) => propuesta.detalles, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'propuestaId' })
    propuesta: Propuesta;

    @Column({ type: 'varchar', length: 1, nullable: true })
    letra: string | null;

    @Column({ type: 'int' })
    arancelId: number;

    @ManyToOne(() => Arancel)
    @JoinColumn({ name: 'arancelId' })
    arancel: Arancel;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    precioUnitario: number;

    @Column({ type: 'text',  nullable: true })
    piezas: string;

    @Column({ type: 'int' })
    cantidad: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    total: number;

    @Column({ type: 'boolean',  default: false })
    posible: boolean;
}
