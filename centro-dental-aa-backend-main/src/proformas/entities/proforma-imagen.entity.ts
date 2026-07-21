import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Proforma } from './proforma.entity';

@Entity('proformas_imagenes')
export class ProformaImagen {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int', nullable: true })
    proformaId: number | null;

    @ManyToOne(() => Proforma, (proforma) => proforma.imagenes, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'proformaId' })
    proforma: Proforma | null;

    @Column({ type: 'int', nullable: true })
    pacienteId: number | null;

    @Column({ type: 'text' })
    nombre_archivo: string;

    @Column({ type: 'text' })
    ruta: string;

    @Column({ type: 'text',  nullable: true })
    descripcion: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    fecha_creacion: Date;
}
