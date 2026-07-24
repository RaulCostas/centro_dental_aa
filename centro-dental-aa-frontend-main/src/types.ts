
export interface SeguimientoTrabajo {
    id: number;
    envio_retorno: 'Envio' | 'Retorno';
    fecha: string;
    observaciones: string;
    trabajoLaboratorioId: number;
}

export interface GrupoInventario {
    id: number;
    grupo: string;
    estado: string;
}

export interface RecordatorioTratamiento {
    id: number;
    historiaClinicaId: number;
    historiaClinica?: HistoriaClinica;
    fechaRecordatorio: string;
    mensaje: string;
    dias: number;
    estado: string;
    createdAt: string;
    updatedAt: string;
}

export interface RecordatorioPlan {
    id: number;
    proformaId: number;
    proforma?: Proforma;
    fechaRecordatorio: string;
    dias: number;
    mensaje: string;
    estado: string;
    createdAt: string;
    updatedAt: string;
}

export interface User {
    id: number;
    name: string;
    email: string;
    estado: string;
    password?: string; // Optional for list view
    foto?: string;
    permisos?: string[]; // Array of denied module IDs
}

export interface CreateUserDto {
    name: string;
    email: string;
    password: string;
    estado: string;
    foto?: string;
    permisos?: string[];
}

export interface Inventario {
    id: number;
    descripcion: string;
    cantidad_existente: number;
    stock_minimo: number;
    estado: string; // 'Activo' | 'Inactivo'
    idespecialidad: number;
    idgrupo_inventario: number;
    especialidad?: Especialidad;
    grupoInventario?: GrupoInventario;
    egresosInventario?: EgresoInventario[];
}

export interface EgresoInventario {
    id: number;
    inventarioId: number;
    inventario?: Inventario;
    fecha: string;
    cantidad: number;
    fecha_vencimiento: string;
}

export interface Doctor {
    id: number;
    paterno: string;
    materno: string;
    nombre: string;
    celular: string;
    direccion: string;
    estado: string;
    idEspecialidad?: number;
    especialidad?: Especialidad;
}

export interface Proveedor {
    id: number;
    proveedor: string;
    celular: string;
    direccion: string;
    email: string;
    nombre_contacto: string;
    celular_contacto: string;
    estado: string;
}

export interface Personal {
    id: number;
    paterno: string;
    materno: string;
    nombre: string;
    ci: string;
    direccion: string;
    telefono: string;
    celular: string;
    fecha_nacimiento: string;
    fecha_ingreso: string;
    personal_tipo_id?: number;
    personalTipo?: PersonalTipo;
    estado: string;
    fecha_baja?: string;
}

export interface Especialidad {
    id: number;
    especialidad: string;
    estado: string;
}

export interface Arancel {
    id: number;
    detalle: string;
    precio: number;
    codigo?: string;
    moneda?: string;
    estado: string;
    idEspecialidad: number;
    idSeguro?: number;
    especialidad?: Especialidad;
    seguro?: Seguro;
    odontogramaColor?: string;
    odontogramaFigura?: string;
}

export interface FormaPago {
    id: number;
    forma_pago: string;
    estado: string;
}

export interface Egreso {
    id: number;
    detalle: string;
    monto: number;
    moneda: 'Bolivianos' | 'Dólares';
    formaPago?: FormaPago;
    egresoTipo?: { id: number; tipo: string };
    fecha?: string;
    hora?: string;
}

export interface Laboratorio {
    id: number;
    laboratorio: string;
    celular: string;
    telefono: string;
    direccion: string;
    email: string;
    banco: string;
    numero_cuenta: string;
    estado: string;
}

export interface PrecioLaboratorio {
    id: number;
    detalle: string;
    precio: number;
    idLaboratorio: number;
    laboratorio?: Laboratorio;
    estado: string;
}

export interface Categoria {
    id: number;
    nombre: string;
    color: string;
}

export interface FichaClinica {
    id?: number;
    pacienteId?: number;

    // --- MOTIVO DE CONSULTA ---
    motivo_consulta?: string;

    // --- ANTECEDENTES FAMILIARES ---
    ant_pat_familiares?: string;

