import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Laboratorio } from '../../laboratorios/entities/laboratorio.entity';
import { Paciente } from '../../pacientes/entities/paciente.entity';
import { PrecioLaboratorio } from '../../precios_laboratorios/entities/precio-laboratorio.entity';
import { Cubeta } from '../../cubetas/entities/cubeta.entity';
import { HistoriaClinica } from '../../historia_clinica/entities/historia_clinica.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';


@Entity('trabajos_laboratorios')
export class TrabajoLaboratorio {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    idLaboratorio: number;

    @ManyToOne(() => Laboratorio)
    @JoinColumn({ name: 'idLaboratorio' })
    laboratorio: Laboratorio;

    @Column({ type: 'int' })
    idPaciente: number;

    @ManyToOne(() => Paciente)
    @JoinColumn({ name: 'idPaciente' })
    paciente: Paciente;

    @Column({ type: 'int',  nullable: true })
    idHistoriaClinica: number;

    @ManyToOne(() => HistoriaClinica)
    @JoinColumn({ name: 'idHistoriaClinica' })
    historiaClinica: HistoriaClinica;

    @Column({ type: 'int' })
    idprecios_laboratorios: number;

    @ManyToOne(() => PrecioLaboratorio)
    @JoinColumn({ name: 'idprecios_laboratorios' })
    precioLaboratorio: PrecioLaboratorio;

    @Column({ type: 'date' })
    fecha: string;

    @Column({ type: 'text' })
    pieza: string;

    @Column({ type: 'int' })
    cantidad: number;

    @Column({ type: 'date' })
    fecha_pedido: string;

    @Column({ type: 'text' })
    color: string;

    @Column({ type: 'text',  default: 'no terminado' })
    estado: string;

    @Column({ type: 'date', nullable: true })
    fecha_terminado: string;

    @Column('text')
    observacion: string;

    @Column({ type: 'text',  default: 'no' })
    pagado: string;

    @Column('decimal', { precision: 10, scale: 2 })
    precio_unitario: number;

    @Column('decimal', { precision: 10, scale: 2 })
    total: number;

    @Column({ type: 'int',  nullable: true })
    idCubeta: number;

    @ManyToOne(() => Cubeta, { nullable: true })
    @JoinColumn({ name: 'idCubeta' })
    cubeta: Cubeta;

    

    

    @Column({ type: 'int',  nullable: true })
    idDoctor: number;

    @ManyToOne(() => Doctor, { nullable: true })
    @JoinColumn({ name: 'idDoctor' })
    doctor: Doctor;
}
