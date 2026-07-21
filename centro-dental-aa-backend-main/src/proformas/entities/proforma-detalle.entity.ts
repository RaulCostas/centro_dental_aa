import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Proforma } from './proforma.entity';
import { Arancel } from '../../arancel/entities/arancel.entity';

@Entity('proforma_detalle')
export class ProformaDetalle {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    proformaId: number;

    @ManyToOne(() => Proforma, (proforma) => proforma.detalles, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'proformaId' })
    proforma: Proforma;

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

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    descuento: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    total: number;

    @Column({ type: 'boolean',  default: false })
    posible: boolean;
}