    // --- ANTECEDENTES PERSONALES PATOLOGICOS (Checkboxes) ---
    ant_pat_anemia?: boolean;
    ant_pat_cardiopatias?: boolean;
    ant_pat_gastricas?: boolean;
    ant_pat_hepatitis?: boolean;
    ant_pat_tuberculosis?: boolean;
    ant_pat_asma?: boolean;
    ant_pat_diabetes?: boolean;
    ant_pat_epilepsia?: boolean;
    ant_pat_hipertension?: boolean;
    ant_pat_vih?: boolean;
    ant_pat_ninguno?: boolean;

    // --- CIRUGIA ---
    ant_pat_cirugia?: boolean;
    ant_pat_cirugia_detalle?: string;

    // --- OTROS Y ALERGIAS ---
    ant_pat_otros?: string;
    ant_pat_alergias?: boolean;
    ant_pat_alergias_detalle?: string;

    // --- EMBARAZO ---
    ant_pat_embarazo?: boolean;
    ant_pat_embarazo_semanas?: number | null;

    // --- TRATAMIENTO MEDICO Y MEDICAMENTOS ---
    ant_pat_tratamiento_medico?: boolean;
    ant_pat_tratamiento_medico_detalle?: string;
    ant_pat_toma_medicamentos?: boolean;
    ant_pat_toma_medicamentos_detalle?: string;

    // --- HEMORRAGIAS ---
    ant_pat_hemorragias?: boolean;
    ant_pat_hemorragias_tipo?: string;

    // --- EXAMEN EXTRA ORAL ---
    exam_extra_atm?: string;
    exam_extra_ganglios?: string;
    exam_extra_respirador?: string;
    exam_extra_otros?: string;

    // --- EXAMEN INTRA ORAL ---
    exam_intra_labios?: string;
    exam_intra_lengua?: string;
    exam_intra_paladar?: string;
    exam_intra_piso_boca?: string;
    exam_intra_mucosa_yugal?: string;
    exam_intra_encias?: string;
    exam_intra_protesis?: boolean;

    // --- ANTECEDENTES BUCODENTALES ---
    ant_buco_ultima_visita?: string;
    habito_fuma?: boolean;
    habito_bebe?: boolean;
    habito_otros?: string;

    // --- HIGIENE ORAL ---
    hig_cepillo?: boolean;
    hig_hilo?: boolean;
    hig_enjuague?: boolean;
    hig_waterpik?: boolean;
    hig_frecuencia_cepillado?: string;
    hig_sangrado_encias?: boolean;
    hig_bucal_estado?: string;

    // --- OBSERVACIONES FICHA ---
    observaciones_ficha?: string;

    particularidad?: string;
    usuarioId?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface Paciente {
    id: number;
    fecha_ingreso: string;
    paterno: string;
    materno: string;
    nombre: string;
    fecha_nacimiento: string;
    genero: string;
    ci: string;
    ci_extension?: string;
    foto?: string;
    direccion: string;
    ocupacion: string;
    telefono_celular: string;
    email?: string;
    tutor_nombre?: string;
    tutor_ci?: string;
    estado: string;
    fichaClinica?: FichaClinica;
    seguro?: Seguro;
    seguroId?: number;
    odontogramas?: any[];
    celular?: string;
    estado_civil?: string;
    grado_instruccion?: string;
    tutor_celular?: string;
    persona_brinda_informacion?: string;
    clasificacion?: string;
    createdAt?: string;
    updatedAt?: string;
    esta_firmado?: boolean;
}



export interface Odontograma {
    id: number;
    pacienteId?: number;
    paciente?: Paciente;
    fecha: string;
    notas?: string;
    mapa_dientes?: any; // Record of tooth key -> { state: number, surfaces: {O, M, D, V, L/P} }
    usuarioId?: number;
}


export interface PersonalTipo {
    id: number;
    area: string;
    estado: string;
    created_at: string;
    updated_at: string;
}

export interface UpdateUserDto extends Partial<CreateUserDto> { }



export interface ProformaDetalle {
    id: number;
    proformaId: number;
    arancelId: number;
    arancel?: Arancel;
    precioUnitario: number;
    piezas: string;
    cantidad: number;
    total: number;
    posible: boolean;
}

export interface Proforma {
    id: number;
    numero: number;
    pacienteId: number;
    paciente?: Paciente;
    usuarioId: number;
    usuario?: User;
    fecha: string;
    nota: string;
    sub_total: number;
    descuento: number;
    total: number;
    detalles: ProformaDetalle[];
    esta_firmado?: boolean;
    plan_pagos?: {
        activo: boolean;
        meses: number;
        diaPago: number;
        fechaInicio: string;
        cuotaInicial?: number;
    } | null;
}

export interface HistoriaClinica {
    id: number;
    pacienteId: number;
    paciente?: Paciente;
    fecha: string;
    pieza?: string;
    cantidad: number;
    proformaDetalleId?: number;
    proformaDetalle?: ProformaDetalle;
    tratamiento?: string;
    observaciones?: string;
    especialidadId?: number;
    especialidad?: Especialidad;
    doctorId?: number;
    doctor?: Doctor;
    diagnostico?: string;

