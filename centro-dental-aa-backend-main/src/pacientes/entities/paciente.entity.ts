import { Entity, Column, PrimaryGeneratedColumn, OneToOne, OneToMany, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { HistoriaClinica } from '../../historia_clinica/entities/historia_clinica.entity';
import { FichaClinica } from './ficha_clinica.entity';
import { User } from '../../users/entities/user.entity';
import { Seguro } from '../../seguro/entities/seguro.entity';

@Entity('pacientes')
export class Paciente {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'date', default: () => 'CURRENT_DATE' })
    fecha_ingreso: string;

    @Column({ type: 'text', nullable: true })
    paterno: string;

    @Column({ type: 'text', nullable: true })
    materno: string;

    @Column({ type: 'text', nullable: true })
    nombre: string;

    @Index()
    @Column({ type: 'date', nullable: true })
    fecha_nacimiento: string;

    @Column({ type: 'text', nullable: true })
    genero: string;

    @Column({ type: 'text', nullable: true })
    ci: string;

    @Column({ type: 'text', nullable: true })
    ci_extension: string;

    @Column({ type: 'text', nullable: true })
    direccion: string;

    @Column({ type: 'text', nullable: true })
    ocupacion: string;

    @Column({ type: 'text', nullable: true })
    telefono_celular: string;

    @Column({ type: 'text', nullable: true })
    email: string;

    @Column({ type: 'text', nullable: true })
    tutor_nombre: string;

    @Column({ type: 'text', nullable: true })
    tutor_ci: string;

    @Index()
    @Column({ type: 'text', default: 'activo' })
    estado: string;

    @Column({ type: 'text', default: 'Soltero' })
    estado_civil: string;

    @Column({ type: 'text', default: 'Ninguna' })
    grado_instruccion: string;



    @Column({ type: 'text', nullable: true })
    tutor_celular: string;

    @Column({ type: 'text', nullable: true })
    persona_brinda_informacion: string;

    @Column({ type: 'boolean', default: false })
    esta_firmado: boolean;

    @Column({ type: 'text', nullable: true })
    foto: string;

    @OneToOne(() => FichaClinica, (ficha) => ficha.paciente, { cascade: true, eager: false })
    fichaClinica: FichaClinica;

    @OneToMany(() => HistoriaClinica, (historia) => historia.paciente)
    historiaClinica: HistoriaClinica[];

    @Index()
    @Column({ type: 'int', nullable: true })
    usuarioId: number | null;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'usuarioId' })
    usuario: User;

    @Index()
    @Column({ type: 'int', nullable: true })
    seguroId: number | null;

    @ManyToOne(() => Seguro, { nullable: true })
    @JoinColumn({ name: 'seguroId' })
    seguro: Seguro | null;

    @OneToMany('Propuesta', (propuesta: any) => propuesta.paciente)
    propuestas: any[];

    @Column({ type: 'timestamp', default: () => "timezone('America/La_Paz', now())" })
    createdAt: Date;

    @Column({ type: 'timestamp', default: () => "timezone('America/La_Paz', now())", onUpdate: "timezone('America/La_Paz', now())" })
    updatedAt: Date;
}
