import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Personal } from '../../personal/entities/personal.entity';

@Entity('vacaciones')
export class Vacacion {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    idpersonal: number;

    @ManyToOne(() => Personal, { eager: true })
    @JoinColumn({ name: 'idpersonal' })
    personal: Personal;

    @Column({ type: 'date', default: () => 'CURRENT_DATE' })
    fecha: string;

    @Column({ type: 'text' })
    tipo_solicitud: string;

    @Column('int')
    cantidad_dias: number;

    @Column({ type: 'date' })
    fecha_desde: string;

    @Column({ type: 'date' })
    fecha_hasta: string;

    @Column({ type: 'text',  default: 'NO' })
    autorizado: string;

    @Column({ type: 'text', nullable: true })
    observaciones: string;

    @Column({ type: 'text',  default: 'activo' })
    estado: string;
}
