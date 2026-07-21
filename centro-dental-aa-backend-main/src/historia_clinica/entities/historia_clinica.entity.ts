import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { Paciente } from '../../pacientes/entities/paciente.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { Especialidad } from '../../especialidad/entities/especialidad.entity';
import { Proforma } from '../../proformas/entities/proforma.entity';
import { ProformaDetalle } from '../../proformas/entities/proforma-detalle.entity';
import { PagosDetalleDoctores } from '../../pagos_doctores/entities/pagos-detalle-doctores.entity';
import { User } from '../../users/entities/user.entity';


@Entity('historia_clinica')
export class HistoriaClinica {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({ type: 'int' })
    pacienteId: number;

    @ManyToOne(() => Paciente)
    @JoinColumn({ name: 'pacienteId' })
    paciente: Paciente;

    @Index()
    @Column({ type: 'date' })
    fecha: Date;

    @Column({ type: 'text',  nullable: true })
    pieza: string;

    @Column({ type: 'int', default: 1 })
    cantidad: number;

    @Column({ type: 'int',  nullable: true })
    proformaDetalleId: number;

    @ManyToOne(() => ProformaDetalle, { nullable: true })
    @JoinColumn({ name: 'proformaDetalleId' })
    proformaDetalle: ProformaDetalle;

    @Column({ type: 'text', nullable: true })
    observaciones: string;

    @Column({ type: 'int',  nullable: true })
    especialidadId: number;

    @ManyToOne(() => Especialidad, { nullable: true })
    @JoinColumn({ name: 'especialidadId' })
    especialidad: Especialidad;

    @Column({ type: 'int',  nullable: true })
    doctorId: number;

    @ManyToOne(() => Doctor, { nullable: true })
    @JoinColumn({ name: 'doctorId' })
    doctor: Doctor;

    @Column({ type: 'text', nullable: true })
    diagnostico: string;

    @Column({ type: 'text',  default: 'no terminado' })
    estadoTratamiento: string; // 'terminado' | 'no terminado'

    @Column({ type: 'text',  default: 'no terminado' })
    estadoPresupuesto: string; // 'terminado' | 'no terminado'

    @Index()
    @Column({ type: 'int',  nullable: true })
    proformaId: number;

    @ManyToOne(() => Proforma, { nullable: true })
    @JoinColumn({ name: 'proformaId' })
    proforma: Proforma;

    @Column({ type: 'text',  nullable: true })
    tratamiento: string;

    @Column({ type: 'boolean',  default: false, name: 'Caso_Clinico' })
    casoClinico: boolean;


    @Column({ type: 'text',  default: 'NO' })
    pagado: string; // 'SI' | 'NO'

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    precio: number;

    @Column({ type: 'text', nullable: true })
    firmaPaciente: string;

    @OneToMany(() => PagosDetalleDoctores, (detalle) => detalle.historiaClinica)
    pagosDetalleDoctores: PagosDetalleDoctores[];

    @Column({ type: 'int', nullable: true })
    usuarioId: number | null;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'usuarioId' })
    usuario: User;

    @Column({ type: 'timestamp', default: () => "timezone('America/La_Paz', now())" })
    createdAt: Date;
 
    @Column({ type: 'timestamp', default: () => "timezone('America/La_Paz', now())", onUpdate: "timezone('America/La_Paz', now())" })
    updatedAt: Date;
}