    estadoTratamiento: string;
    estadoPresupuesto: string;
    proformaId?: number;
    proforma?: Proforma;

    casoClinico: boolean;
    pagado: string;
    precio?: number;
    firmaPaciente?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Pago {
    id: number;
    pacienteId: number;
    paciente?: Paciente;
    fecha: string;
    proformaId?: number;
    proforma?: Proforma;
    monto: number;
    moneda: 'Bolivianos' | 'Dólares';
    tc: number;
    recibo?: string;
    factura?: string;
    formaPago: 'Efectivo' | 'QR' | 'Tarjeta';
    comisionTarjetaId?: number;
    comisionTarjeta?: ComisionTarjeta;
    observaciones?: string;
    formaPagoRel?: FormaPago;
    createdAt: string;
    updatedAt: string;
}

export interface ComisionTarjeta {
    id: number;
    redBanco: string;
    monto: number;
    estado: string;
}

export interface Agenda {
    id: number;
    fecha: string;
    hora: string;
    duracion: number;
    consultorio: number;
    pacienteId?: number;
    paciente?: Paciente;
    pacienteSeguro?: any;
    doctorId: number;
    doctor?: Doctor;
    proformaId?: number;
    proforma?: Proforma;
    usuarioId: number;
    usuario?: User;
    fechaAgendado: string;
    estado: string;
    tratamiento?: string;
    motivoCancelacion?: string;
}

export interface GastoFijo {
    id: number;

