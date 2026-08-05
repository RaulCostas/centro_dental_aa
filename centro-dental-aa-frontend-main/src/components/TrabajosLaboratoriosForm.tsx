import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import type { TrabajoLaboratorio, Paciente, Laboratorio, PrecioLaboratorio, Doctor } from '../types';
import Swal from 'sweetalert2';
import ManualModal, { type ManualSection } from './ManualModal';
import { formatFullName, formatNumber } from '../utils/formatters';
import SearchableSelect from './SearchableSelect';
import LabToothArchDiagram from './LabToothArchDiagram';
import { 
    Calendar, Clock, User, Stethoscope, Building2, Tag, 
    Upload, X, CheckCircle2, ShieldCheck, Zap, Layers, Image as ImageIcon, FileText, ArrowLeft, Save
} from 'lucide-react';

const FASES_LABORATORIO = [
    { key: 'Recepción', label: 'Recepción', icon: '📥' },
    { key: 'Modelo', label: 'Modelo', icon: '🧱' },
    { key: 'Diseño', label: 'Diseño', icon: '💻' },
    { key: 'Fresado', label: 'Fresado', icon: '⚙️' },
    { key: 'Sinterizado', label: 'Sinterizado', icon: '🍳' },
    { key: 'Estratificación', label: 'Estratificación', icon: '🎨' },
    { key: 'Pulido', label: 'Pulido', icon: '✨' },
    { key: 'Glaseado', label: 'Glaseado', icon: '💎' },
    { key: 'Control', label: 'Control', icon: '✅' },
    { key: 'Entregado', label: 'Entregado', icon: '📦' }
];

const getLocalDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getLocalTime = () => {
    const d = new Date();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

const TrabajosLaboratoriosForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditing = Boolean(id);

    // Core form data
    const [formData, setFormData] = useState<Partial<TrabajoLaboratorio>>({
        idLaboratorio: 0,
        idPaciente: 0,
        idprecios_laboratorios: 0,
        fecha: getLocalDate(),
        hora: getLocalTime(),
        pieza: '',
        cantidad: 1,
        fecha_pedido: getLocalDate(),
        color: '',
        estado: 'no terminado',
        fase_laboratorio: 'Recepción',
        observacion: '',
        pagado: 'no',
        precio_unitario: 0,
        total: 0,
        idDoctor: 0,
        fotografias_referencias: [],
        detalles_orden: {}
    });

    // Sub-structures of detalles_orden
    const [tipoRestauracion, setTipoRestauracion] = useState<Record<string, any>>({});
    const [preparacion, setPreparacion] = useState<string>('');
    const [lado, setLado] = useState<Record<string, boolean>>({});
    const [selectedTeeth, setSelectedTeeth] = useState<string[]>([]);
    const [material, setMaterial] = useState<Record<string, any>>({});
    const [caracterizaciones, setCaracterizaciones] = useState<Record<string, any>>({});
    const [oclusion, setOclusion] = useState<Record<string, any>>({});
    const [digital, setDigital] = useState<Record<string, any>>({});
    const [implantologia, setImplantologia] = useState<Record<string, any>>({});
    const [pruebas, setPruebas] = useState<Record<string, any>>({});
    const [urgencia, setUrgencia] = useState<string>('Normal');
    const [controlTiempos, setControlTiempos] = useState<Record<string, string>>({});
    const [obsClinicas, setObsClinicas] = useState<Record<string, string>>({});
    const [controlCalidad, setControlCalidad] = useState<Record<string, any>>({});

    // References / photos upload
    const [refFiles, setRefFiles] = useState<File[]>([]);
    const [refPreviews, setRefPreviews] = useState<string[]>([]);
    const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Dropdowns data
    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [laboratorios, setLaboratorios] = useState<Laboratorio[]>([]);
    const [preciosLaboratorio, setPreciosLaboratorio] = useState<PrecioLaboratorio[]>([]);
    const [doctores, setDoctores] = useState<Doctor[]>([]);
    const [showManual, setShowManual] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const selectedPrecioObj = React.useMemo(() => {
        return preciosLaboratorio.find(p => p.id === Number(formData.idprecios_laboratorios));
    }, [preciosLaboratorio, formData.idprecios_laboratorios]);

    const isPriceVariable = React.useMemo(() => {
        return Boolean(selectedPrecioObj && Number(selectedPrecioObj.precio) === 0);
    }, [selectedPrecioObj]);

    const manualSections: ManualSection[] = [
        {
            title: 'Orden de Trabajo de Laboratorio Dental',
            content: 'Formulario oficial de Orden de Trabajo Dental de Centro Dental A&A. Permite registrar datos generales, dientes involucrados en el arcada, materiales, oclusión, implantología, fase de laboratorio y fotografías de referencia.'
        },
        {
            title: 'Arcada Dental e Interactividad',
            content: 'Haga clic sobre los dientes en el diagrama de la arcada para marcar con una X roja los dientes involucrados. La selección actualizará automáticamente el campo Pieza.'
        },
        {
            title: 'Fase de Laboratorio',
            content: 'Haga clic en cualquiera de las fases del proceso de laboratorio (Recepción, Modelo, Diseño, etc.) para actualizar el avance en tiempo real.'
        }
    ];

    useEffect(() => {
        fetchDropdowns();
        if (isEditing && id) {
            fetchTrabajo(id);
        }
    }, [id]);

    useEffect(() => {
        const total = (Number(formData.cantidad) || 0) * (Number(formData.precio_unitario) || 0);
        setFormData(prev => ({ ...prev, total }));
    }, [formData.cantidad, formData.precio_unitario]);

    const fetchPacientes = async () => {
        try {
            const res = await api.get('/pacientes?limit=1000');
            setPacientes(res.data.data || res.data || []);
        } catch (error) {
            console.error('Error fetching pacientes:', error);
        }
    };

    const patientOptions = React.useMemo(() => {
        return pacientes.map(p => {
            const cel = p.telefono_celular || p.celular || '';
            const match = cel.match(/^(\+\d{1,3})(\d+)$/);
            const formattedCel = match ? `(${match[1]})${match[2]}` : cel;
            
            const isSeguro = p.seguroId && p.seguroId > 0;
            const typeLabel = isSeguro ? `SEGURO: ${p.seguro?.nombre || 'Sí'}` : 'PARTICULAR';
            
            return {
                id: p.id,
                label: `${p.nombre} ${p.paterno} ${p.materno || ''}`.trim(),
                subLabel: `CI: ${p.ci || 'N/A'} | Cel: ${formattedCel} | ${typeLabel}`
            };
        });
    }, [pacientes]);

    const fetchDropdowns = async () => {
        try {
            const [labRes, preciosRes, docsRes] = await Promise.all([
                api.get('/laboratorios?limit=100'),
                api.get('/precios-laboratorios?limit=1000'),
                api.get('/doctors?limit=100')
            ]);

            fetchPacientes();
            const activeLabs = (labRes.data.data || []).filter((lab: any) => lMatchEstado(lab.estado));
            setLaboratorios(activeLabs);
            setPreciosLaboratorio(Array.isArray(preciosRes.data.data) ? preciosRes.data.data : preciosRes.data);
            setDoctores(Array.isArray(docsRes.data) ? docsRes.data : (docsRes.data.data || []));
        } catch (error) {
            console.error('Error fetching dropdowns:', error);
        }
    };

    const lMatchEstado = (est: string) => {
        return est?.toLowerCase() === 'activo';
    };

    const fetchTrabajo = async (workId: string) => {
        try {
            const response = await api.get(`/trabajos-laboratorios/${workId}`);
            const data = response.data;
            setFormData(data);

            if (data.pieza) {
                const teethArray = String(data.pieza).split(',').map(s => s.trim()).filter(Boolean);
                setSelectedTeeth(teethArray);
            }

            if (Array.isArray(data.fotografias_referencias)) {
                setExistingPhotos(data.fotografias_referencias);
            }

            if (data.detalles_orden) {
                const d = data.detalles_orden;
                if (d.tipo_restauracion) setTipoRestauracion(d.tipo_restauracion);
                if (d.preparacion) setPreparacion(d.preparacion);
                if (d.lado) setLado(d.lado);
                if (d.material) setMaterial(d.material);
                if (d.caracterizaciones) setCaracterizaciones(d.caracterizaciones);
                if (d.oclusion) setOclusion(d.oclusion);
                if (d.digital) setDigital(d.digital);
                if (d.implantologia) setImplantologia(d.implantologia);
                if (d.pruebas) setPruebas(d.pruebas);
                if (d.urgencia) setUrgencia(d.urgencia);
                if (d.control_tiempos) setControlTiempos(d.control_tiempos);
                if (d.obs_clinicas) setObsClinicas(d.obs_clinicas);
                if (d.control_calidad) setControlCalidad(d.control_calidad);
            }
        } catch (error) {
            console.error('Error fetching trabajo:', error);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePrecioSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const precioId = Number(e.target.value);
        const selectedPrecio = preciosLaboratorio.find(p => p.id === precioId);

        setFormData(prev => ({
            ...prev,
            idprecios_laboratorios: precioId,
            precio_unitario: selectedPrecio ? Number(selectedPrecio.precio) : 0,
            idLaboratorio: selectedPrecio ? selectedPrecio.idLaboratorio : prev.idLaboratorio
        }));
    };

    const handleToothToggle = (toothId: string) => {
        setSelectedTeeth(prev => {
            const exists = prev.includes(toothId);
            const next = exists ? prev.filter(t => t !== toothId) : [...prev, toothId].sort((a, b) => Number(a) - Number(b));
            setFormData(f => ({ ...f, pieza: next.join(', ') }));
            return next;
        });
    };

    const handleFaseSelect = (faseKey: string) => {
        setFormData(prev => {
            let nextEstado = prev.estado;
            if (faseKey === 'Entregado') nextEstado = 'entregado';
            else if (faseKey === 'Control' || faseKey === 'Glaseado') nextEstado = 'terminado';
            else nextEstado = 'no terminado';

            return {
                ...prev,
                fase_laboratorio: faseKey,
                estado: nextEstado
            };
        });
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const newFiles = Array.from(e.target.files);
        setRefFiles(prev => [...prev, ...newFiles]);

        const newPreviews = newFiles.map(file => URL.createObjectURL(file));
        setRefPreviews(prev => [...prev, ...newPreviews]);
    };

    const removeRefFile = (index: number) => {
        setRefFiles(prev => prev.filter((_, i) => i !== index));
        setRefPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingPhoto = (index: number) => {
        setExistingPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const getImageUrl = (filename: string) => {
        const baseUrl = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : '';
        return `${baseUrl}/uploads/${filename}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.idPaciente || Number(formData.idPaciente) === 0) {
            Swal.fire('Atención', 'Debe seleccionar un Paciente.', 'warning');
            return;
        }

        if (!formData.idLaboratorio || Number(formData.idLaboratorio) === 0) {
            Swal.fire('Atención', 'Debe seleccionar un Laboratorio.', 'warning');
            return;
        }

        if (!formData.idprecios_laboratorios || Number(formData.idprecios_laboratorios) === 0) {
            Swal.fire('Atención', 'Debe seleccionar el Trabajo de Laboratorio.', 'warning');
            return;
        }

        setIsSaving(true);

        const detalles = {
            tipo_restauracion: tipoRestauracion,
            preparacion,
            lado,
            material,
            caracterizaciones,
            oclusion,
            digital,
            implantologia,
            pruebas,
            urgencia,
            control_tiempos: controlTiempos,
            obs_clinicas: obsClinicas,
            control_calidad: controlCalidad
        };

        const payload = {
            ...formData,
            idLaboratorio: Number(formData.idLaboratorio),
            idPaciente: Number(formData.idPaciente),
            idprecios_laboratorios: Number(formData.idprecios_laboratorios),
            idDoctor: formData.idDoctor ? Number(formData.idDoctor) : null,
            cantidad: Number(formData.cantidad) || 1,
            precio_unitario: Number(formData.precio_unitario) || 0,
            total: Number(formData.total) || 0,
            fotografias_referencias: existingPhotos,
            detalles_orden: detalles,
            idHistoriaClinica: null // Removed relation per explicit request
        };

        try {
            let savedId: number;

            if (isEditing && id) {
                await api.patch(`/trabajos-laboratorios/${id}`, payload);
                savedId = Number(id);
            } else {
                const res = await api.post('/trabajos-laboratorios', payload);
                savedId = res.data.id;
            }

            // Upload reference files if selected
            if (refFiles.length > 0 && savedId) {
                for (const file of refFiles) {
                    const fd = new FormData();
                    fd.append('file', file);
                    await api.post(`/trabajos-laboratorios/${savedId}/upload-referencia`, fd, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                }
            }

            await Swal.fire({
                icon: 'success',
                title: isEditing ? 'Orden de Trabajo Actualizada' : 'Orden de Trabajo Registrada',
                text: 'Los datos de la orden de laboratorio se guardaron correctamente.',
                timer: 1500,
                showConfirmButton: false
            });

            navigate('/trabajos-laboratorios');
        } catch (error: any) {
            console.error('Error saving trabajo:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Hubo un problema al guardar la orden de trabajo.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="content-card max-w-[1200px] mx-auto p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 mb-12">
            
            {/* HEADER ORDER SHEET TITLE */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-600 dark:bg-blue-700 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-lg">
                        A&A
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black uppercase text-blue-900 dark:text-blue-200 tracking-tight">
                            ORDEN DE TRABAJO LABORATORIO DENTAL
                        </h1>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                            REHABILITACIÓN ORAL - IMPLANTOLOGÍA - ODONTOLOGÍA DIGITAL
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-blue-50 dark:bg-blue-950/60 border-2 border-blue-600 dark:border-blue-500 px-6 py-2 rounded-xl text-center shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 block">N° ORDEN</span>
                        <span className="text-lg font-black text-blue-950 dark:text-white">
                            A&A-{isEditing && id ? String(id).padStart(7, '0') : 'NUEVO'}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowManual(true)}
                        className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-2 rounded-full flex items-center justify-center w-[36px] h-[36px] text-base text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm"
                        title="Ayuda / Manual"
                    >
                        ?
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* 1. DATOS GENERALES */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-sm font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-4 flex items-center gap-2 border-b pb-2 border-gray-100 dark:border-gray-700">
                        <User className="w-5 h-5 text-blue-600" />
                        1. DATOS GENERALES
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Fecha de registro */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Fecha de Registro *</label>
                            <div className="relative">
                                <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="date"
                                    name="fecha"
                                    value={formData.fecha || getLocalDate()}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium transition-all shadow-sm"
                                    required
                                />
                            </div>
                        </div>

                        {/* Hora */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Hora *</label>
                            <div className="relative">
                                <Clock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="time"
                                    name="hora"
                                    value={formData.hora || getLocalTime()}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium transition-all shadow-sm"
                                />
                            </div>
                        </div>

                        {/* Doctor Tratante */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Doctor Tratante *</label>
                            <div className="relative">
                                <Stethoscope className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <select
                                    name="idDoctor"
                                    value={formData.idDoctor || 0}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium transition-all shadow-sm appearance-none"
                                    required
                                >
                                    <option value={0}>-- Seleccione Doctor --</option>
                                    {doctores.map(d => (
                                        <option key={d.id} value={d.id}>Dr. {formatFullName(d)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Paciente */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Paciente *</label>
                            <SearchableSelect
                                options={patientOptions}
                                value={formData.idPaciente || ''}
                                onChange={(val) => {
                                    setFormData(prev => ({ ...prev, idPaciente: Number(val) }));
                                }}
                                placeholder="-- Seleccione Paciente --"
                                required
                            />
                        </div>

                        {/* Laboratorio */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Laboratorio Dental *</label>
                            <div className="relative">
                                <Building2 className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <select
                                    name="idLaboratorio"
                                    value={formData.idLaboratorio || 0}
                                    onChange={(e) => {
                                        handleChange(e);
                                        setFormData(prev => ({ ...prev, idprecios_laboratorios: 0, precio_unitario: 0 }));
                                    }}
                                    className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium transition-all shadow-sm appearance-none"
                                    required
                                >
                                    <option value={0}>-- Seleccione Laboratorio --</option>
                                    {laboratorios.map(l => (
                                        <option key={l.id} value={l.id}>{l.laboratorio}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Trabajo / Precio de Arancel */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Trabajo de Laboratorio *</label>
                            <div className="relative">
                                <Tag className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <select
                                    name="idprecios_laboratorios"
                                    value={formData.idprecios_laboratorios || 0}
                                    onChange={handlePrecioSelect}
                                    className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium transition-all shadow-sm appearance-none"
                                    required
                                    disabled={!formData.idLaboratorio}
                                >
                                    <option value={0}>-- Seleccione Trabajo / Precio --</option>
                                    {preciosLaboratorio
                                        .filter(p => p.idLaboratorio === Number(formData.idLaboratorio))
                                        .map(p => (
                                            <option key={p.id} value={p.id}>{p.detalle} - Bs. {formatNumber(p.precio)}</option>
                                        ))}
                                </select>
                            </div>
                        </div>

                        {/* Totales y Cantidad */}
                        <div className="flex items-center gap-3">
                            <div className="w-1/2">
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Cantidad</label>
                                <input
                                    type="number"
                                    name="cantidad"
                                    min="1"
                                    value={formData.cantidad || 1}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold text-center transition-all shadow-sm"
                                />
                            </div>
                            <div className="w-1/2">
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                                    <span>Total Bs.</span>
                                    {isPriceVariable && (
                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold uppercase animate-pulse">
                                            (Costo Variable)
                                        </span>
                                    )}
                                </label>
                                {isPriceVariable ? (
                                    <div className="relative">
                                        <input
                                            type="number"
                                            name="precio_unitario"
                                            step="0.01"
                                            min="0"
                                            value={formData.precio_unitario || ''}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                setFormData(prev => ({ ...prev, precio_unitario: val }));
                                            }}
                                            placeholder="Ingrese costo en Bs..."
                                            className="w-full px-3 py-2 rounded-xl border-2 border-amber-400 dark:border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 text-xs font-black text-center focus:ring-2 focus:ring-amber-500 outline-none transition-all shadow-sm"
                                            required
                                        />
                                        {(Number(formData.cantidad) || 1) > 1 && (
                                            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 block text-center mt-1">
                                                Total ({formData.cantidad} uds): Bs. {formatNumber(formData.total || 0)}
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        readOnly
                                        value={`Bs. ${formatNumber(formData.total || 0)}`}
                                        className="w-full px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-200 text-xs font-black text-center transition-all shadow-sm"
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* GRID 2 COLUMNAS: TIPO DE RESTAURACIÓN + DIENTES INVOLUCRADOS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* 2. TIPO DE RESTAURACIÓN */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2 border-b pb-2 border-gray-100 dark:border-gray-700">
                                <Layers className="w-5 h-5 text-blue-600" />
                                2. TIPO DE RESTAURACIÓN
                            </h3>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                                {[
                                    { key: 'corona', label: '👑 Corona' },
                                    { key: 'puente', label: '🦷 Puente' },
                                    { key: 'carilla', label: '✨ Carilla' },
                                    { key: 'inlay', label: '🧩 Inlay' },
                                    { key: 'onlay', label: '🧩 Onlay' },
                                    { key: 'protesis_parcial', label: '🦷 Prótesis Parcial Removible' },
                                    { key: 'protesis_total', label: '🦷 Prótesis Total' },
                                    { key: 'sobredentadura', label: '🦷 Sobredentadura' },
                                    { key: 'barra_implantes', label: '🦴 Barra sobre Implantes' },
                                    { key: 'hibrida_fija', label: '🦴 Híbrida Fija' },
                                    { key: 'provisional', label: '🕒 Provisional' },
                                    { key: 'ferula', label: '🛡️ Férula' },
                                    { key: 'guarda_oclusal', label: '🛡️ Guarda Oclusal' },
                                    { key: 'mock_up', label: '✨ Mock-up' },
                                    { key: 'encerado_diagnostico', label: '📐 Encerado Diagnóstico' },
                                    { key: 'guia_quirurgica', label: '🎯 Guía Quirúrgica' },
                                ].map(item => (
                                    <label key={item.key} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(tipoRestauracion[item.key])}
                                            onChange={(e) => setTipoRestauracion(prev => ({ ...prev, [item.key]: e.target.checked }))}
                                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Otro Tipo de Restauración:</label>
                            <input
                                type="text"
                                value={tipoRestauracion.otro || ''}
                                onChange={(e) => setTipoRestauracion(prev => ({ ...prev, otro: e.target.value }))}
                                placeholder="Especifique..."
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* 3. DIENTES INVOLUCRADOS & PREPARACIÓN */}
                    <div className="space-y-4">
                        <LabToothArchDiagram
                            selectedTeeth={selectedTeeth}
                            onToothToggle={handleToothToggle}
                        />

                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            {/* Tipo de Preparación */}
                            <div>
                                <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-2 border-b pb-1 border-gray-100 dark:border-gray-700">
                                    Tipo de Preparación:
                                </h4>
                                <div className="space-y-1">
                                    {['Hombro', 'Chaflán', 'Vertical', 'BOPT', 'Chamfer Modificado', 'Sin Preparación'].map(prep => (
                                        <label key={prep} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="preparacion"
                                                checked={preparacion === prep}
                                                onChange={() => setPreparacion(prep)}
                                                className="w-3.5 h-3.5 text-blue-600"
                                            />
                                            <span>{prep}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Lado */}
                            <div>
                                <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-2 border-b pb-1 border-gray-100 dark:border-gray-700">
                                    Lado:
                                </h4>
                                <div className="space-y-1">
                                    {[
                                        { key: 'derecho', label: 'Derecho' },
                                        { key: 'izquierdo', label: 'Izquierdo' },
                                        { key: 'anterior', label: 'Anterior' },
                                        { key: 'posterior', label: 'Posterior' },
                                    ].map(l => (
                                        <label key={l.key} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(lado[l.key])}
                                                onChange={(e) => setLado(prev => ({ ...prev, [l.key]: e.target.checked }))}
                                                className="w-3.5 h-3.5 rounded text-blue-600"
                                            />
                                            <span>{l.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* GRID 3 COLUMNAS: MATERIAL SOLICITADO + COLOR Y CARACTERIZACIONES + OCLUSIÓN */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* 4. MATERIAL SOLICITADO */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700">
                                4. MATERIAL SOLICITADO
                            </h3>
                            <div className="space-y-1.5 text-xs">
                                {[
                                    { key: 'zirconia_monolitica', label: 'Zirconia Monolítica' },
                                    { key: 'zirconia_estratificada', label: 'Zirconia Estratificada' },
                                    { key: 'disilicato_litio', label: 'Disilicato de Litio' },
                                    { key: 'feldespatica', label: 'Feldespática' },
                                    { key: 'metal_ceramica', label: 'Metal Cerámica' },
                                    { key: 'metal', label: 'Metal' },
                                    { key: 'pmma', label: 'PMMA' },
                                    { key: 'resina_cad_cam', label: 'Resina CAD/CAM' },
                                    { key: 'titanio', label: 'Titanio' },
                                    { key: 'cromo_cobalto', label: 'Cromo Cobalto' },
                                    { key: 'acrilico', label: 'Acrílico' },
                                ].map(mat => (
                                    <label key={mat.key} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(material[mat.key])}
                                            onChange={(e) => setMaterial(prev => ({ ...prev, [mat.key]: e.target.checked }))}
                                            className="w-3.5 h-3.5 rounded text-blue-600"
                                        />
                                        <span>{mat.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                            <input
                                type="text"
                                value={material.otro || ''}
                                onChange={(e) => setMaterial(prev => ({ ...prev, otro: e.target.value }))}
                                placeholder="Otro Material..."
                                className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                            />
                        </div>
                    </div>

                    {/* 5. COLOR Y CARACTERIZACIONES */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700">
                                5. COLOR Y CARACTERIZACIONES
                            </h3>
                            <div className="space-y-2 text-xs mb-3">
                                <div>
                                    <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Color Principal:</label>
                                    <input
                                        type="text"
                                        name="color"
                                        value={formData.color || ''}
                                        onChange={handleChange}
                                        placeholder="Ej. A2, A3, BL2"
                                        className="w-full px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none text-xs transition-all shadow-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Color Muñón:</label>
                                    <input
                                        type="text"
                                        value={caracterizaciones.color_munon || ''}
                                        onChange={(e) => setCaracterizaciones(prev => ({ ...prev, color_munon: e.target.value }))}
                                        placeholder="Ej. ND2, ND3"
                                        className="w-full px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs transition-all shadow-sm"
                                    />
                                </div>
                            </div>

                            <h4 className="font-bold text-gray-800 dark:text-gray-200 text-xs mb-1.5 border-b pb-0.5 border-gray-100 dark:border-gray-700">
                                Caracterizaciones:
                            </h4>
                            <div className="grid grid-cols-2 gap-1.5 text-xs">
                                {[
                                    { key: 'cervical', label: 'Cervical' },
                                    { key: 'incisal', label: 'Incisal' },
                                    { key: 'halo', label: 'Halo' },
                                    { key: 'craquelado', label: 'Craquelado' },
                                    { key: 'opalescencia', label: 'Opalescencia' },
                                    { key: 'fluorescencia', label: 'Fluorescencia' },
                                    { key: 'fotografias_adjuntas', label: 'Fotos Adjuntas' },
                                    { key: 'escaneo_facial', label: 'Escaneo Facial' },
                                ].map(car => (
                                    <label key={car.key} className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(caracterizaciones[car.key])}
                                            onChange={(e) => setCaracterizaciones(prev => ({ ...prev, [car.key]: e.target.checked }))}
                                            className="w-3.5 h-3.5 rounded text-blue-600 accent-blue-600"
                                        />
                                        <span>{car.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 6. OCLUSIÓN */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700">
                                6. OCLUSIÓN
                            </h3>
                            <div className="space-y-1.5 text-xs mb-3">
                                {[
                                    { key: 'mi', label: 'MI (Máxima Intercuspidación)' },
                                    { key: 'rc', label: 'RC (Relación Céntrica)' },
                                    { key: 'guia_canina', label: 'Guía Canina' },
                                    { key: 'funcion_grupo', label: 'Función de Grupo' },
                                    { key: 'mordida_abierta', label: 'Mordida Abierta' },
                                    { key: 'mordida_cruzada', label: 'Mordida Cruzada' },
                                ].map(ocl => (
                                    <label key={ocl.key} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(oclusion[ocl.key])}
                                            onChange={(e) => setOclusion(prev => ({ ...prev, [ocl.key]: e.target.checked }))}
                                            className="w-3.5 h-3.5 rounded text-blue-600 accent-blue-600"
                                        />
                                        <span>{ocl.label}</span>
                                    </label>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">Sobremordida (mm):</label>
                                    <input
                                        type="text"
                                        value={oclusion.sobremordida_mm || ''}
                                        onChange={(e) => setOclusion(prev => ({ ...prev, sobremordida_mm: e.target.value }))}
                                        placeholder="mm"
                                        className="w-full px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs transition-all shadow-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">Resalte (mm):</label>
                                    <input
                                        type="text"
                                        value={oclusion.resalte_mm || ''}
                                        onChange={(e) => setOclusion(prev => ({ ...prev, resalte_mm: e.target.value }))}
                                        placeholder="mm"
                                        className="w-full px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs transition-all shadow-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <textarea
                                value={oclusion.observaciones || ''}
                                onChange={(e) => setOclusion(prev => ({ ...prev, observaciones: e.target.value }))}
                                rows={2}
                                placeholder="Observaciones de Oclusión..."
                                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm resize-none"
                            ></textarea>
                        </div>
                    </div>
                </div>

                {/* GRID 2 COLUMNAS: INFORMACIÓN DIGITAL + IMPLANTOLOGÍA */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* 7. INFORMACIÓN DIGITAL */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700">
                            7. INFORMACIÓN DIGITAL
                        </h3>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1.5">
                                <label className="flex items-center gap-2 cursor-pointer font-bold">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(digital.escaneo_intraoral)}
                                        onChange={(e) => setDigital(prev => ({ ...prev, escaneo_intraoral: e.target.checked }))}
                                        className="w-3.5 h-3.5 rounded text-blue-600 accent-blue-600"
                                    />
                                    <span>Escaneo Intraoral</span>
                                </label>
                                <input
                                    type="text"
                                    value={digital.marca || ''}
                                    onChange={(e) => setDigital(prev => ({ ...prev, marca: e.target.value }))}
                                    placeholder="Marca..."
                                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                                />

                                <div className="flex gap-2 pt-1">
                                    {['stl', 'ply', 'dcm'].map(fmt => (
                                        <label key={fmt} className="flex items-center gap-1 cursor-pointer uppercase font-bold text-[10px]">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(digital[fmt])}
                                                onChange={(e) => setDigital(prev => ({ ...prev, [fmt]: e.target.checked }))}
                                                className="w-3 h-3 text-blue-600 accent-blue-600"
                                            />
                                            <span>{fmt}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                {[
                                    { key: 'cbct', label: 'CBCT' },
                                    { key: 'fotografias', label: 'Fotografías' },
                                    { key: 'diseno_exocad', label: 'Diseño Exocad' },
                                    { key: 'diseno_3shape', label: 'Diseño 3Shape' },
                                    { key: 'smile_design', label: 'Smile Design' },
                                ].map(dig => (
                                    <label key={dig.key} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(digital[dig.key])}
                                            onChange={(e) => setDigital(prev => ({ ...prev, [dig.key]: e.target.checked }))}
                                            className="w-3.5 h-3.5 rounded text-blue-600 accent-blue-600"
                                        />
                                        <span>{dig.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 8. IMPLANTOLOGÍA */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700">
                            8. IMPLANTOLOGÍA
                        </h3>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs mb-3">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">Sistema:</label>
                                <input
                                    type="text"
                                    value={implantologia.sistema || ''}
                                    onChange={(e) => setImplantologia(prev => ({ ...prev, sistema: e.target.value }))}
                                    placeholder="Sistema"
                                    className="w-full px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs transition-all shadow-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">Marca:</label>
                                <input
                                    type="text"
                                    value={implantologia.marca || ''}
                                    onChange={(e) => setImplantologia(prev => ({ ...prev, marca: e.target.value }))}
                                    placeholder="Marca"
                                    className="w-full px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs transition-all shadow-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">Diámetro (mm):</label>
                                <input
                                    type="text"
                                    value={implantologia.diametro_mm || ''}
                                    onChange={(e) => setImplantologia(prev => ({ ...prev, diametro_mm: e.target.value }))}
                                    placeholder="mm"
                                    className="w-full px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs transition-all shadow-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">Longitud (mm):</label>
                                <input
                                    type="text"
                                    value={implantologia.longitud_mm || ''}
                                    onChange={(e) => setImplantologia(prev => ({ ...prev, longitud_mm: e.target.value }))}
                                    placeholder="mm"
                                    className="w-full px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs transition-all shadow-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">Plataforma:</label>
                                <input
                                    type="text"
                                    value={implantologia.plataforma || ''}
                                    onChange={(e) => setImplantologia(prev => ({ ...prev, plataforma: e.target.value }))}
                                    placeholder="Plataforma"
                                    className="w-full px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs transition-all shadow-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">Torque (Ncm):</label>
                                <input
                                    type="text"
                                    value={implantologia.torque_ncm || ''}
                                    onChange={(e) => setImplantologia(prev => ({ ...prev, torque_ncm: e.target.value }))}
                                    placeholder="Ncm"
                                    className="w-full px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs transition-all shadow-sm"
                                />
                            </div>
                        </div>

                        <h4 className="font-bold text-gray-800 dark:text-gray-200 text-xs mb-1.5 border-b pb-0.5 border-gray-100 dark:border-gray-700">
                            Componentes:
                        </h4>
                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                            {[
                                { key: 'transfer', label: 'Transfer' },
                                { key: 'analogo', label: 'Análogo' },
                                { key: 'pilar_titanio', label: 'Pilar Titanio' },
                                { key: 'pilar_ucla', label: 'Pilar UCLA' },
                                { key: 'tibase', label: 'TiBase' },
                                { key: 'pilar_personalizado', label: 'Pilar Personalizado' },
                                { key: 'tornillo_nuevo', label: 'Tornillo Nuevo' },
                                { key: 'tornillo_reutilizado', label: 'Tornillo Reutilizado' },
                            ].map(cmp => (
                                <label key={cmp.key} className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(implantologia[cmp.key])}
                                        onChange={(e) => setImplantologia(prev => ({ ...prev, [cmp.key]: e.target.checked }))}
                                        className="w-3.5 h-3.5 rounded text-blue-600"
                                    />
                                    <span>{cmp.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 9. FASE DE LABORATORIO (PROCESO INTERACTIVO CON CÍRCULOS Y MULTI-SELECCIÓN) */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-2 mb-4 border-gray-100 dark:border-gray-700 gap-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-500" />
                            9. FASE DE LABORATORIO (Puede marcar una o varias fases)
                        </h3>
                        {formData.fase_laboratorio && (
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                                Marcadas: {formData.fase_laboratorio}
                            </span>
                        )}
                    </div>

                    <div className="overflow-x-auto pb-4">
                        <div className="flex flex-col gap-8 min-w-[700px] px-4 py-2">
                            
                            {/* ROW 1: Recepción -> Modelo -> Diseño -> Fresado -> Sinterizado -> Estratificación */}
                            <div className="flex items-center justify-between relative">
                                {[
                                    { key: 'Recepción', label: 'Recepción', svg: (sel: boolean) => (
                                        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke={sel ? '#ffffff' : '#1e3a8a'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12,3 C14,3 15.5,4.5 15.5,6.5 V8 C18,8.5 20,10 20,13 L19.2,19 C18.8,21 16.5,21 12,21 C7.5,21 5.2,21 4.8,19 L4,13 C4,10 6,8.5 8.5,8 V6.5 C8.5,4.5 10,3 12,3 Z" />
                                            <line x1="12" y1="3" x2="12" y2="8" opacity="0.5" />
                                        </svg>
                                    )},
                                    { key: 'Modelo', label: 'Modelo', svg: (sel: boolean) => (
                                        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke={sel ? '#ffffff' : '#1e3a8a'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M4,13 C4,7 7.5,4 12,4 C16.5,4 20,7 20,13" />
                                            <rect x="3" y="13" width="18" height="5" rx="1.5" fill={sel ? '#2563eb' : '#e5e7eb'} stroke={sel ? '#ffffff' : '#1e3a8a'} />
                                            <path d="M7,13 V9 M12,13 V7 M17,13 V9" />
                                        </svg>
                                    )},
                                    { key: 'Diseño', label: 'Diseño', svg: (sel: boolean) => (
                                        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke={sel ? '#ffffff' : '#1e3a8a'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="4" width="18" height="12" rx="2" />
                                            <path d="M8,20 H16 M12,16 V20 M9,10 C9,8 15,8 15,10 C15,13 9,13 9,10" />
                                            <circle cx="12" cy="10" r="1.5" fill={sel ? '#ffffff' : '#1e3a8a'} />
                                        </svg>
                                    )},
                                    { key: 'Fresado', label: 'Fresado', svg: (sel: boolean) => (
                                        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke={sel ? '#ffffff' : '#1e3a8a'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12,2 V7 M10,7 H14 M10,7 L9,11 V17 L12,21 L15,17 V11 L14,7 Z" />
                                            <line x1="9" y1="13" x2="15" y2="13" />
                                            <line x1="10" y1="15" x2="14" y2="15" />
                                        </svg>
                                    )},
                                    { key: 'Sinterizado', label: 'Sinterizado', svg: (sel: boolean) => (
                                        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke={sel ? '#ffffff' : '#1e3a8a'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="4" y="5" width="16" height="14" rx="3" />
                                            <path d="M8,11 C8,9 11,9 12,11 C13,9 16,9 16,11" />
                                            <line x1="8" y1="15" x2="16" y2="15" />
                                        </svg>
                                    )},
                                    { key: 'Estratificación', label: 'Estratificación', svg: (sel: boolean) => (
                                        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke={sel ? '#ffffff' : '#1e3a8a'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M5,10 C5,5 19,5 19,10 C19,16 16,19 12,19 C8,19 5,16 5,10 Z" />
                                            <path d="M5,10 C9,11 15,11 19,10" />
                                            <path d="M6,14 C10,15 14,15 18,14" />
                                        </svg>
                                    )},
                                ].map((item, idx, arr) => {
                                    const currentFases = String(formData.fase_laboratorio || '').split(',').map(s => s.trim()).filter(Boolean);
                                    const isSelected = currentFases.includes(item.key);

                                    return (
                                        <React.Fragment key={item.key}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const nextFases = isSelected 
                                                        ? currentFases.filter(f => f !== item.key)
                                                        : [...currentFases, item.key];
                                                    const stringVal = nextFases.join(', ');
                                                    setFormData(prev => ({ ...prev, fase_laboratorio: stringVal }));
                                                }}
                                                className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none bg-transparent p-0 border-0 shadow-none hover:bg-transparent"
                                            >
                                                <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all ${
                                                    isSelected 
                                                        ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/30 scale-105' 
                                                        : 'bg-white border-blue-900 dark:border-blue-400 hover:bg-blue-50 shadow-sm'
                                                }`}>
                                                    {item.svg(isSelected)}
                                                </div>

                                                <span className={`text-[11px] font-bold mt-1.5 text-center max-w-[80px] leading-tight ${
                                                    isSelected ? 'text-blue-700 dark:text-blue-300 font-extrabold' : 'text-gray-700 dark:text-gray-300'
                                                }`}>
                                                    {item.label}
                                                </span>

                                                {isSelected && (
                                                    <span className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    </span>
                                                )}
                                            </button>

                                            {idx < arr.length - 1 && (
                                                <div className="flex-1 flex justify-center text-gray-300 dark:text-gray-600 font-bold">
                                                    ➔
                                                </div>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>

                            {/* ROW CONNECTOR BENDING ARROW */}
                            <div className="flex justify-end pr-8 -my-3">
                                <div className="text-gray-300 dark:text-gray-600 text-xl font-bold">
                                    │<br/>▼
                                </div>
                            </div>

                            {/* ROW 2: Pulido -> Glaseado -> Control -> Entregado */}
                            <div className="flex items-center justify-start gap-12 pl-12 relative">
                                {[
                                    { key: 'Pulido', label: 'Pulido', svg: (sel: boolean) => (
                                        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke={sel ? '#ffffff' : '#1e3a8a'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M4,20 L14,10 M12,8 L16,12 M15,5 L19,9 M14,10 L17,7" />
                                            <path d="M19,3 L21,5" strokeWidth="2.5" />
                                        </svg>
                                    )},
                                    { key: 'Glaseado', label: 'Glaseado', svg: (sel: boolean) => (
                                        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke={sel ? '#ffffff' : '#1e3a8a'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M9,3 H15 V6 H9 Z" />
                                            <path d="M6,8 C6,8 5,12 5,15 C5,19 8,21 12,21 C16,21 19,19 19,15 C19,12 18,8 18,8 Z" />
                                            <path d="M9,12 L12,15 M10,9 H14" opacity="0.6" />
                                        </svg>
                                    )},
                                    { key: 'Control', label: 'Control', svg: (sel: boolean) => (
                                        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke={sel ? '#ffffff' : '#1e3a8a'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="4" y="4" width="16" height="16" rx="3" />
                                            <path d="M8,12 L11,15 L16,9" strokeWidth="2.5" />
                                        </svg>
                                    )},
                                    { key: 'Entregado', label: 'Entregado', svg: (sel: boolean) => (
                                        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke={sel ? '#ffffff' : '#1e3a8a'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="4" y="4" width="16" height="16" rx="3" />
                                            <path d="M8,11 L11,14 L16,8" strokeWidth="2" />
                                            <circle cx="12" cy="12" r="7" strokeDasharray="3 2" opacity="0.6" />
                                        </svg>
                                    )},
                                ].map((item, idx, arr) => {
                                    const currentFases = String(formData.fase_laboratorio || '').split(',').map(s => s.trim()).filter(Boolean);
                                    const isSelected = currentFases.includes(item.key);

                                    return (
                                        <React.Fragment key={item.key}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const nextFases = isSelected 
                                                        ? currentFases.filter(f => f !== item.key)
                                                        : [...currentFases, item.key];
                                                    const stringVal = nextFases.join(', ');
                                                    setFormData(prev => ({ ...prev, fase_laboratorio: stringVal }));
                                                }}
                                                className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none bg-transparent p-0 border-0 shadow-none hover:bg-transparent"
                                            >
                                                <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all ${
                                                    isSelected 
                                                        ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/30 scale-105' 
                                                        : 'bg-white border-blue-900 dark:border-blue-400 hover:bg-blue-50 shadow-sm'
                                                }`}>
                                                    {item.svg(isSelected)}
                                                </div>

                                                <span className={`text-[11px] font-bold mt-1.5 text-center max-w-[80px] leading-tight ${
                                                    isSelected ? 'text-blue-700 dark:text-blue-300 font-extrabold' : 'text-gray-700 dark:text-gray-300'
                                                }`}>
                                                    {item.label}
                                                </span>

                                                {isSelected && (
                                                    <span className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    </span>
                                                )}
                                            </button>

                                            {idx < arr.length - 1 && (
                                                <div className="text-gray-300 dark:text-gray-600 font-bold">
                                                    ➔
                                                </div>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>

                        </div>
                    </div>
                </div>

                {/* GRID 3 COLUMNAS: PRUEBAS + URGENCIA + FOTOGRAFÍAS / REFERENCIAS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* 10. PRUEBAS */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700">
                            10. PRUEBAS
                        </h3>
                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                            {[
                                { key: 'cera', label: 'Cera' },
                                { key: 'metal', label: 'Metal' },
                                { key: 'bizcocho', label: 'Bizcocho' },
                                { key: 'pmma', label: 'PMMA' },
                                { key: 'impresion', label: 'Impresión' },
                                { key: 'escaneo', label: 'Escaneo' },
                                { key: 'ajuste', label: 'Ajuste' },
                                { key: 'oclusion', label: 'Oclusión' },
                                { key: 'estetica', label: 'Estética' },
                                { key: 'aprobado', label: 'Aprobado' },
                            ].map(pru => (
                                <label key={pru.key} className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(pruebas[pru.key])}
                                        onChange={(e) => setPruebas(prev => ({ ...prev, [pru.key]: e.target.checked }))}
                                        className="w-3.5 h-3.5 rounded text-blue-600 accent-blue-600"
                                    />
                                    <span>{pru.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* 11. URGENCIA */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700">
                            11. URGENCIA
                        </h3>
                        <div className="space-y-2 text-xs">
                            {[
                                { key: 'Normal', label: '⚪ Normal', color: 'text-gray-700 dark:text-gray-300' },
                                { key: 'Prioritario', label: '🟡 Prioritario', color: 'text-yellow-600 dark:text-yellow-400 font-bold' },
                                { key: 'Urgente 24 h', label: '🟠 Urgente 24 h', color: 'text-orange-600 dark:text-orange-400 font-bold' },
                                { key: 'Express', label: '🔴 Express', color: 'text-red-600 dark:text-red-400 font-black' },
                            ].map(urg => (
                                <label key={urg.key} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-blue-50/50 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="urgencia"
                                        checked={urgencia === urg.key}
                                        onChange={() => setUrgencia(urg.key)}
                                        className="w-4 h-4 text-blue-600 accent-blue-600"
                                    />
                                    <span className={urg.color}>{urg.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* FOTOGRAFÍAS / REFERENCIAS */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700 flex items-center gap-1.5">
                                <ImageIcon className="w-4 h-4 text-blue-600" />
                                FOTOGRAFÍAS / REFERENCIAS
                            </h3>

                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-3 border-2 border-dashed border-blue-400 dark:border-blue-600 hover:border-blue-600 rounded-xl flex flex-col items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-gray-700/60 hover:bg-blue-100/80 transition-all cursor-pointer mb-3 shadow-none"
                            >
                                <Upload className="w-6 h-6 text-blue-600 mb-1" />
                                Subir Imágenes de Referencia
                            </button>

                            {/* Previews grid */}
                            <div className="grid grid-cols-3 gap-2 max-h-[140px] overflow-y-auto">
                                {existingPhotos.map((photo, idx) => (
                                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 aspect-square bg-gray-100">
                                        <img src={getImageUrl(photo)} alt="Referencia" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeExistingPhoto(idx)}
                                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700 transition-all transform hover:scale-110"
                                            title="Eliminar imagen existente"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                                {refPreviews.map((preview, idx) => (
                                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-blue-300 dark:border-blue-600 aspect-square bg-gray-100">
                                        <img src={preview} alt="Prev" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeRefFile(idx)}
                                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 shadow-md hover:bg-red-700"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 12. CONTROL DE TIEMPOS Y ESTADO DEL TRABAJO */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        12. CONTROL DE TIEMPOS Y ESTADO DEL TRABAJO
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 text-xs">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                                Estado del Trabajo:
                            </label>
                            <select
                                name="estado"
                                value={formData.estado || 'no terminado'}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData(prev => ({
                                        ...prev,
                                        estado: val,
                                        fecha_terminado: val === 'terminado' && !prev.fecha_terminado ? getLocalDate() : (val === 'no terminado' ? '' : prev.fecha_terminado)
                                    }));
                                }}
                                className={`w-full px-3 py-2 rounded-xl border font-bold outline-none text-xs transition-all shadow-sm ${
                                    formData.estado === 'terminado' || formData.estado === 'entregado'
                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 focus:ring-2 focus:ring-emerald-500'
                                        : 'border-amber-300 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 focus:ring-2 focus:ring-amber-500'
                                }`}
                            >
                                <option value="no terminado">⌛ No Terminado</option>
                                <option value="terminado">✅ Terminado</option>
                                <option value="entregado">📦 Entregado</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                                Fecha Registro / Envío:
                            </label>
                            <input
                                type="date"
                                name="fecha"
                                value={formData.fecha || ''}
                                onChange={handleChange}
                                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium transition-all shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                                Hora de Envío:
                            </label>
                            <input
                                type="time"
                                name="hora_envio"
                                value={formData.hora_envio || ''}
                                onChange={handleChange}
                                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium transition-all shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                                Prueba Estimada:
                            </label>
                            <input
                                type="date"
                                name="fecha_prueba_estimada"
                                value={formData.fecha_prueba_estimada || ''}
                                onChange={handleChange}
                                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-amber-700 dark:text-amber-300 font-bold focus:ring-2 focus:ring-blue-500 outline-none text-xs transition-all shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                                Entrega Estimada:
                            </label>
                            <input
                                type="date"
                                name="fecha_pedido"
                                value={formData.fecha_pedido || ''}
                                onChange={handleChange}
                                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-300 font-bold focus:ring-2 focus:ring-blue-500 outline-none text-xs transition-all shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                                Entrega Real (Fecha Terminado):
                            </label>
                            <input
                                type="date"
                                name="fecha_terminado"
                                value={formData.fecha_terminado || ''}
                                onChange={handleChange}
                                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-300 font-bold focus:ring-2 focus:ring-blue-500 outline-none text-xs transition-all shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* 13. OBSERVACIONES CLÍNICAS / INSTRUCCIONES ESPECIALES */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        13. OBSERVACIONES CLÍNICAS / INSTRUCCIONES ESPECIALES
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">Línea Media:</label>
                            <input
                                type="text"
                                value={obsClinicas.linea_media || ''}
                                onChange={(e) => setObsClinicas(prev => ({ ...prev, linea_media: e.target.value }))}
                                placeholder="Ej. Centrada / Desviada"
                                className="w-full px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs transition-all shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">Plano Oclusal:</label>
                            <input
                                type="text"
                                value={obsClinicas.plano_oclusal || ''}
                                onChange={(e) => setObsClinicas(prev => ({ ...prev, plano_oclusal: e.target.value }))}
                                placeholder="Plano Oclusal"
                                className="w-full px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs transition-all shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">Papilas:</label>
                            <input
                                type="text"
                                value={obsClinicas.papilas || ''}
                                onChange={(e) => setObsClinicas(prev => ({ ...prev, papilas: e.target.value }))}
                                placeholder="Papilas"
                                className="w-full px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs transition-all shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">Perfil de Emergencia:</label>
                            <input
                                type="text"
                                value={obsClinicas.perfil_emergencia || ''}
                                onChange={(e) => setObsClinicas(prev => ({ ...prev, perfil_emergencia: e.target.value }))}
                                placeholder="Perfil de Emergencia"
                                className="w-full px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs transition-all shadow-sm"
                            />
                        </div>
                    </div>

                    <textarea
                        name="observacion"
                        value={formData.observacion || ''}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Instrucciones especiales para el técnico ceramista / laboratorio..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium transition-all shadow-sm resize-none"
                    ></textarea>
                </div>

                {/* 14. CONTROL DE CALIDAD */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        14. CONTROL DE CALIDAD
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {[
                            { key: 'contactos_revisados', label: 'Contactos revisados' },
                            { key: 'oclusion_revisada', label: 'Oclusión revisada' },
                            { key: 'pulido', label: 'Pulido' },
                            { key: 'ajuste_pasivo', label: 'Ajuste pasivo' },
                            { key: 'torque_verificado', label: 'Torque verificado' },
                            { key: 'radiografia_comprobada', label: 'Radiografía comprobada' },
                            { key: 'esterilizado', label: 'Esterilizado / Desinfectado' },
                        ].map(cal => (
                            <label key={cal.key} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                <input
                                    type="checkbox"
                                    checked={Boolean(controlCalidad[cal.key])}
                                    onChange={(e) => setControlCalidad(prev => ({ ...prev, [cal.key]: e.target.checked }))}
                                    className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="font-medium">{cal.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* BOTONES ACCIÓN UNIFICADOS CON EL RESTO DEL SISTEMA */}
                <div className="flex justify-center items-center gap-4 pt-6 pb-2 border-t border-gray-200 dark:border-gray-800">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-10 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold flex items-center gap-2 transform hover:-translate-y-1 transition-all shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                        <Save size={20} />
                        {isSaving ? 'Guardando Orden...' : isEditing ? 'Actualizar Orden' : 'Guardar Orden de Trabajo'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/trabajos-laboratorios')}
                        className="px-10 py-3 rounded-xl bg-gray-500 hover:bg-gray-600 text-white font-bold flex items-center gap-2 transform hover:-translate-y-1 transition-all shadow-lg active:scale-95 cursor-pointer"
                    >
                        <X size={20} />
                        Cancelar
                    </button>
                </div>

            </form>

            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Orden de Trabajo de Laboratorio"
                sections={manualSections}
            />
        </div>
    );
};

export default TrabajosLaboratoriosForm;
