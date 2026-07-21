import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('seguro')
export class Seguro {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'text' })
    nombre: string;

    @Column({ type: 'text' })
    color: string;

    @Column({ type: 'text', default: 'activo' })
    estado: string;

    @Column({ type: 'text', nullable: true })
    nit: string;

    @Column({ type: 'text', nullable: true })
    direccion: string;

    @Column({ type: 'text', nullable: true })
    telefono: string;

    @Column({ type: 'text', nullable: true })
    email: string;

    @Column({ type: 'text', nullable: true })
    contacto_nombre: string;
}
