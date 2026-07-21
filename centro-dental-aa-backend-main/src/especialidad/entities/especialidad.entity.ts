import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Inventario } from '../../inventario/entities/inventario.entity';

@Entity('especialidad')
export class Especialidad {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'text' })
    especialidad: string;

    @Column({ type: 'text',  default: 'activo' })
    estado: string;

    @OneToMany(() => Inventario, (inventario) => inventario.especialidad)
    inventarios: Inventario[];
}
