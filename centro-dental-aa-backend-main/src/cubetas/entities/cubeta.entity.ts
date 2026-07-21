import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cubetas')
export class Cubeta {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'text' })
    codigo: string;

    @Column({ type: 'text' })
    descripcion: string;

    @Column({ type: 'text' })
    dentro_fuera: string; // 'DENTRO' | 'FUERA'

    @Column({ type: 'text',  default: 'activo' })
    estado: string; // 'activo' | 'inactivo'

    
}
