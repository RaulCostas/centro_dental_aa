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


                    </div>
                </div>

                {/* GRID 2 COLUMNAS: MATERIAL SOLICITADO + COLOR Y CARACTERIZACIONES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 4. MATERIAL SOLICITADO */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700">
                                4. MATERIAL SOLICITADO
                            </h3>
                            <div className="space-y-1.5 text-xs">
                                {[
                                    { key: 'zirconia', label: 'Zirconia' },
                                    { key: 'disilicato_litio', label: 'Disilicato de Litio' },
                                    { key: 'metal_ceramica', label: 'Metal Cerámica' },
                                    { key: 'pmma', label: 'PMMA' },
                                    { key: 'resina_cad_cam', label: 'Resina CAD/CAM' },
                                    { key: 'cromo_cobalto', label: 'Cromo Cobalto' },
                                    { key: 'acrilico', label: 'Acrílico' },
                                    { key: 'ceramage', label: 'Ceramage' },
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
                            </div>

                            <h4 className="font-bold text-gray-800 dark:text-gray-200 text-xs mb-1.5 border-b pb-0.5 border-gray-100 dark:border-gray-700">
                                Caracterizaciones:
                            </h4>
                            <div>
                                <textarea
                                    value={caracterizaciones.detalle || ''}
                                    onChange={(e) => setCaracterizaciones(prev => ({ ...prev, detalle: e.target.value }))}
                                    placeholder="Describa las caracterizaciones..."
                                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs transition-all shadow-sm"
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* GRID 2 COLUMNAS: INFORMACIÓN DIGITAL + IMPLANTOLOGÍA */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* 6. INFORMACIÓN DIGITAL */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700">
                            6. INFORMACIÓN DIGITAL
                        </h3>
                        <div className="space-y-3 text-xs">
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
                        </div>
                    </div>

                    {/* 7. IMPLANTOLOGÍA */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700">
                            7. IMPLANTOLOGÍA
                        </h3>
                        <div>
                            <textarea
                                value={implantologia.detalle || ''}
                                onChange={(e) => setImplantologia(prev => ({ ...prev, detalle: e.target.value }))}
                                placeholder="Describa los detalles de implantología..."
                                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs transition-all shadow-sm"
                                rows={3}
                            />
                        </div>
                    </div>
                </div>

                {/* GRID 3 COLUMNAS: PRUEBAS + URGENCIA + FOTOGRAFÍAS / REFERENCIAS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* 8. PRUEBAS */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700">
                            8. PRUEBAS
                        </h3>
                        <div className="grid grid-cols-2 gap-1.5 text-xs mb-3">
                            {[
                                { key: 'cera', label: 'Cera' },
                                { key: 'metal', label: 'Metal' },
                                { key: 'bizcocho', label: 'Bizcocho' },
                                { key: 'oclusion', label: 'Oclusión' },
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
                        <textarea
                            value={pruebas.detalle || ''}
                            onChange={(e) => setPruebas(prev => ({ ...prev, detalle: e.target.value }))}
                            placeholder="Detalle de las pruebas..."
                            className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs transition-all shadow-sm"
                            rows={3}
                        />
                    </div>

                    {/* 9. URGENCIA */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700">
                            9. URGENCIA
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

                {/* 10. CONTROL DE TIEMPOS Y ESTADO DEL TRABAJO */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        10. CONTROL DE TIEMPOS Y ESTADO DEL TRABAJO
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
                                Hora de Entrega:
                            </label>
                            <input
                                type="time"
                                name="hora_entrega"
                                value={(formData as any).hora_entrega || ''}
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

                {/* 11. OBSERVACIONES CLÍNICAS / INSTRUCCIONES ESPECIALES */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        11. OBSERVACIONES CLÍNICAS / INSTRUCCIONES ESPECIALES
                    </h3>

                    <textarea
                        name="observacion"
                        value={formData.observacion || ''}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Instrucciones especiales para el técnico ceramista / laboratorio..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium transition-all shadow-sm resize-none"
                    ></textarea>
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
