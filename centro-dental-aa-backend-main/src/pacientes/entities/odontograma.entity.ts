import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Paciente } from './paciente.entity';
import { User } from '../../users/entities/user.entity';

@Entity('odontogramas')
export class Odontograma {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int', nullable: true })
    pacienteId: number | null;

    @ManyToOne(() => Paciente, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'pacienteId' })
    paciente: Paciente;

    @Column({ type: 'text', nullable: true })
    notas: string;

    @Column({ type: 'jsonb', nullable: true })
    mapa_dientes: any; // Object mapping tooth key (e.g. "11") to state { state: 0-9, surfaces: {O: bool, M: bool, ...} }

    @Column({ type: 'timestamp', default: () => "timezone('America/La_Paz', now())" })
    fecha: Date;

    @Column({ type: 'int', nullable: true })
    usuarioId: number | null; // Who created it

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'usuarioId' })
    usuario: User;
}
