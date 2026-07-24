import { IsString, IsOptional, IsDateString, IsBoolean, ValidateIf, IsNumber } from 'class-validator';

export class CreatePacienteDto {
    @IsDateString()
    @IsOptional()
    fecha_ingreso?: string;

    @IsString()
    @IsOptional()
    @ValidateIf((o, v) => v != null)
    paterno?: string;

    @IsString()
    @IsOptional()
    @ValidateIf((o, v) => v != null)
    materno?: string;

    @IsString()
    @IsOptional()
    @ValidateIf((o, v) => v != null)
    nombre?: string;

    @IsDateString()
    @IsOptional()
    @ValidateIf((o, v) => v != null)
    fecha_nacimiento?: string;

    @IsString()
    @IsOptional()
    @ValidateIf((o, v) => v != null)
    genero?: string;

    @IsString()
    @IsOptional()
    @ValidateIf((o, v) => v != null)
    ci?: string;

    @IsString()
    @IsOptional()
    @ValidateIf((o, v) => v != null)
    direccion?: string;

    @IsString()
    @IsOptional()
    @ValidateIf((o, v) => v != null)
    ocupacion?: string;

    @IsString()
    @IsOptional()
    @ValidateIf((o, v) => v != null)
    telefono_celular?: string;

    @IsString()
    @IsOptional()
    @ValidateIf((o, v) => v != null)
    email?: string;

    @IsString()
    @IsOptional()
    tutor_nombre?: string;

    @IsString()
    @IsOptional()
    tutor_ci?: string;

    @IsString()
    @IsOptional()
    estado?: string;

    // =====================
    // --- FICHA CLÍNICA ---
    // =====================
    @IsString()
    @IsOptional()
    motivo_consulta?: string;

    @IsString()
    @IsOptional()
    ant_pat_familiares?: string;

    @IsBoolean()
    @IsOptional()
    ant_pat_anemia?: boolean;

    @IsBoolean()
    @IsOptional()
    ant_pat_cardiopatias?: boolean;

    @IsBoolean()
    @IsOptional()
    ant_pat_gastricas?: boolean;

    @IsBoolean()
    @IsOptional()
    ant_pat_hepatitis?: boolean;

    @IsBoolean()
    @IsOptional()
    ant_pat_tuberculosis?: boolean;

    @IsBoolean()
    @IsOptional()
    ant_pat_asma?: boolean;

    @IsBoolean()
    @IsOptional()
    ant_pat_diabetes?: boolean;

    @IsBoolean()
    @IsOptional()
    ant_pat_epilepsia?: boolean;

    @IsBoolean()
    @IsOptional()
    ant_pat_hipertension?: boolean;

    @IsBoolean()
    @IsOptional()
    ant_pat_vih?: boolean;

    @IsBoolean()
    @IsOptional()
    ant_pat_ninguno?: boolean;

    @IsBoolean()
    @IsOptional()
    ant_pat_cirugia?: boolean;

    @IsString()
    @IsOptional()
    ant_pat_cirugia_detalle?: string;

    @IsString()
    @IsOptional()
    ant_pat_otros?: string;

    @IsBoolean()
    @IsOptional()
    ant_pat_alergias?: boolean;

    @IsString()
    @IsOptional()
    ant_pat_alergias_detalle?: string;

    @IsBoolean()
    @IsOptional()
    ant_pat_embarazo?: boolean;

    @IsNumber()
    @IsOptional()
    ant_pat_embarazo_semanas?: number;

    @IsBoolean()
    @IsOptional()
    ant_pat_tratamiento_medico?: boolean;

    @IsString()
    @IsOptional()
    ant_pat_tratamiento_medico_detalle?: string;

    @IsBoolean()
    @IsOptional()
    ant_pat_toma_medicamentos?: boolean;

    @IsString()
    @IsOptional()
    ant_pat_toma_medicamentos_detalle?: string;

    @IsBoolean()
    @IsOptional()
    ant_pat_hemorragias?: boolean;

    @IsString()
    @IsOptional()
    ant_pat_hemorragias_tipo?: string;

    @IsString()
    @IsOptional()
    exam_extra_atm?: string;

    @IsString()
    @IsOptional()
    exam_extra_ganglios?: string;

    @IsString()
    @IsOptional()
    exam_extra_respirador?: string;

    @IsString()
    @IsOptional()
    exam_extra_otros?: string;

    @IsString()
    @IsOptional()
    exam_intra_labios?: string;

    @IsString()
    @IsOptional()
    exam_intra_lengua?: string;

    @IsString()
    @IsOptional()
    exam_intra_paladar?: string;

    @IsString()
    @IsOptional()
    exam_intra_piso_boca?: string;

    @IsString()
    @IsOptional()
    exam_intra_mucosa_yugal?: string;

    @IsString()
    @IsOptional()
    exam_intra_encias?: string;

    @IsBoolean()
    @IsOptional()
    exam_intra_protesis?: boolean;

    @IsString()
    @IsOptional()
    ant_buco_ultima_visita?: string;

    @IsBoolean()
    @IsOptional()
    habito_fuma?: boolean;

    @IsBoolean()
    @IsOptional()
    habito_bebe?: boolean;

    @IsString()
    @IsOptional()
    habito_otros?: string;

    @IsBoolean()
    @IsOptional()
    hig_cepillo?: boolean;

    @IsBoolean()
    @IsOptional()
    hig_hilo?: boolean;

    @IsBoolean()
    @IsOptional()
    hig_enjuague?: boolean;

    @IsBoolean()
    @IsOptional()
    hig_waterpik?: boolean;

    @IsString()
    @IsOptional()
    hig_frecuencia_cepillado?: string;

    @IsBoolean()
    @IsOptional()
    hig_sangrado_encias?: boolean;

    @IsString()
    @IsOptional()
    hig_bucal_estado?: string;

    @IsString()
    @IsOptional()
    observaciones_ficha?: string;

    @IsString()
    @IsOptional()
    particularidad?: string;

    @IsString()
    @IsOptional()
    estado_civil?: string;

    @IsString()
    @IsOptional()
    grado_instruccion?: string;


    @IsString()
    @IsOptional()
    tutor_celular?: string;

    @IsString()
    @IsOptional()
    persona_brinda_informacion?: string;

    @IsNumber()
    @IsOptional()
    @ValidateIf((o, v) => v != null)
    usuarioId?: number;

    @IsNumber()
    @IsOptional()
    @ValidateIf((o, v) => v != null)
    seguroId?: number;

    @IsString()
    @IsOptional()
    ci_extension?: string;

    @IsString()
    @IsOptional()
    foto?: string;
}
