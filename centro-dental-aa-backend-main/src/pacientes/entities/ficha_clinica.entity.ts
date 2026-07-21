import { Entity, Column, PrimaryGeneratedColumn, OneToOne, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Paciente } from './paciente.entity';
import { User } from '../../users/entities/user.entity';

@Entity('ficha_clinica')
export class FichaClinica {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    pacienteId: number;

    @OneToOne(() => Paciente, (paciente) => paciente.fichaClinica, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'pacienteId' })
    paciente: Paciente;

    // --- MOTIVO DE CONSULTA ---
    @Column({ type: 'text', nullable: true })
    motivo_consulta: string;

    // --- ANTECEDENTES FAMILIARES ---
    @Column({ type: 'text', nullable: true })
    ant_pat_familiares: string;

    // --- ANTECEDENTES PERSONALES PATOLOGICOS (Checkboxes) ---
    @Column({ type: 'boolean', default: false })
    ant_pat_anemia: boolean;

    @Column({ type: 'boolean', default: false })
    ant_pat_cardiopatias: boolean;

    @Column({ type: 'boolean', default: false })
    ant_pat_gastricas: boolean;

    @Column({ type: 'boolean', default: false })
    ant_pat_hepatitis: boolean;

    @Column({ type: 'boolean', default: false })
    ant_pat_tuberculosis: boolean;

    @Column({ type: 'boolean', default: false })
    ant_pat_asma: boolean;

    @Column({ type: 'boolean', default: false })
    ant_pat_diabetes: boolean;

    @Column({ type: 'boolean', default: false })
    ant_pat_epilepsia: boolean;

    @Column({ type: 'boolean', default: false })
    ant_pat_hipertension: boolean;

    @Column({ type: 'boolean', default: false })
    ant_pat_vih: boolean;

    @Column({ type: 'boolean', default: false })
    ant_pat_ninguno: boolean;

    // --- CIRUGIA ---
    @Column({ type: 'boolean', default: false })
    ant_pat_cirugia: boolean;

    @Column({ type: 'text', nullable: true })
    ant_pat_cirugia_detalle: string;

    // --- OTROS Y ALERGIAS ---
    @Column({ type: 'text', nullable: true })
    ant_pat_otros: string;

    @Column({ type: 'boolean', default: false })
    ant_pat_alergias: boolean;

    @Column({ type: 'text', nullable: true })
    ant_pat_alergias_detalle: string;

    // --- EMBARAZO ---
    @Column({ type: 'boolean', default: false })
    ant_pat_embarazo: boolean;

    @Column({ type: 'int', nullable: true })
    ant_pat_embarazo_semanas: number | null;

    // --- TRATAMIENTO MEDICO Y MEDICAMENTOS ---
    @Column({ type: 'boolean', default: false })
    ant_pat_tratamiento_medico: boolean;

    @Column({ type: 'text', nullable: true })
    ant_pat_tratamiento_medico_detalle: string;

    @Column({ type: 'boolean', default: false })
    ant_pat_toma_medicamentos: boolean;

    @Column({ type: 'text', nullable: true })
    ant_pat_toma_medicamentos_detalle: string;

    // --- HEMORRAGIAS ---
    @Column({ type: 'boolean', default: false })
    ant_pat_hemorragias: boolean;

    @Column({ type: 'varchar', length: 50, nullable: true })
    ant_pat_hemorragias_tipo: string;

    // --- EXAMEN EXTRA ORAL ---
    @Column({ type: 'text', nullable: true })
    exam_extra_atm: string;

    @Column({ type: 'text', nullable: true })
    exam_extra_ganglios: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    exam_extra_respirador: string;

    @Column({ type: 'text', nullable: true })
    exam_extra_otros: string;

    // --- EXAMEN INTRA ORAL ---
    @Column({ type: 'text', nullable: true })
    exam_intra_labios: string;

    @Column({ type: 'text', nullable: true })
    exam_intra_lengua: string;

    @Column({ type: 'text', nullable: true })
    exam_intra_paladar: string;

    @Column({ type: 'text', nullable: true })
    exam_intra_piso_boca: string;

    @Column({ type: 'text', nullable: true })
    exam_intra_mucosa_yugal: string;

    @Column({ type: 'text', nullable: true })
    exam_intra_encias: string;

    @Column({ type: 'boolean', default: false })
    exam_intra_protesis: boolean;

    // --- ANTECEDENTES BUCODENTALES ---
    @Column({ type: 'varchar', length: 100, nullable: true })
    ant_buco_ultima_visita: string;

    @Column({ type: 'boolean', default: false })
    habito_fuma: boolean;

    @Column({ type: 'boolean', default: false })
    habito_bebe: boolean;

    @Column({ type: 'text', nullable: true })
    habito_otros: string;

    // --- HIGIENE ORAL ---
    @Column({ type: 'boolean', default: false })
    hig_cepillo: boolean;

    @Column({ type: 'boolean', default: false })
    hig_hilo: boolean;

    @Column({ type: 'boolean', default: false })
    hig_enjuague: boolean;

    @Column({ type: 'boolean', default: false })
    hig_waterpik: boolean;

    @Column({ type: 'varchar', length: 100, nullable: true })
    hig_frecuencia_cepillado: string;

    @Column({ type: 'boolean', default: false })
    hig_sangrado_encias: boolean;

    @Column({ type: 'varchar', length: 50, nullable: true })
    hig_bucal_estado: string;

    // --- OBSERVACIONES FICHA ---
    @Column({ type: 'text', nullable: true })
    observaciones_ficha: string;

    // --- AUDITORIA ---
    @Column({ type: 'int', nullable: true })
    usuarioId: number | null;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'usuarioId' })
    usuario: User;

    @CreateDateColumn({ type: 'timestamp', default: () => "timezone('America/La_Paz', now())" })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp', default: () => "timezone('America/La_Paz', now())", onUpdate: "timezone('America/La_Paz', now())" })
    updatedAt: Date;
}
