import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany, OneToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Paciente } from '../../pacientes/entities/paciente.entity';
import { User } from '../../users/entities/user.entity';
import { ProformaDetalle } from './proforma-detalle.entity';
import { ProformaImagen } from './proforma-imagen.entity';
import { Pago } from '../../pagos/entities/pago.entity';
import { RecordatorioPlan } from '../../recordatorio_plan/entities/recordatorio-plan.entity';

// import { SecuenciaTratamiento } from '../../secuencia_tratamiento/entities/secuencia_tratamiento.entity';

@Entity('proformas')
export class Proforma {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    pacienteId: number;

    @ManyToOne(() => Paciente)
    @JoinColumn({ name: 'pacienteId' })
    paciente: Paciente;

    @Column({ type: 'int' })
    numero: number;

    @Column({ type: 'date', default: () => 'CURRENT_DATE' })
    fecha: string;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    total: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    sub_total: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    descuento: number;

    @Column({ type: 'varchar', default: 'Bs' })
    moneda: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
    tipoCambio: number;

    @Column({ type: 'text', nullable: true })
    nota: string;

    @Column({ type: 'int' })
    usuarioId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'usuarioId' })
    usuario: User;

    @Column({ type: 'jsonb', nullable: true })
    odontograma_mapa: any;

    @Column({ type: 'jsonb', nullable: true })
    plan_pagos: any;

    @OneToMany(() => ProformaDetalle, (detalle) => detalle.proforma, { cascade: true })
    detalles: ProformaDetalle[];

    @OneToMany(() => ProformaImagen, (imagen) => imagen.proforma, { cascade: true })
    imagenes: ProformaImagen[];

    @OneToMany(() => Pago, (pago) => pago.proforma)
    pagos: Pago[];

    @OneToMany(() => RecordatorioPlan, (recordatorio) => recordatorio.proforma)
    recordatorios: RecordatorioPlan[];

    @Column({ type: 'boolean', default: false })
    esta_firmado: boolean;

    @Column({ type: 'timestamp', default: () => "timezone('America/La_Paz', now())" })
    createdAt: Date;

    @Column({ type: 'timestamp', default: () => "timezone('America/La_Paz', now())", onUpdate: "timezone('America/La_Paz', now())" })
    updatedAt: Date;
}
