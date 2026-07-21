import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Paciente } from '../../pacientes/entities/paciente.entity';

@Entity('estudios_complementarios')
export class EstudioComplementario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  pacienteId: number;

  @ManyToOne(() => Paciente, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pacienteId' })
  paciente: Paciente;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'text' })
  tipo_estudio: string;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({ type: 'text', nullable: true })
  archivo_url: string;

  @CreateDateColumn({ type: 'timestamp', default: () => "timezone('America/La_Paz', now())" })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => "timezone('America/La_Paz', now())", onUpdate: "timezone('America/La_Paz', now())" })
  updatedAt: Date;
}