    dia: number;
    anual: boolean;
    mes?: string;
    gasto_fijo: string;
    monto: number;
    moneda: string;
    estado?: string;
}

export interface PagoGastoFijo {
    id: number;
    gastoFijoId: number;
    gastoFijo?: GastoFijo;
    fecha: string;
    monto: number;
    moneda: string;
    formaPagoId: number;
    formaPago?: FormaPago;
    observaciones: string;
    createdAt?: string;
}







export interface Correo {
    id: number;
    remitente_id: number;
    remitente?: User;
    destinatario_id: number;
    destinatario?: User;
    copia_id?: number;
    copia?: User;
    asunto: string;
    mensaje: string;
    fecha_envio: string;
    leido_destinatario: boolean;
    leido_copia: boolean;
    // Helper property I will use in frontend logic? No, backend sends these raw fields.
}

export interface CreateCorreoDto {
    remitente_id: number;
    destinatario_id: number;
    copia_id?: number;
    asunto: string;
    mensaje: string;
}

export interface PedidosDetalle {
    id: number;
    idpedidos: number;
    idinventario: number;
    cantidad: number;
    precio_unitario: number;
    fecha_vencimiento: string;
    inventario?: Inventario;
}

export interface Pedidos {
    id: number;
    fecha: string;
    idproveedor: number;
    Sub_Total: number;
    Descuento: number;
    Total: number;
    Observaciones: string;
    Pagado: boolean;
    proveedor?: Proveedor;
    detalles?: PedidosDetalle[];
}

export interface PagosPedidos {
    id: number;
    fecha: string;
    idPedido: number;
    pedido?: Pedidos;
    monto: number;
    factura?: string;
    recibo?: string;
    forma_pago: string;
}

export interface Tarea {
    id: number;
    titulo: string;
    descripcion?: string;
    fechaInicio?: string;
    fechaFin?: string;
    estado: 'pendiente' | 'en_progreso' | 'completada';
    usuarioId?: number;
}

export interface ConsentimientoPlantilla {
    id: number;
    titulo: string;
    especialidadId?: number;
    especialidad?: {
        id: number;
        especialidad: string;
    };
    contenido: string;
    estado: string;
    fechaCreacion?: string;
    fechaActualizacion?: string;
}

export interface ConsentimientoPaciente {
    id: number;
    pacienteId: number;
    titulo: string;
    contenido_generado: string;
    diagnostico?: string;
    procedimiento?: string;
    fecha: string;
}

export interface Cubeta {
    id: number;
    codigo: string;
    descripcion: string;
    dentro_fuera: string;
    estado: string;
}

export interface TrabajoLaboratorio {
    id: number;
    idLaboratorio: number;
    laboratorio?: Laboratorio;
    idPaciente: number;
    paciente?: Paciente;
    idprecios_laboratorios: number;
    precioLaboratorio?: PrecioLaboratorio;
    fecha: string;
    pieza: string;
    cantidad: number;
    fecha_pedido: string;
    color: string;
    estado: string;
    observacion: string;
    fecha_terminado?: string;
    pagado: string;
    precio_unitario: number;
    total: number;
    idCubeta?: number;
    cubeta?: Cubeta;
    idDoctor?: number;
    doctor?: Doctor;
    idHistoriaClinica?: number;
    historiaClinica?: HistoriaClinica;
}

export interface PropuestaDetalle {
    id: number;
    propuestaId: number;
    letra?: string;
    arancelId: number;
    arancel?: Arancel;
    precioUnitario: number;
    tc: number;
    piezas: string;
    cantidad: number;
    subTotal: number;
    descuento: number;
    total: number;
    posible: boolean;
}

export interface Propuesta {
    id: number;
    pacienteId: number;
    paciente?: Paciente;
    numero: number;
    letra?: string;
    fecha: string;
    total: number;
    nota: string;
    usuarioId: number;
    usuario?: User;
    detalles: PropuestaDetalle[];
    descuentos?: Record<string, number>;
}

export interface Calificacion {
    id: number;
    personalId: number;
    personal?: Personal;
    pacienteId: number;
    paciente?: Paciente;
    consultorio: number;
    calificacion: 'Malo' | 'Regular' | 'Bueno';
    fecha: string;
    observaciones?: string;
    evaluadorId: number;
    evaluador?: User;
    createdAt?: string;
    updatedAt?: string;
}

export interface Receta {
    id: number;
    pacienteId: number;
    paciente?: Paciente;
    userId: number;
    user?: { id: number; name: string };
    fecha: string;
    medicamentos?: string;
    indicaciones?: string;
    diagnostico?: string;
    detalles?: RecetaDetalle[];
}

export interface RecetaDetalle {
    id: number;
    recetaId: number;
    medicamento: string;
    cantidad: string;
    indicacion: string;
}

export interface RecetaPredisenadaDetalle {
    id?: number;
    recetaPredisenadaId?: number;
    medicamento: string;
    cantidad: string;
    indicacion: string;
}

export interface RecetaPredisenada {
    id: number;
    nombre: string;
    especialidadId: number;
    especialidad?: Especialidad;
    diagnostico?: string;
    indicaciones?: string;
    estado: 'activo' | 'inactivo';
    detalles: RecetaPredisenadaDetalle[];
    createdAt?: string;
    updatedAt?: string;
}



export interface Recordatorio {
    id: number;
    tipo: 'personal' | 'consultorio';
    fecha: string;
    hora: string;
    mensaje: string;
    repetir: 'Mensual' | 'Anual' | 'Solo una vez';
    estado: 'activo' | 'inactivo';
    usuarioId?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface Contacto {
    id: number;
    contacto: string;
    celular?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    estado: 'activo' | 'inactivo';
    createdAt?: string;
    updatedAt?: string;
}

export interface Musica {
    id: number;
    musica: string;
    estado: string;
    created_at?: string;
    updated_at?: string;
}

export interface Television {
    id: number;
    television: string;
    estado: string;
    created_at?: string;
    updated_at?: string;
}

export interface PacienteMusica {
    id: number;
    pacienteId: number;
    musicaId: number;
}

export interface PacienteTelevision {
    id: number;
    pacienteId: number;
    televisionId: number;
}

export interface BackupInfo {
    filename: string;
    size: number;
    createdAt: string;
    path: string;
}

export interface Seguro {
    id: number;
    nombre: string;
    color: string;
    estado: string;
    nit?: string;
    direccion?: string;
    telefono?: string;
    email?: string;
    contacto_nombre?: string;
}

export interface DatosCentroDental {
    id: number;
    nombre: string;
    direccion: string;
    latitud?: string;
}

export interface ConsentimientoPaciente {
    id: number;
    pacienteId: number;
    titulo: string;
    contenido_generado: string;
    diagnostico?: string;
    procedimiento?: string;
    fecha: string;
}

export interface Cubeta {
    id: number;
    codigo: string;
    descripcion: string;
    dentro_fuera: string;
    estado: string;
}

export interface TrabajoLaboratorio {
    id: number;
    idLaboratorio: number;
    laboratorio?: Laboratorio;
    idPaciente: number;
    paciente?: Paciente;
    idprecios_laboratorios: number;
    precioLaboratorio?: PrecioLaboratorio;
    fecha: string;
    pieza: string;
    cantidad: number;
    fecha_pedido: string;
    color: string;
    estado: string;
    observacion: string;
    fecha_terminado?: string;
    pagado: string;
    precio_unitario: number;
    total: number;
    idCubeta?: number;
    cubeta?: Cubeta;
    idDoctor?: number;
    doctor?: Doctor;
    idHistoriaClinica?: number;
    historiaClinica?: HistoriaClinica;
}

export interface PropuestaDetalle {
    id: number;
    propuestaId: number;
    letra?: string;
    arancelId: number;
    arancel?: Arancel;
    precioUnitario: number;
    tc: number;
    piezas: string;
    cantidad: number;
    subTotal: number;
    descuento: number;
    total: number;
    posible: boolean;
}

export interface Propuesta {
    id: number;
    pacienteId: number;
    paciente?: Paciente;
    numero: number;
    letra?: string;
    fecha: string;
    total: number;
    nota: string;
    usuarioId: number;
    usuario?: User;
    detalles: PropuestaDetalle[];
    descuentos?: Record<string, number>;
}

export interface Calificacion {
    id: number;
    personalId: number;
    personal?: Personal;
    pacienteId: number;
    paciente?: Paciente;
    consultorio: number;
    calificacion: 'Malo' | 'Regular' | 'Bueno';
    fecha: string;
    observaciones?: string;
    evaluadorId: number;
    evaluador?: User;
    createdAt?: string;
    updatedAt?: string;
}





export interface Recordatorio {
    id: number;
    tipo: 'personal' | 'consultorio';
    fecha: string;
    hora: string;
    mensaje: string;
    repetir: 'Mensual' | 'Anual' | 'Solo una vez';
    estado: 'activo' | 'inactivo';
    usuarioId?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface Contacto {
    id: number;
    contacto: string;
    celular?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    estado: 'activo' | 'inactivo';
    createdAt?: string;
    updatedAt?: string;
}

export interface Musica {
    id: number;
    musica: string;
    estado: string;
    created_at?: string;
    updated_at?: string;
}

export interface Television {
    id: number;
    television: string;
    estado: string;
    created_at?: string;
    updated_at?: string;
}

export interface PacienteMusica {
    id: number;
    pacienteId: number;
    musicaId: number;
}

export interface PacienteTelevision {
    id: number;
    pacienteId: number;
    televisionId: number;
}

export interface BackupInfo {
    filename: string;
    size: number;
    createdAt: string;
    path: string;
}

export interface Seguro {
    id: number;
    nombre: string;
    color: string;
    estado: string;
    nit?: string;
    direccion?: string;
    telefono?: string;
    email?: string;
    contacto_nombre?: string;
}

export interface DatosCentroDental {
    id: number;
    nombre: string;
    direccion: string;
    latitud?: string;
    longitud?: string;
    telefono: string;
    celular: string;
    emergencias: string;
    email: string;
    qr?: string;
    estado: string;
    horarios?: string;
}



export interface EstudioComplementario {
    id: number;
    pacienteId: number;
    fecha: string;
    tipo_estudio: string;
    observaciones?: string;
    archivo_url?: string;
}

export interface CasoClinicoFoto {
    id?: number;
    casoClinicoId?: number;
    foto: string;
    descripcion?: string;
}

export interface CasoClinico {
    id: number;
    nombre: string;
    especialidadId: number;
    especialidad?: Especialidad;
    video?: string;
    estado: string;
    createdAt?: string;
    updatedAt?: string;
    fotos?: CasoClinicoFoto[];
}




