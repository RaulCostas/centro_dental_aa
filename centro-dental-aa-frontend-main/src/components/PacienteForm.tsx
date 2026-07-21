import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';
import ManualModal, { type ManualSection } from './ManualModal';
import SignatureModal from './SignatureModal';
import { getLocalDateString } from '../utils/dateUtils';
import { ArrowLeft, User, Users, Activity, Wind, Info, Edit, Mail, Calendar, MapPin, Phone, Briefcase, HelpCircle, Save, X, Fingerprint, Search, Plus, Shield } from 'lucide-react';

const PacienteForm: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams<{ id: string }>();
    const isEditing = !!id;
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [showManual, setShowManual] = useState(false);

    // New state for phone country code
    const [countryCode, setCountryCode] = useState('+591');
    const [localCelular, setLocalCelular] = useState('');
    const [tutorCountryCode, setTutorCountryCode] = useState('+591');
    const [tutorLocalCelular, setTutorLocalCelular] = useState('');
    const [newPatientId, setNewPatientId] = useState<number | null>(null);

    const countryCodes = [
        { code: '+591', label: '🇧🇴 +591' },
        { code: '+54', label: '🇦🇷 +54' },
        { code: '+55', label: '🇧🇷 +55' },
        { code: '+56', label: '🇨🇱 +56' },
        { code: '+51', label: '🇵🇪 +51' },
        { code: '+595', label: '🇵🇾 +595' },
        { code: '+598', label: '🇺🇾 +598' },
        { code: '+57', label: '🇨🇴 +57' },
        { code: '+52', label: '🇲🇽 +52' },
        { code: '+34', label: '🇪🇸 +34' },
        { code: '+1', label: '🇺🇸 +1' },
    ];

    useEffect(() => {
        if (location.state?.openSignature) {
            setShowSignatureModal(true);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const manualSections: ManualSection[] = [
        {
            title: 'Registro de Pacientes',
            content: 'Complete la filiación y antecedentes médicos. Los campos con * son obligatorios.'
        }
    ];

    const [formData, setFormData] = useState({
        fecha_ingreso: getLocalDateString(),
        paterno: '',
        materno: '',
        nombre: '',
        fecha_nacimiento: '',
        genero: '',
        ci: '',
        direccion: '',
        ocupacion: '',
        telefono_celular: '',
        email: '',
        tutor_nombre: '',
        tutor_ci: '',
        tutor_celular: '',
        estado_civil: 'Soltero',
        grado_instruccion: 'Ninguna',
        seguroId: '' as string | number,
        persona_brinda_informacion: '',
        estado: 'activo',
        // NUEVA FICHA CLÍNICA
        motivo_consulta: '',
        ant_pat_familiares: '',
        ant_pat_anemia: false,
        ant_pat_cardiopatias: false,
        ant_pat_gastricas: false,
        ant_pat_hepatitis: false,
        ant_pat_tuberculosis: false,
        ant_pat_asma: false,
        ant_pat_diabetes: false,
        ant_pat_epilepsia: false,
        ant_pat_hipertension: false,
        ant_pat_vih: false,
        ant_pat_ninguno: false,
        ant_pat_cirugia: false,
        ant_pat_cirugia_detalle: '',
        ant_pat_otros: '',
        ant_pat_alergias: false,
        ant_pat_alergias_detalle: '',
        ant_pat_embarazo: false,
        ant_pat_embarazo_semanas: '' as string | number,
        ant_pat_tratamiento_medico: false,
        ant_pat_tratamiento_medico_detalle: '',
        ant_pat_toma_medicamentos: false,
        ant_pat_toma_medicamentos_detalle: '',
        ant_pat_hemorragias: false,
        ant_pat_hemorragias_tipo: '',
        exam_extra_atm: '',
        exam_extra_ganglios: '',
        exam_extra_respirador: '',
        exam_extra_otros: '',
        exam_intra_labios: '',
        exam_intra_lengua: '',
        exam_intra_paladar: '',
        exam_intra_piso_boca: '',
        exam_intra_mucosa_yugal: '',
        exam_intra_encias: '',
        exam_intra_protesis: false,
        ant_buco_ultima_visita: '',
        habito_fuma: false,
        habito_bebe: false,
        habito_otros: '',
        hig_cepillo: false,
        hig_hilo: false,
        hig_enjuague: false,
        hig_waterpik: false,
        hig_frecuencia_cepillado: '',
        hig_sangrado_encias: false,
        hig_bucal_estado: '',
        observaciones_ficha: '',
    });

    const handleVolver = () => {
        navigate(`/pacientes`);
    };

    const [seguros, setSeguros] = useState<any[]>([]);

    const fetchSeguros = async () => {
        try {
            const response = await api.get('/seguro?page=1&limit=9999');
            setSeguros(response.data.data || []);
        } catch (error) {
            console.error('Error fetching seguros:', error);
        }
    };

    useEffect(() => {
        fetchSeguros();
        if (isEditing) {
            fetchPaciente();
        }
    }, [id]);



    const fetchPaciente = async () => {
        try {
            const response = await api.get(`/pacientes/${id}`);
            const data = response.data;
            
            // Flatten fichaClinica into the main object so the form fields can read it
            const flatData = {
                ...data,
                ...(data.fichaClinica || {})
            };
            setFormData(flatData);

            // Handle splitting telefono_celular into code and number
            if (flatData.telefono_celular) {
                const celularStr = String(flatData.telefono_celular);
                const foundCode = countryCodes.find(c => celularStr.startsWith(c.code));
                if (foundCode) {
                    setCountryCode(foundCode.code);
                    setLocalCelular(celularStr.substring(foundCode.code.length));
                } else {
                    setLocalCelular(celularStr);
                }
            }

            // Handle splitting tutor_celular into code and number
            if (flatData.tutor_celular) {
                const tutorCelularStr = String(flatData.tutor_celular);
                const foundTutorCode = countryCodes.find(c => tutorCelularStr.startsWith(c.code));
                if (foundTutorCode) {
                    setTutorCountryCode(foundTutorCode.code);
                    setTutorLocalCelular(tutorCelularStr.substring(foundTutorCode.code.length));
                } else {
                    setTutorLocalCelular(tutorCelularStr);
                }
            } else {
                setTutorLocalCelular('');
            }

            // Removed Odontogram Fetching - Moved to Clinical History
        } catch (error) {
            console.error('Error fetching paciente:', error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Error al cargar el paciente' });
        }
    };


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        const newValue = type === 'checkbox' ? checked : value;

        setFormData(prev => ({ ...prev, [name]: newValue }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Combine code and local number
        const fullCelular = `${countryCode}${localCelular}`;
        const fullTutorCelular = tutorLocalCelular ? `${tutorCountryCode}${tutorLocalCelular}` : '';

        // Create a clean payload removing null values
        const payload: any = { ...formData };
        Object.entries(payload).forEach(([key, value]) => {
            // Remove empty strings, null and undefined.
            // We prefer not to send empty strings to the backend as they might violate date/int formats.
            if (value === null || value === undefined || value === '') {
                delete payload[key];
            }
        });
        
        // Finalize cell number
        payload.telefono_celular = fullCelular;
        payload.tutor_celular = fullTutorCelular;

        // Add user ID for auditing
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                payload.usuarioId = JSON.parse(userStr).id;
            } catch (e) {
                console.error("Error parsing user for auditing", e);
            }
        }

        // Ensure no insurance fields are sent (security against residual state)
        Object.keys(payload).forEach(key => {
            // Remove any insurance-related field but KEEP 'particularidad' and 'seguroId'
            if ((key.toLowerCase().includes('particular') && key !== 'particularidad') || 
                (key.toLowerCase().includes('seguro') && key !== 'seguroId')) {
                delete payload[key];
            }
        });
        try {
            let targetId = isEditing ? Number(id) : null;
            if (isEditing) {
                await api.patch(`/pacientes/${id}`, payload);
                await Swal.fire({ icon: 'success', title: 'Actualizado', timer: 1500, showConfirmButton: false });
                handleVolver();
            } else {
                const response = await api.post('/pacientes', payload);
                targetId = response.data.id;
                setNewPatientId(targetId);
                
                await Swal.fire({ 
                    icon: 'success', 
                    title: '¡Ficha Creada!', 
                    text: 'Proceda a la firma digital del paciente.',
                    timer: 2000, 
                    showConfirmButton: false 
                });
                
                // Open Signature Modal
                setShowSignatureModal(true);
            }

            // Removed Odontogram Saving - Moved to Clinical History
        } catch (error: any) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'Error al guardar' });
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen mb-20 font-sans text-gray-800 dark:text-gray-100">
            <div className="flex items-center justify-between mb-10 border-b pb-4 border-gray-200 dark:border-gray-700">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-4">
                        <span className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400 shadow-sm border border-blue-200 dark:border-blue-800">
                            <Users size={32} />
                        </span>
                        <div>
                            {isEditing ? 'Historia Clínica' : 'Nuevo Paciente'}
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                                {isEditing ? 'Edición de filiación y antecedentes médicos' : 'Registro integral de datos y antecedentes médicos'}
                            </p>
                        </div>
                    </h1>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowManual(true)} 
                  className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors self-center mr-2"
                  title="Ayuda / Manual"
                >
                    ?
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* --- FILIACIÓN --- */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center mb-6 pb-2 border-b border-blue-500/20">
                        <User size={24} className="text-blue-600 mr-4" />
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">Filiación</h2>
                    </div>





                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Fecha Ingreso</label>
                            <div className="relative">
                                <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input type="date" name="fecha_ingreso" value={formData.fecha_ingreso} onChange={handleChange} className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                        <div className="md:col-span-2"></div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Paterno <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input type="text" name="paterno" value={formData.paterno} onChange={handleChange} required placeholder="Ej: Pérez" className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Materno</label>
                            <div className="relative">
                                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input type="text" name="materno" value={formData.materno} onChange={handleChange} placeholder="Ej: Gómez" className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Nombres <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required placeholder="Ej: Juan" className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Nacimiento <span className="text-red-500">*</span></label>
                            <div className="relative flex items-center gap-2">
                                <div className="relative flex-grow">
                                    <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleChange} required className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                {formData.fecha_nacimiento && (
                                    <div className="flex flex-col items-center bg-gray-100 dark:bg-gray-700 p-1 px-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 min-w-[50px]">
                                        <span className="text-[8px] font-black text-gray-400 uppercase">Edad</span>
                                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                            {(() => {
                                                const birthDate = new Date(formData.fecha_nacimiento);
                                                const today = new Date();
                                                let age = today.getFullYear() - birthDate.getFullYear();
                                                const m = today.getMonth() - birthDate.getMonth();
                                                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
                                                return age;
                                            })()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Género <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Users size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select name="genero" value={formData.genero} onChange={handleChange} required className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
                                    <option value="">-- Seleccionar --</option>
                                    <option value="M">Masculino</option>
                                    <option value="F">Femenino</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">C.I.</label>
                            <div className="relative">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input type="text" name="ci" value={formData.ci} onChange={handleChange} placeholder="Ej: 1234567" className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Dirección</label>
                            <div className="relative">
                                <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} placeholder="Ej: Av. Principal #123" className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Ocupación</label>
                            <div className="relative">
                                <Briefcase size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input type="text" name="ocupacion" value={formData.ocupacion} onChange={handleChange} placeholder="Ej: Estudiante" className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Teléfono/Celular <span className="text-red-500">*</span></label>
                            <div className="flex gap-2">
                                <select
                                    value={countryCode}
                                    onChange={(e) => setCountryCode(e.target.value)}
                                    className="py-2 px-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans text-sm"
                                >
                                    {countryCodes.map(c => (
                                        <option key={c.code} value={c.code}>{c.label}</option>
                                    ))}
                                </select>
                                <div className="relative flex-1">
                                    <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    <input 
                                        type="text" 
                                        value={localCelular} 
                                        onChange={(e) => setLocalCelular(e.target.value)} 
                                        required 
                                        placeholder="Ej: 70012345" 
                                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                                    />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Email</label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Ej: paciente@gmail.com" className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Estado Civil</label>
                            <div className="relative">
                                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select name="estado_civil" value={formData.estado_civil} onChange={handleChange} className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
                                    <option value="Soltero">Soltero(a)</option>
                                    <option value="Casado">Casado(a)</option>
                                    <option value="Viudo">Viudo(a)</option>
                                    <option value="Separado">Separado(a)</option>
                                    <option value="Conviviente">Conviviente</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Grado de Instrucción</label>
                            <div className="relative">
                                <Briefcase size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select name="grado_instruccion" value={formData.grado_instruccion} onChange={handleChange} className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
                                    <option value="Ninguna">Ninguna</option>
                                    <option value="Inicial">Inicial</option>
                                    <option value="Primaria">Primaria</option>
                                    <option value="Secundaria">Secundaria</option>
                                    <option value="Tecnico">Técnico</option>
                                    <option value="Universidad">Universidad</option>
                                    <option value="Profesional">Profesional</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Seguro / Convenio</label>
                            <div className="relative">
                                <Shield size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select 
                                    name="seguroId" 
                                    value={formData.seguroId || ''} 
                                    onChange={handleChange} 
                                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                >
                                    <option value="">-- Sin Seguro (Particular) --</option>
                                    {seguros.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* --- TUTOR Y ACOMPAÑANTE --- */}
                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center mb-6 pb-2 border-b border-gray-500/20">
                            <Info size={24} className="text-gray-600 mr-4" />
                            <h2 className="text-xl font-bold uppercase text-gray-800 dark:text-gray-100">Tutor y Acompañante</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Nombre Tutor</label>
                                <div className="relative">
                                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    <input type="text" name="tutor_nombre" value={formData.tutor_nombre} onChange={handleChange} placeholder="Nombre Tutor" className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">C.I. Tutor</label>
                                <div className="relative">
                                    <Fingerprint size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    <input type="text" name="tutor_ci" value={formData.tutor_ci} onChange={handleChange} placeholder="C.I. Tutor" className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Celular Tutor</label>
                                <div className="flex gap-2">
                                    <select
                                        value={tutorCountryCode}
                                        onChange={(e) => setTutorCountryCode(e.target.value)}
                                        className="py-2 px-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans text-sm"
                                    >
                                        {countryCodes.map(c => (
                                            <option key={c.code} value={c.code}>{c.label}</option>
                                        ))}
                                    </select>
                                    <div className="relative flex-1">
                                        <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                        <input 
                                            type="text" 
                                            value={tutorLocalCelular} 
                                            onChange={(e) => setTutorLocalCelular(e.target.value)} 
                                            placeholder="Celular Tutor" 
                                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Persona que brinda la información</label>
                            <div className="relative">
                                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input type="text" name="persona_brinda_informacion" value={formData.persona_brinda_informacion} onChange={handleChange} placeholder="Persona que brinda la información" className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- FICHA CLÍNICA DE ANTECEDENTES --- */}
                <div className="space-y-8 animate-slide-up">
                    {/* MOTIVO DE CONSULTA */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700 animate-slide-up">
                        <div className="flex items-center mb-6 pb-2 border-b border-blue-500/20">
                            <HelpCircle size={24} className="text-blue-600 mr-4" />
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">Motivo de Consulta</h2>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                Motivo de la consulta dental
                            </label>
                            <textarea 
                                name="motivo_consulta" 
                                value={formData.motivo_consulta || ''} 
                                onChange={handleChange} 
                                rows={2} 
                                placeholder="Describa brevemente el motivo de la consulta..." 
                                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none" 
                            />
                        </div>
                    </div>

                    {/* 1. ANTECEDENTES FAMILIARES */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center mb-6 pb-2 border-b border-indigo-500/20">
                            <Users size={24} className="text-indigo-600 mr-4" />
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">Antecedentes Familiares</h2>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                Enfermedades familiares hereditarias
                            </label>
                            <textarea 
                                name="ant_pat_familiares" 
                                value={formData.ant_pat_familiares || ''} 
                                onChange={handleChange} 
                                rows={3} 
                                placeholder="Especifique si algún familiar padece de Diabetes, Hipertensión, Cardiopatías, Cáncer, etc." 
                                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none" 
                            />
                        </div>
                    </div>

                    {/* 2. ANTECEDENTES PERSONALES PATOLÓGICOS */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-red-50 dark:border-red-900/30">
                        <div className="flex items-center mb-6 pb-2 border-b border-red-500/20">
                            <Activity size={24} className="text-red-600 mr-4" />
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">Antecedentes Personales Patológicos</h2>
                        </div>
                        
                        {/* Grid de checkboxes de enfermedades */}
                        <div className="mb-6">
                            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">Marque las condiciones que padece o ha padecido:</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
                                {[
                                    { id: 'ant_pat_anemia', label: 'Anemia' },
                                    { id: 'ant_pat_cardiopatias', label: 'Cardiopatías' },
                                    { id: 'ant_pat_gastricas', label: 'Enf. Gástricas' },
                                    { id: 'ant_pat_hepatitis', label: 'Hepatitis' },
                                    { id: 'ant_pat_tuberculosis', label: 'Tuberculosis' },
                                    { id: 'ant_pat_asma', label: 'Asma' },
                                    { id: 'ant_pat_diabetes', label: 'Diabetes' },
                                    { id: 'ant_pat_epilepsia', label: 'Epilepsia' },
                                    { id: 'ant_pat_hipertension', label: 'Hipertensión' },
                                    { id: 'ant_pat_vih', label: 'VIH' },
                                    { id: 'ant_pat_ninguno', label: 'Ninguno' },
                                ].map((cond) => (
                                    <label key={cond.id} className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                        <input 
                                            type="checkbox" 
                                            name={cond.id} 
                                            checked={!!formData[cond.id as keyof typeof formData]} 
                                            onChange={(e) => setFormData(prev => ({ ...prev, [cond.id]: e.target.checked }))} 
                                            className="w-5 h-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700" 
                                        />
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{cond.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Detalle de patologías complejas */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b pb-1">Detalle Médico Específico:</h3>
                            
                            {/* Cirugías */}
                            <div className="p-4 rounded-xl bg-red-50/30 dark:bg-red-900/10 border border-red-100/50 dark:border-red-900/20 md:flex md:items-center md:justify-between gap-6 space-y-3 md:space-y-0 animate-in fade-in slide-in-from-top-1">
                                <div className="md:w-1/3">
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 block">¿Tuvo alguna cirugía? / ¿Le realizaron alguna operación?</span>
                                </div>
                                <div className="flex gap-4">
                                    <label className="flex items-center cursor-pointer group">
                                        <input type="radio" checked={formData.ant_pat_cirugia === true} onChange={() => setFormData({ ...formData, ant_pat_cirugia: true })} className="hidden peer" />
                                        <div className="w-10 h-6 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center px-1 peer-checked:bg-red-500 transition-all after:w-4 after:h-4 after:bg-white after:rounded-full peer-checked:after:translate-x-4 shadow-inner"></div>
                                        <span className="ml-2 text-xs font-black text-gray-400 peer-checked:text-red-500">SÍ</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer group">
                                        <input type="radio" checked={formData.ant_pat_cirugia === false} onChange={() => setFormData({ ...formData, ant_pat_cirugia: false, ant_pat_cirugia_detalle: '' })} className="hidden peer" />
                                        <div className="w-10 h-6 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center px-1 peer-checked:bg-gray-400 transition-all after:w-4 after:h-4 after:bg-white after:rounded-full shadow-inner"></div>
                                        <span className="ml-2 text-xs font-black text-gray-400 peer-checked:text-gray-500">NO</span>
                                    </label>
                                </div>
                                <div className="flex-1">
                                    {formData.ant_pat_cirugia && (
                                        <div className="relative animate-in fade-in slide-in-from-top-1">
                                            <Edit size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400" />
                                            <input 
                                                type="text" 
                                                name="ant_pat_cirugia_detalle" 
                                                value={formData.ant_pat_cirugia_detalle || ''} 
                                                onChange={handleChange} 
                                                placeholder="Especifique qué tipo de cirugía y hace cuánto tiempo"
                                                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none focus:ring-4 focus:ring-red-500/10 transition-all font-medium" 
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Alergias */}
                            <div className="p-4 rounded-xl bg-red-50/30 dark:bg-red-900/10 border border-red-100/50 dark:border-red-900/20 md:flex md:items-center md:justify-between gap-6 space-y-3 md:space-y-0">
                                <div className="md:w-1/3">
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 block">¿Es alérgico a algún medicamento/sustancia?</span>
                                </div>
                                <div className="flex gap-4">
                                    <label className="flex items-center cursor-pointer group">
                                        <input type="radio" checked={formData.ant_pat_alergias === true} onChange={() => setFormData({ ...formData, ant_pat_alergias: true })} className="hidden peer" />
                                        <div className="w-10 h-6 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center px-1 peer-checked:bg-red-500 transition-all after:w-4 after:h-4 after:bg-white after:rounded-full peer-checked:after:translate-x-4 shadow-inner"></div>
                                        <span className="ml-2 text-xs font-black text-gray-400 peer-checked:text-red-500">SÍ</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer group">
                                        <input type="radio" checked={formData.ant_pat_alergias === false} onChange={() => setFormData({ ...formData, ant_pat_alergias: false, ant_pat_alergias_detalle: '' })} className="hidden peer" />
                                        <div className="w-10 h-6 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center px-1 peer-checked:bg-gray-400 transition-all after:w-4 after:h-4 after:bg-white after:rounded-full shadow-inner"></div>
                                        <span className="ml-2 text-xs font-black text-gray-400 peer-checked:text-gray-500">NO</span>
                                    </label>
                                </div>
                                <div className="flex-1">
                                    {formData.ant_pat_alergias && (
                                        <div className="relative animate-in fade-in slide-in-from-top-1">
                                            <Edit size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400" />
                                            <input 
                                                type="text" 
                                                name="ant_pat_alergias_detalle" 
                                                value={formData.ant_pat_alergias_detalle || ''} 
                                                onChange={handleChange} 
                                                placeholder="Ej: Penicilina, Látex, etc."
                                                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none focus:ring-4 focus:ring-red-500/10 transition-all font-medium" 
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Condicional Embarazo si el género es Femenino */}
                            {formData.genero === 'F' && (
                                <div className="p-4 rounded-xl bg-red-50/30 dark:bg-red-900/10 border border-red-100/50 dark:border-red-900/20 md:flex md:items-center md:justify-between gap-6 space-y-3 md:space-y-0">
                                    <div className="md:w-1/3">
                                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200 block">¿Se encuentra en estado de gestación?</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <label className="flex items-center cursor-pointer group">
                                            <input type="radio" checked={formData.ant_pat_embarazo === true} onChange={() => setFormData({ ...formData, ant_pat_embarazo: true })} className="hidden peer" />
                                            <div className="w-10 h-6 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center px-1 peer-checked:bg-red-500 transition-all after:w-4 after:h-4 after:bg-white after:rounded-full peer-checked:after:translate-x-4 shadow-inner"></div>
                                            <span className="ml-2 text-xs font-black text-gray-400 peer-checked:text-red-500">SÍ</span>
                                        </label>
                                        <label className="flex items-center cursor-pointer group">
                                            <input type="radio" checked={formData.ant_pat_embarazo === false} onChange={() => setFormData({ ...formData, ant_pat_embarazo: false, ant_pat_embarazo_semanas: '' })} className="hidden peer" />
                                            <div className="w-10 h-6 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center px-1 peer-checked:bg-gray-400 transition-all after:w-4 after:h-4 after:bg-white after:rounded-full shadow-inner"></div>
                                            <span className="ml-2 text-xs font-black text-gray-400 peer-checked:text-gray-500">NO</span>
                                        </label>
                                    </div>
                                    <div className="flex-1">
                                        {formData.ant_pat_embarazo && (
                                            <div className="relative animate-in fade-in slide-in-from-top-1">
                                                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400" />
                                                <input 
                                                    type="number" 
                                                    name="ant_pat_embarazo_semanas" 
                                                    value={formData.ant_pat_embarazo_semanas || ''} 
                                                    onChange={handleChange} 
                                                    placeholder="Semanas de gestación (ej: 12)"
                                                    min={1}
                                                    max={45}
                                                    className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none focus:ring-4 focus:ring-red-500/10 transition-all font-medium" 
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tratamiento Médico */}
                            <div className="p-4 rounded-xl bg-red-50/30 dark:bg-red-900/10 border border-red-100/50 dark:border-red-900/20 md:flex md:items-center md:justify-between gap-6 space-y-3 md:space-y-0">
                                <div className="md:w-1/3">
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 block">¿Se encuentra bajo tratamiento médico actualmente?</span>
                                </div>
                                <div className="flex gap-4">
                                    <label className="flex items-center cursor-pointer group">
                                        <input type="radio" checked={formData.ant_pat_tratamiento_medico === true} onChange={() => setFormData({ ...formData, ant_pat_tratamiento_medico: true })} className="hidden peer" />
                                        <div className="w-10 h-6 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center px-1 peer-checked:bg-red-500 transition-all after:w-4 after:h-4 after:bg-white after:rounded-full peer-checked:after:translate-x-4 shadow-inner"></div>
                                        <span className="ml-2 text-xs font-black text-gray-400 peer-checked:text-red-500">SÍ</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer group">
                                        <input type="radio" checked={formData.ant_pat_tratamiento_medico === false} onChange={() => setFormData({ ...formData, ant_pat_tratamiento_medico: false, ant_pat_tratamiento_medico_detalle: '' })} className="hidden peer" />
                                        <div className="w-10 h-6 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center px-1 peer-checked:bg-gray-400 transition-all after:w-4 after:h-4 after:bg-white after:rounded-full shadow-inner"></div>
                                        <span className="ml-2 text-xs font-black text-gray-400 peer-checked:text-gray-500">NO</span>
                                    </label>
                                </div>
                                <div className="flex-1">
                                    {formData.ant_pat_tratamiento_medico && (
                                        <div className="relative animate-in fade-in slide-in-from-top-1">
                                            <Edit size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400" />
                                            <input 
                                                type="text" 
                                                name="ant_pat_tratamiento_medico_detalle" 
                                                value={formData.ant_pat_tratamiento_medico_detalle || ''} 
                                                onChange={handleChange} 
                                                placeholder="Describa el tratamiento e indicación médica"
                                                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none focus:ring-4 focus:ring-red-500/10 transition-all font-medium" 
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Toma Medicamentos */}
                            <div className="p-4 rounded-xl bg-red-50/30 dark:bg-red-900/10 border border-red-100/50 dark:border-red-900/20 md:flex md:items-center md:justify-between gap-6 space-y-3 md:space-y-0">
                                <div className="md:w-1/3">
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 block">¿Esta tomado algún medicamento?</span>
                                </div>
                                <div className="flex gap-4">
                                    <label className="flex items-center cursor-pointer group">
                                        <input type="radio" checked={formData.ant_pat_toma_medicamentos === true} onChange={() => setFormData({ ...formData, ant_pat_toma_medicamentos: true })} className="hidden peer" />
                                        <div className="w-10 h-6 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center px-1 peer-checked:bg-red-500 transition-all after:w-4 after:h-4 after:bg-white after:rounded-full peer-checked:after:translate-x-4 shadow-inner"></div>
                                        <span className="ml-2 text-xs font-black text-gray-400 peer-checked:text-red-500">SÍ</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer group">
                                        <input type="radio" checked={formData.ant_pat_toma_medicamentos === false} onChange={() => setFormData({ ...formData, ant_pat_toma_medicamentos: false, ant_pat_toma_medicamentos_detalle: '' })} className="hidden peer" />
                                        <div className="w-10 h-6 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center px-1 peer-checked:bg-gray-400 transition-all after:w-4 after:h-4 after:bg-white after:rounded-full shadow-inner"></div>
                                        <span className="ml-2 text-xs font-black text-gray-400 peer-checked:text-gray-500">NO</span>
                                    </label>
                                </div>
                                <div className="flex-1">
                                    {formData.ant_pat_toma_medicamentos && (
                                        <div className="relative animate-in fade-in slide-in-from-top-1">
                                            <Edit size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400" />
                                            <input 
                                                type="text" 
                                                name="ant_pat_toma_medicamentos_detalle" 
                                                value={formData.ant_pat_toma_medicamentos_detalle || ''} 
                                                onChange={handleChange} 
                                                placeholder="Especifique cuáles y la dosis"
                                                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none focus:ring-4 focus:ring-red-500/10 transition-all font-medium" 
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Hemorragias */}
                            <div className="p-4 rounded-xl bg-red-50/30 dark:bg-red-900/10 border border-red-100/50 dark:border-red-900/20 md:flex md:items-center md:justify-between gap-6 space-y-3 md:space-y-0">
                                <div className="md:w-1/3">
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 block">¿Ha tenido hemorragias post-extracción o heridas?</span>
                                </div>
                                <div className="flex gap-4">
                                    <label className="flex items-center cursor-pointer group">
                                        <input type="radio" checked={formData.ant_pat_hemorragias === true} onChange={() => setFormData({ ...formData, ant_pat_hemorragias: true })} className="hidden peer" />
                                        <div className="w-10 h-6 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center px-1 peer-checked:bg-red-500 transition-all after:w-4 after:h-4 after:bg-white after:rounded-full peer-checked:after:translate-x-4 shadow-inner"></div>
                                        <span className="ml-2 text-xs font-black text-gray-400 peer-checked:text-red-500">SÍ</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer group">
                                        <input type="radio" checked={formData.ant_pat_hemorragias === false} onChange={() => setFormData({ ...formData, ant_pat_hemorragias: false, ant_pat_hemorragias_tipo: '' })} className="hidden peer" />
                                        <div className="w-10 h-6 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center px-1 peer-checked:bg-gray-400 transition-all after:w-4 after:h-4 after:bg-white after:rounded-full shadow-inner"></div>
                                        <span className="ml-2 text-xs font-black text-gray-400 peer-checked:text-gray-500">NO</span>
                                    </label>
                                </div>
                                <div className="flex-1">
                                    {formData.ant_pat_hemorragias && (
                                        <div className="relative animate-in fade-in slide-in-from-top-1">
                                            <select 
                                                name="ant_pat_hemorragias_tipo" 
                                                value={formData.ant_pat_hemorragias_tipo || ''} 
                                                onChange={handleChange} 
                                                className="w-full px-4 py-2 text-sm rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none focus:ring-4 focus:ring-red-500/10 transition-all font-medium"
                                            >
                                                <option value="">-- Seleccionar tipo --</option>
                                                <option value="Inmediata">Inmediata (durante la intervención)</option>
                                                <option value="Mediata">Mediata (horas después)</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Otros patológicos */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Otros antecedentes patológicos</label>
                                <input 
                                    type="text" 
                                    name="ant_pat_otros" 
                                    value={formData.ant_pat_otros || ''} 
                                    onChange={handleChange} 
                                    placeholder="Detalle de otras cirugías, traumatismos, transfusiones o enfermedades de interés clínico" 
                                    className="w-full px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-red-500 outline-none" 
                                />
                            </div>
                        </div>
                    </div>

                    {/* 3. EXAMEN EXTRA ORAL */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center mb-6 pb-2 border-b border-blue-500/20">
                            <Activity size={24} className="text-blue-600 mr-4" />
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">Examen Extra Oral</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">A.T.M. (Articulación Temporomandibular)</label>
                                <input type="text" name="exam_extra_atm" value={formData.exam_extra_atm || ''} onChange={handleChange} placeholder="Ej: Chasquidos, dolor, desviación..." className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Ganglios Linfáticos</label>
                                <input type="text" name="exam_extra_ganglios" value={formData.exam_extra_ganglios || ''} onChange={handleChange} placeholder="Ej: Sin alteraciones, inflamados..." className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Tipo de Respirador</label>
                                <select name="exam_extra_respirador" value={formData.exam_extra_respirador || ''} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
                                    <option value="">-- Seleccionar --</option>
                                    <option value="Bucal">Bucal</option>
                                    <option value="Nasal">Nasal</option>
                                    <option value="Mixto">Mixto</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Otros hallazgos extraorales</label>
                                <input type="text" name="exam_extra_otros" value={formData.exam_extra_otros || ''} onChange={handleChange} placeholder="Ej: Asimetría facial, lesiones cutáneas..." className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                    </div>

                    {/* 4. EXAMEN INTRA ORAL */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center mb-6 pb-2 border-b border-blue-500/20">
                            <Activity size={24} className="text-blue-600 mr-4" />
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">Examen Intra Oral</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Labios</label>
                                <input type="text" name="exam_intra_labios" value={formData.exam_intra_labios || ''} onChange={handleChange} placeholder="Ej: Hidratados, queilitis..." className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Lengua</label>
                                <input type="text" name="exam_intra_lengua" value={formData.exam_intra_lengua || ''} onChange={handleChange} placeholder="Ej: Saburral, geográfica, normal..." className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Paladar</label>
                                <input type="text" name="exam_intra_paladar" value={formData.exam_intra_paladar || ''} onChange={handleChange} placeholder="Ej: Ojival, normal, lesiones..." className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Piso de la boca</label>
                                <input type="text" name="exam_intra_piso_boca" value={formData.exam_intra_piso_boca || ''} onChange={handleChange} placeholder="Ej: Sin alteraciones, ránula..." className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Mucosa Yugal</label>
                                <input type="text" name="exam_intra_mucosa_yugal" value={formData.exam_intra_mucosa_yugal || ''} onChange={handleChange} placeholder="Ej: Línea alba, mordeduras..." className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Encías</label>
                                <input type="text" name="exam_intra_encias" value={formData.exam_intra_encias || ''} onChange={handleChange} placeholder="Ej: Gingivitis, inflamadas, sanas..." className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div className="flex items-center pt-6">
                                <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        name="exam_intra_protesis" 
                                        checked={!!formData.exam_intra_protesis} 
                                        onChange={(e) => setFormData(prev => ({ ...prev, exam_intra_protesis: e.target.checked }))} 
                                        className="w-5 h-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700" 
                                    />
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">¿Utiliza Prótesis Dental?</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* 5. ANTECEDENTES BUCODENTALES */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-emerald-50 dark:border-emerald-900/30">
                        <div className="flex items-center mb-6 pb-2 border-b border-emerald-500/20">
                            <Wind size={24} className="text-emerald-600 mr-4" />
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">Antecedentes Bucodentales y Hábitos</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Última visita al Odontólogo</label>
                                <input type="text" name="ant_buco_ultima_visita" value={formData.ant_buco_ultima_visita || ''} onChange={handleChange} placeholder="Ej: Hace 6 meses, Hace 1 año..." className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                            <div className="flex items-center justify-start gap-4 pt-6">
                                <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        name="habito_fuma" 
                                        checked={!!formData.habito_fuma} 
                                        onChange={(e) => setFormData(prev => ({ ...prev, habito_fuma: e.target.checked }))} 
                                        className="w-5 h-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700" 
                                    />
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Fuma</span>
                                </label>
                                <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        name="habito_bebe" 
                                        checked={!!formData.habito_bebe} 
                                        onChange={(e) => setFormData(prev => ({ ...prev, habito_bebe: e.target.checked }))} 
                                        className="w-5 h-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700" 
                                    />
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Bebe alcohol</span>
                                </label>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Otros hábitos orales</label>
                                <input type="text" name="habito_otros" value={formData.habito_otros || ''} onChange={handleChange} placeholder="Ej: Onicofagia (comer uñas), succión digital, bruxismo, morder objetos..." className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                        </div>
                    </div>

                    {/* 6. HIGIENE ORAL */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-emerald-50 dark:border-emerald-900/30">
                        <div className="flex items-center mb-6 pb-2 border-b border-emerald-500/20">
                            <Wind size={24} className="text-emerald-600 mr-4" />
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">Higiene Oral</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">Elementos de higiene que utiliza:</label>
                                <div className="flex flex-wrap gap-4">
                                    <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                        <input 
                                            type="checkbox" 
                                            name="hig_cepillo" 
                                            checked={!!formData.hig_cepillo} 
                                            onChange={(e) => setFormData(prev => ({ ...prev, hig_cepillo: e.target.checked }))} 
                                            className="w-5 h-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700" 
                                        />
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Cepillo</span>
                                    </label>
                                    <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                        <input 
                                            type="checkbox" 
                                            name="hig_hilo" 
                                            checked={!!formData.hig_hilo} 
                                            onChange={(e) => setFormData(prev => ({ ...prev, hig_hilo: e.target.checked }))} 
                                            className="w-5 h-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700" 
                                        />
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Hilo Dental</span>
                                    </label>
                                    <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                        <input 
                                            type="checkbox" 
                                            name="hig_enjuague" 
                                            checked={!!formData.hig_enjuague} 
                                            onChange={(e) => setFormData(prev => ({ ...prev, hig_enjuague: e.target.checked }))} 
                                            className="w-5 h-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700" 
                                        />
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Enjuague Bucal</span>
                                    </label>
                                    <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                        <input 
                                            type="checkbox" 
                                            name="hig_waterpik" 
                                            checked={!!formData.hig_waterpik} 
                                            onChange={(e) => setFormData(prev => ({ ...prev, hig_waterpik: e.target.checked }))} 
                                            className="w-5 h-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700" 
                                        />
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Waterpik</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Frecuencia de Cepillado</label>
                                <input type="text" name="hig_frecuencia_cepillado" value={formData.hig_frecuencia_cepillado || ''} onChange={handleChange} placeholder="Ej: 3 veces al día, 2 veces al día..." className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>

                            <div className="flex items-center pt-6">
                                <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        name="hig_sangrado_encias" 
                                        checked={!!formData.hig_sangrado_encias} 
                                        onChange={(e) => setFormData(prev => ({ ...prev, hig_sangrado_encias: e.target.checked }))} 
                                        className="w-5 h-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700" 
                                    />
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">¿Le sangran las encías al cepillarse?</span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Estado General de Higiene Bucal</label>
                                <select name="hig_bucal_estado" value={formData.hig_bucal_estado || ''} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none">
                                    <option value="">-- Seleccionar --</option>
                                    <option value="Bueno">Bueno</option>
                                    <option value="Regular">Regular</option>
                                    <option value="Malo">Malo</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* 7. OBSERVACIONES GENERALES */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center mb-6 pb-2 border-b border-gray-500/20">
                            <Info size={24} className="text-gray-600 mr-4" />
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">Observaciones</h2>
                        </div>
                        <div>
                            <textarea 
                                name="observaciones_ficha" 
                                value={formData.observaciones_ficha || ''} 
                                onChange={handleChange} 
                                rows={3} 
                                placeholder="Observaciones o notas clínicas adicionales sobre la ficha del paciente..." 
                                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none" 
                            />
                        </div>
                    </div>
                </div>

                {/* --- ACCIONES --- */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-t border-gray-200 dark:border-gray-700 flex justify-center gap-6 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                    <button 
                        type="submit" 
                        className="px-10 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold flex items-center gap-2 transform hover:-translate-y-1 transition-all shadow-lg active:scale-95"
                    >
                        <Save size={20} />
                        {isEditing ? 'Actualizar' : 'Guardar'}
                    </button>
                    <button 
                        type="button" 
                        onClick={handleVolver} 
                        className="px-10 py-3 rounded-xl bg-gray-500 hover:bg-gray-600 text-white font-bold flex items-center gap-2 transform hover:-translate-y-1 transition-all shadow-lg active:scale-95"
                    >
                        <X size={20} />
                        Cancelar
                    </button>
                </div>
            </form>

            <SignatureModal 
                isOpen={showSignatureModal} 
                onClose={() => {
                    setShowSignatureModal(false);
                    handleVolver();
                }} 
                documentoId={id ? parseInt(id) : (newPatientId || 0)}
                tipoDocumento="paciente"
                rolFirmante="paciente"
            />

            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Ayuda"
                sections={manualSections}
            />
        </div>
    );
};

export default PacienteForm;
