import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('laboratorios')
export class Laboratorio {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'text' })
    laboratorio: string;

    @Column({ type: 'text' })
    celular: string;

    @Column({ type: 'text' })
    telefono: string;

    @Column({ type: 'text' })
    direccion: string;

    @Column({ type: 'text' })
    email: string;

    @Column({ type: 'text' })
    banco: string;

    @Column({ type: 'text',  name: 'numero_cuenta' })
    numero_cuenta: string;

    @Column({ type: 'text' })
    estado: string;
}
