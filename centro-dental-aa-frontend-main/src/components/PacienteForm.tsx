import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';
import ManualModal, { type ManualSection } from './ManualModal';
import SignatureModal from './SignatureModal';
import { getLocalDateString } from '../utils/dateUtils';
import { getImageUrl } from '../utils/formatters';
import { ArrowLeft, User, Users, Activity, Wind, Info, Edit, Mail, Calendar, MapPin, Phone, Briefcase, HelpCircle, Save, X, Fingerprint, Search, Plus, Shield, Camera } from 'lucide-react';

const CameraModal: React.FC<{ isOpen: boolean; onClose: () => void; onCapture: (base64: string) => void; isEnglish?: boolean }> = ({ isOpen, onClose, onCapture, isEnglish = false }) => {
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    const t = (es: string, en: string) => isEnglish ? en : es;

    useEffect(() => {
        if (isOpen) {
            navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 480, facingMode: 'user' } })
                .then(s => {
                    setStream(s);
                    if (videoRef.current) {
                        videoRef.current.srcObject = s;
                    }
                })
                .catch(err => {
                    console.error("Camera access error:", err);
                    setError(t("No se pudo acceder a la cámara. Asegúrese de dar los permisos correspondientes.", "Could not access camera. Please ensure permissions are granted."));
                });
        } else {
            stopCamera();
        }

        return () => {
            stopCamera();
        };
    }, [isOpen, isEnglish]);

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setError(null);
    };

    const handleCapture = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth || 480;
            canvas.height = videoRef.current.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                const base64 = canvas.toDataURL('image/jpeg', 0.85);
                onCapture(base64);
                onClose();
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t("Capturar Foto del Paciente", "Capture Patient Photo")}</h3>
                {error ? (
                    <div className="p-4 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 rounded-xl text-sm mb-4">
                        {error}
                    </div>
                ) : (
                    <div className="relative aspect-square w-full max-w-xs mx-auto rounded-xl overflow-hidden bg-black mb-4 border border-gray-200 dark:border-gray-700">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                    </div>
                )}
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200"
                    >
                        {t("Cancelar", "Cancel")}
                    </button>
                    {!error && (
                        <button
                            type="button"
                            onClick={handleCapture}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                        >
                            {t("Capturar", "Capture")}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const PacienteForm: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams<{ id: string }>();
    const isEditing = !!id;
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [showManual, setShowManual] = useState(false);
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [isEnglish, setIsEnglish] = useState(false);

    const t = (es: string, en: string) => isEnglish ? en : es;

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
            title: t('Registro de Pacientes', 'Patient Registration'),
            content: t('Complete la filiación y antecedentes médicos. Los campos con * son obligatorios.', 'Complete patient details and medical history. Fields with * are required.')
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
        ci_extension: '',
        foto: '',
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
            
            const flatData = {
                ...data,
                ...(data.fichaClinica || {})
            };
            setFormData(flatData);

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
        } catch (error) {
            console.error('Error fetching paciente:', error);
            Swal.fire({ icon: 'error', title: 'Error', text: t('Error al cargar el paciente', 'Error loading patient') });
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
        
        const fullCelular = `${countryCode}${localCelular}`;
        const fullTutorCelular = tutorLocalCelular ? `${tutorCountryCode}${tutorLocalCelular}` : '';

        const payload: any = { ...formData };
        Object.entries(payload).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '') {
                delete payload[key];
            }
        });
        
        payload.telefono_celular = fullCelular;
        payload.tutor_celular = fullTutorCelular;
        payload.foto = formData.foto ? formData.foto : null;

        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                payload.usuarioId = JSON.parse(userStr).id;
            } catch (e) {
                console.error("Error parsing user for auditing", e);
            }
        }

        Object.keys(payload).forEach(key => {
            if ((key.toLowerCase().includes('particular') && key !== 'particularidad') || 
                (key.toLowerCase().includes('seguro') && key !== 'seguroId')) {
                delete payload[key];
            }
        });

        payload.seguroId = formData.seguroId && formData.seguroId !== '' ? Number(formData.seguroId) : null;
        try {
            let targetId = isEditing ? Number(id) : null;
            if (isEditing) {
                await api.patch(`/pacientes/${id}`, payload);
                await Swal.fire({ icon: 'success', title: t('Actualizado', 'Updated'), timer: 1500, showConfirmButton: false });
                handleVolver();
            } else {
                const response = await api.post('/pacientes', payload);
                targetId = response.data.id;
                setNewPatientId(targetId);
                
                await Swal.fire({ 
                    icon: 'success', 
                    title: t('¡Ficha Creada!', 'Patient Record Created!'), 
                    text: t('Proceda a la firma digital del paciente.', 'Proceed with digital signature.'),
                    timer: 2000, 
                    showConfirmButton: false 
                });
                
                setShowSignatureModal(true);
            }
        } catch (error: any) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || t('Error al guardar', 'Error saving') });
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
                            {isEditing ? t('Historia Clínica', 'Medical Record') : t('Nuevo Paciente', 'New Patient')}
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                                {isEditing ? t('Edición de filiación y antecedentes médicos', 'Editing personal details and medical history') : t('Registro integral de datos y antecedentes médicos', 'Full patient registration & medical history')}
                            </p>
                        </div>
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setIsEnglish(prev => !prev)}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                        title={isEnglish ? "Cambiar a Español" : "Switch to English"}
                    >
                        <span>🌐</span>
                        <span>{isEnglish ? 'Español' : 'Inglés'}</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowManual(true)} 
                      className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors self-center"
                      title={t("Ayuda / Manual", "Help / Manual")}
                    >
                        ?
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* --- FILIACIÓN --- */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center mb-6 pb-2 border-b border-blue-500/20">
                        <User size={24} className="text-blue-600 mr-4" />
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">{t('Filiación', 'Personal Information')}</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Fecha Ingreso', 'Admission Date')}</label>
                            <div className="relative">
                                <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input type="date" name="fecha_ingreso" value={formData.fecha_ingreso} onChange={handleChange} className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>

                        <div></div>

                        <div className="flex flex-col">
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Foto del Paciente', 'Patient Photo')}</label>
                            <div className="flex items-center gap-3">
                                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center border border-gray-300 dark:border-gray-600 shadow-inner relative group flex-shrink-0">
                                    {formData.foto ? (
                                        <>
                                            <img src={getImageUrl(formData.foto)} alt="Foto paciente" className="w-full h-full object-cover" />
                                            <button 
                                                type="button" 
                                                onClick={() => setFormData(prev => ({ ...prev, foto: '' }))}
                                                className="absolute top-0.5 right-0.5 bg-red-600 hover:bg-red-700 text-white rounded-full p-0.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                                title={t("Eliminar foto", "Remove photo")}
                                            >
                                                <X size={10} />
                                            </button>
                                        </>
                                    ) : (
                                        <User size={24} className="text-gray-400" />
                                    )}
                                </div>
                                <div className="flex flex-col gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowCameraModal(true)}
                                        className="py-1 px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1"
                                    >
                                        <Camera size={12} />
                                        {t('Tomar', 'Take Photo')}
                                    </button>
                                    <label className="py-1 px-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1 cursor-pointer text-center font-sans">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                        {t('Subir', 'Upload')}
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        setFormData(prev => ({ ...prev, foto: reader.result as string }));
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Paterno', 'Paternal Surname')} <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input type="text" name="paterno" value={formData.paterno} onChange={handleChange} required placeholder={t('Ej: Pérez', 'e.g. Smith')} className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Materno', 'Maternal Surname')}</label>
                            <div className="relative">
                                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input type="text" name="materno" value={formData.materno} onChange={handleChange} placeholder={t('Ej: Gómez', 'e.g. Johnson')} className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Nombres', 'First Name(s)')} <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required placeholder={t('Ej: Juan', 'e.g. John')} className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Nacimiento', 'Date of Birth')} <span className="text-red-500">*</span></label>
                            <div className="relative flex items-center gap-2">
                                <div className="relative flex-grow">
                                    <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleChange} required className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                {formData.fecha_nacimiento && (
                                    <div className="flex flex-col items-center bg-gray-100 dark:bg-gray-700 p-1 px-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 min-w-[50px]">
                                        <span className="text-[8px] font-black text-gray-400 uppercase">{t('Edad', 'Age')}</span>
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
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Género', 'Gender')} <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Users size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select name="genero" value={formData.genero} onChange={handleChange} required className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
                                    <option value="">{t('-- Seleccionar --', '-- Select --')}</option>
                                    <option value="M">{t('Masculino', 'Male')}</option>
                                    <option value="F">{t('Femenino', 'Female')}</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('C.I. / Extensión', 'ID / Extension')}</label>
                            <div className="flex gap-2">
                                <div className="relative flex-grow">
                                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    <input type="text" name="ci" value={formData.ci} onChange={handleChange} placeholder={t('Ej: 1234567', 'e.g. 1234567')} className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div className="w-24">
                                    <input type="text" name="ci_extension" value={formData.ci_extension || ''} onChange={(e) => {
                                        e.target.value = e.target.value.toUpperCase();
                                        handleChange(e);
                                    }} maxLength={4} placeholder={t('Ext', 'Ext')} className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Dirección', 'Address')}</label>
                            <div className="relative">
                                <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} placeholder={t('Ej: Av. Principal #123', 'e.g. 123 Main St')} className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Ocupación', 'Occupation')}</label>
                            <div className="relative">
                                <Briefcase size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input type="text" name="ocupacion" value={formData.ocupacion} onChange={handleChange} placeholder={t('Ej: Estudiante', 'e.g. Student')} className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Teléfono/Celular', 'Phone/Mobile')} <span className="text-red-500">*</span></label>
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
                                        placeholder={t('Ej: 70012345', 'e.g. 70012345')} 
                                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                                    />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Email', 'Email')}</label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder={t('Ej: paciente@gmail.com', 'e.g. patient@gmail.com')} className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Estado Civil', 'Marital Status')}</label>
                            <div className="relative">
                                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select name="estado_civil" value={formData.estado_civil} onChange={handleChange} className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
                                    <option value="Soltero">{t('Soltero(a)', 'Single')}</option>
                                    <option value="Casado">{t('Casado(a)', 'Married')}</option>
                                    <option value="Viudo">{t('Viudo(a)', 'Widowed')}</option>
                                    <option value="Separado">{t('Separado(a)', 'Separated')}</option>
                                    <option value="Conviviente">{t('Conviviente', 'Cohabitating')}</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Grado de Instrucción', 'Education Level')}</label>
                            <div className="relative">
                                <Briefcase size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select name="grado_instruccion" value={formData.grado_instruccion} onChange={handleChange} className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
                                    <option value="Ninguna">{t('Ninguna', 'None')}</option>
                                    <option value="Inicial">{t('Inicial', 'Preschool')}</option>
                                    <option value="Primaria">{t('Primaria', 'Primary School')}</option>
                                    <option value="Secundaria">{t('Secundaria', 'High School')}</option>
                                    <option value="Tecnico">{t('Técnico', 'Technical Degree')}</option>
                                    <option value="Universidad">{t('Universidad', 'University')}</option>
                                    <option value="Profesional">{t('Profesional', 'Postgraduate/Professional')}</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Seguro / Convenio', 'Insurance / Agreement')}</label>
                            <div className="relative">
                                <Shield size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select 
                                    name="seguroId" 
                                    value={formData.seguroId || ''} 
                                    onChange={handleChange} 
                                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                >
                                    <option value="">{t('-- Sin Seguro (Particular) --', '-- No Insurance (Private) --')}</option>
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
                            <h2 className="text-xl font-bold uppercase text-gray-800 dark:text-gray-100">{t('Tutor y Acompañante', 'Guardian & Companion')}</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Nombre Tutor', 'Guardian Name')}</label>
                                <div className="relative">
                                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    <input type="text" name="tutor_nombre" value={formData.tutor_nombre} onChange={handleChange} placeholder={t('Nombre Tutor', 'Guardian Name')} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('C.I. Tutor', 'Guardian ID')}</label>
                                <div className="relative">
                                    <Fingerprint size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    <input type="text" name="tutor_ci" value={formData.tutor_ci} onChange={handleChange} placeholder={t('C.I. Tutor', 'Guardian ID')} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Celular Tutor', 'Guardian Mobile')}</label>
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
                                            placeholder={t('Celular Tutor', 'Guardian Mobile')} 
                                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Persona que brinda la información', 'Person Providing Info')}</label>
                            <div className="relative">
                                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input type="text" name="persona_brinda_informacion" value={formData.persona_brinda_informacion} onChange={handleChange} placeholder={t('Persona que brinda la información', 'Person providing information')} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
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
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">{t('Motivo de Consulta', 'Reason for Visit')}</h2>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                {t('Motivo de la consulta dental', 'Reason for dental visit')}
                            </label>
                            <textarea 
                                name="motivo_consulta" 
                                value={formData.motivo_consulta || ''} 
                                onChange={handleChange} 
                                rows={2} 
                                placeholder={t('Describa brevemente el motivo de la consulta...', 'Briefly describe the reason for your visit...')} 
                                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none" 
                            />
                        </div>
                    </div>

                    {/* 1. ANTECEDENTES FAMILIARES */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center mb-6 pb-2 border-b border-indigo-500/20">
                            <Users size={24} className="text-indigo-600 mr-4" />
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">{t('Antecedentes Familiares', 'Family Medical History')}</h2>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                {t('Enfermedades familiares hereditarias', 'Hereditary family conditions')}
                            </label>
                            <textarea 
                                name="ant_pat_familiares" 
                                value={formData.ant_pat_familiares || ''} 
                                onChange={handleChange} 
                                rows={3} 
                                placeholder={t('Especifique si algún familiar padece de Diabetes, Hipertensión, Cardiopatías, Cáncer, etc.', 'Specify if any family member has Diabetes, Hypertension, Heart Disease, Cancer, etc.')} 
                                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none" 
                            />
                        </div>
                    </div>

                    {/* 2. ANTECEDENTES PERSONALES PATOLÓGICOS */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-red-50 dark:border-red-900/30">
                        <div className="flex items-center mb-6 pb-2 border-b border-red-500/20">
                            <Activity size={24} className="text-red-600 mr-4" />
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">{t('Antecedentes Personales Patológicos', 'Personal Medical History (Pathological)')}</h2>
                        </div>
                        
                        {/* Grid de checkboxes de enfermedades */}
                        <div className="mb-6">
                            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">{t('Marque las condiciones que padece o ha padecido:', 'Check conditions you currently have or had:')}</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
                                {[
                                    { id: 'ant_pat_anemia', label: t('Anemia', 'Anemia') },
                                    { id: 'ant_pat_cardiopatias', label: t('Cardiopatías', 'Heart Disease') },
                                    { id: 'ant_pat_gastricas', label: t('Enf. Gástricas', 'Gastric Disease') },
                                    { id: 'ant_pat_hepatitis', label: t('Hepatitis', 'Hepatitis') },
                                    { id: 'ant_pat_tuberculosis', label: t('Tuberculosis', 'Tuberculosis') },
                                    { id: 'ant_pat_asma', label: t('Asma', 'Asthma') },
                                    { id: 'ant_pat_diabetes', label: t('Diabetes', 'Diabetes') },
                                    { id: 'ant_pat_epilepsia', label: t('Epilepsia', 'Epilepsy') },
                                    { id: 'ant_pat_hipertension', label: t('Hipertensión', 'Hypertension') },
                                    { id: 'ant_pat_vih', label: t('VIH', 'HIV') },
                                    { id: 'ant_pat_ninguno', label: t('Ninguno', 'None') },
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
                            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b pb-1">{t('Detalle Médico Específico:', 'Specific Medical Details:')}</h3>
                            
                            {/* Cirugías */}
                            <div className="p-4 rounded-xl bg-red-50/30 dark:bg-red-900/10 border border-red-100/50 dark:border-red-900/20 md:flex md:items-center md:justify-between gap-6 space-y-3 md:space-y-0 animate-in fade-in slide-in-from-top-1">
                                <div className="md:w-1/3">
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 block">{t('¿Tuvo alguna cirugía? / ¿Le realizaron alguna operación?', 'Have you had any surgery or operations?')}</span>
                                </div>
                                <div className="flex gap-4">
                                    <label className="flex items-center cursor-pointer group">
                                        <input type="radio" checked={formData.ant_pat_cirugia === true} onChange={() => setFormData({ ...formData, ant_pat_cirugia: true })} className="hidden peer" />
                                        <div className="w-10 h-6 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center px-1 peer-checked:bg-red-500 transition-all after:w-4 after:h-4 after:bg-white after:rounded-full peer-checked:after:translate-x-4 shadow-inner"></div>
                                        <span className="ml-2 text-xs font-black text-gray-400 peer-checked:text-red-500">{t('SÍ', 'YES')}</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer group">
                                        <input type="radio" checked={formData.ant_pat_cirugia === false} onChange={() => setFormData({ ...formData, ant_pat_cirugia: false, ant_pat_cirugia_detalle: '' })} className="hidden peer" />
                                        <div className="w-10 h-6 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center px-1 peer-checked:bg-gray-400 transition-all after:w-4 after:h-4 after:bg-white after:rounded-full shadow-inner"></div>
                                        <span className="ml-2 text-xs font-black text-gray-400 peer-checked:text-gray-500">{t('NO', 'NO')}</span>
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
                                                placeholder={t('Especifique qué tipo de cirugía y hace cuánto tiempo', 'Specify surgery type and how long ago')}
                                                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none focus:ring-4 focus:ring-red-500/10 transition-all font-medium" 
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Alergias */}
                            <div className="p-4 rounded-xl bg-red-50/30 dark:bg-red-900/10 border border-red-100/50 dark:border-red-900/20 md:flex md:items-center md:justify-between gap-6 space-y-3 md:space-y-0">
                                <div className="md:w-1/3">
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 block">{t('¿Es alérgico a algún medicamento/sustancia?', 'Are you allergic to any medication or substance?')}</span>
                                </div>
                                <div className="flex gap-4">
                                    <label className="flex items-center cursor-pointer group">
                                        <input type="radio" checked={formData.ant_pat_alergias === true} onChange={() => setFormData({ ...formData, ant_pat_alergias: true })} className="hidden peer" />
                                        <div className="w-10 h-6 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center px-1 peer-checked:bg-red-500 transition-all after:w-4 after:h-4 after:bg-white after:rounded-full peer-checked:after:translate-x-4 shadow-inner"></div>
                                        <span className="ml-2 text-xs font-black text-gray-400 peer-checked:text-red-500">{t('SÍ', 'YES')}</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer group">
                                        <input type="radio" checked={formData.ant_pat_alergias === false} onChange={() => setFormData({ ...formData, ant_pat_alergias: false, ant_pat_alergias_detalle: '' })} className="hidden peer" />
                                        <div className="w-10 h-6 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center px-1 peer-checked:bg-gray-400 transition-all after:w-4 after:h-4 after:bg-white after:rounded-full shadow-inner"></div>
                                        <span className="ml-2 text-xs font-black text-gray-400 peer-checked:text-gray-500">{t('NO', 'NO')}</span>
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
                                                placeholder={t('Ej: Penicilina, Látex, etc.', 'e.g. Penicillin, Latex, etc.')}
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
                                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200 block">{t('¿Se encuentra en estado de gestación?', 'Are you currently pregnant?')}</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <label className="flex items-center cursor-pointer group">
                                            <input type="radio" checked={formData.ant_pat_embarazo === true} onChange={() => setFormData({ ...formData, ant_pat_embarazo: true })} className="hidden peer" />
                                            <div className="w-10 h-6 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center px-1 peer-checked:bg-red-500 transition-all after:w-4 after:h-4 after:bg-white after:rounded-full peer-checked:after:translate-x-4 shadow-inner"></div>
                                            <span className="ml-2 text-xs font-black text-gray-400 peer-checked:text-red-500">{t('SÍ', 'YES')}</span>
                                        </label>
                                        <label className="flex items-center cursor-pointer group">
                                            <input type="radio" checked={formData.ant_pat_embarazo === false} onChange={() => setFormData({ ...formData, ant_pat_embarazo: false, ant_pat_embarazo_semanas: '' })} className="hidden peer" />
                                            <div className="w-10 h-6 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center px-1 peer-checked:bg-gray-400 transition-all after:w-4 after:h-4 after:bg-white after:rounded-full shadow-inner"></div>
                                            <span className="ml-2 text-xs font-black text-gray-400 peer-checked:text-gray-500">{t('NO', 'NO')}</span>
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
                                                    placeholder={t('Semanas de gestación (ej: 12)', 'Weeks of pregnancy (e.g. 12)')}
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
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 block">{t('¿Se encuentra bajo tratamiento médico actualmente?', 'Are you currently under medical treatment?')}</span>
                                </div>
                                <div className="flex gap-4">
                                    <label className="flex items-center cursor-pointer group">
                                        <input type="radio" checked={formData.ant_pat_tratamiento_medico === true} onChange={() => setFormData({ ...formData, ant_pat_tratamiento_medico: true })} className="hidden peer" />
                                        <div className="w-10 h-6 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center px-1 peer-checked:bg-red-500 transition-all after:w-4 after:h-4 after:bg-white after:rounded-full peer-checked:after:translate-x-4 shadow-inner"></div>
                                        <span className="ml-2 text-xs font-black text-gray-400 peer-checked:text-red-500">{t('SÍ', 'YES')}</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer group">
                                        <input type="radio" checked={formData.ant_pat_tratamiento_medico === false} onChange={() => setFormData({ ...formData, ant_pat_tratamiento_medico: false, ant_pat_tratamiento_medico_detalle: '' })} className="hidden peer" />
                                        <div className="w-10 h-6 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center px-1 peer-checked:bg-gray-400 transition-all after:w-4 after:h-4 after:bg-white after:rounded-full shadow-inner"></div>
                                        <span className="ml-2 text-xs font-black text-gray-400 peer-checked:text-gray-500">{t('NO', 'NO')}</span>
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
                                                placeholder={t('Describa el tratamiento e indicación médica', 'Describe treatment and medical recommendations')}
                                                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none focus:ring-4 focus:ring-red-500/10 transition-all font-medium" 
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Toma Medicamentos */}
                            <div className="p-4 rounded-xl bg-red-50/30 dark:bg-red-900/10 border border-red-100/50 dark:border-red-900/20 md:flex md:items-center md:justify-between gap-6 space-y-3 md:space-y-0">
                                <div className="md:w-1/3">
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 block">{t('¿Esta tomado algún medicamento?', 'Are you currently taking any medications?')}</span>
                                </div>
                                <div className="flex gap-4">
                                    <label className="flex items-center cursor-pointer group">
                                        <input type="radio" checked={formData.ant_pat_toma_medicamentos === true} onChange={() => setFormData({ ...formData, ant_pat_toma_medicamentos: true })} className="hidden peer" />
                                        <div className="w-10 h-6 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center px-1 peer-checked:bg-red-500 transition-all after:w-4 after:h-4 after:bg-white after:rounded-full peer-checked:after:translate-x-4 shadow-inner"></div>
                                        <span className="ml-2 text-xs font-black text-gray-400 peer-checked:text-red-500">{t('SÍ', 'YES')}</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer group">
                                        <input type="radio" checked={formData.ant_pat_toma_medicamentos === false} onChange={() => setFormData({ ...formData, ant_pat_toma_medicamentos: false, ant_pat_toma_medicamentos_detalle: '' })} className="hidden peer" />
                                        <div className="w-10 h-6 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center px-1 peer-checked:bg-gray-400 transition-all after:w-4 after:h-4 after:bg-white after:rounded-full shadow-inner"></div>
                                        <span className="ml-2 text-xs font-black text-gray-400 peer-checked:text-gray-500">{t('NO', 'NO')}</span>
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
                                                placeholder={t('Especifique cuáles y la dosis', 'Specify which ones and dosage')}
                                                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none focus:ring-4 focus:ring-red-500/10 transition-all font-medium" 
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Hemorragias */}
                            <div className="p-4 rounded-xl bg-red-50/30 dark:bg-red-900/10 border border-red-100/50 dark:border-red-900/20 md:flex md:items-center md:justify-between gap-6 space-y-3 md:space-y-0">
                                <div className="md:w-1/3">
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 block">{t('¿Ha tenido hemorragias post-extracción o heridas?', 'Have you had bleeding after dental extraction or wounds?')}</span>
                                </div>
                                <div className="flex gap-4">
                                    <label className="flex items-center cursor-pointer group">
                                        <input type="radio" checked={formData.ant_pat_hemorragias === true} onChange={() => setFormData({ ...formData, ant_pat_hemorragias: true })} className="hidden peer" />
                                        <div className="w-10 h-6 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center px-1 peer-checked:bg-red-500 transition-all after:w-4 after:h-4 after:bg-white after:rounded-full peer-checked:after:translate-x-4 shadow-inner"></div>
                                        <span className="ml-2 text-xs font-black text-gray-400 peer-checked:text-red-500">{t('SÍ', 'YES')}</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer group">
                                        <input type="radio" checked={formData.ant_pat_hemorragias === false} onChange={() => setFormData({ ...formData, ant_pat_hemorragias: false, ant_pat_hemorragias_tipo: '' })} className="hidden peer" />
                                        <div className="w-10 h-6 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center px-1 peer-checked:bg-gray-400 transition-all after:w-4 after:h-4 after:bg-white after:rounded-full shadow-inner"></div>
                                        <span className="ml-2 text-xs font-black text-gray-400 peer-checked:text-gray-500">{t('NO', 'NO')}</span>
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
                                                <option value="">{t('-- Seleccionar tipo --', '-- Select type --')}</option>
                                                <option value="Inmediata">{t('Inmediata (durante la intervención)', 'Immediate (during procedure)')}</option>
                                                <option value="Mediata">{t('Mediata (horas después)', 'Delayed (hours after)')}</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Otros patológicos */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Otros antecedentes patológicos', 'Other medical/pathological history')}</label>
                                <input 
                                    type="text" 
                                    name="ant_pat_otros" 
                                    value={formData.ant_pat_otros || ''} 
                                    onChange={handleChange} 
                                    placeholder={t('Detalle de otras cirugías, traumatismos, transfusiones o enfermedades de interés clínico', 'Detail of other surgeries, traumas, transfusions or clinical conditions')} 
                                    className="w-full px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-red-500 outline-none" 
                                />
                            </div>
                        </div>
                    </div>

                    {/* 3. EXAMEN EXTRA ORAL */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center mb-6 pb-2 border-b border-blue-500/20">
                            <Activity size={24} className="text-blue-600 mr-4" />
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">{t('Examen Extra Oral', 'Extraoral Examination')}</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('A.T.M. (Articulación Temporomandibular)', 'T.M.J. (Temporomandibular Joint)')}</label>
                                <input type="text" name="exam_extra_atm" value={formData.exam_extra_atm || ''} onChange={handleChange} placeholder={t('Ej: Chasquidos, dolor, desviación...', 'e.g. Clicks, pain, deviation...')} className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Ganglios Linfáticos', 'Lymph Nodes')}</label>
                                <input type="text" name="exam_extra_ganglios" value={formData.exam_extra_ganglios || ''} onChange={handleChange} placeholder={t('Ej: Sin alterations, inflamados...', 'e.g. Normal, swollen...')} className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Tipo de Respirador', 'Breathing Type')}</label>
                                <select name="exam_extra_respirador" value={formData.exam_extra_respirador || ''} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
                                    <option value="">{t('-- Seleccionar --', '-- Select --')}</option>
                                    <option value="Bucal">{t('Bucal', 'Mouth')}</option>
                                    <option value="Nasal">{t('Nasal', 'Nasal')}</option>
                                    <option value="Mixto">{t('Mixto', 'Mixed')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Otros hallazgos extraorales', 'Other extraoral findings')}</label>
                                <input type="text" name="exam_extra_otros" value={formData.exam_extra_otros || ''} onChange={handleChange} placeholder={t('Ej: Asimetría facial, lesiones cutáneas...', 'e.g. Facial asymmetry, skin lesions...')} className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                    </div>

                    {/* 4. EXAMEN INTRA ORAL */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center mb-6 pb-2 border-b border-blue-500/20">
                            <Activity size={24} className="text-blue-600 mr-4" />
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">{t('Examen Intra Oral', 'Intraoral Examination')}</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Labios', 'Lips')}</label>
                                <input type="text" name="exam_intra_labios" value={formData.exam_intra_labios || ''} onChange={handleChange} placeholder={t('Ej: Hidratados, queilitis...', 'e.g. Hydrated, cheilitis...')} className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Lengua', 'Tongue')}</label>
                                <input type="text" name="exam_intra_lengua" value={formData.exam_intra_lengua || ''} onChange={handleChange} placeholder={t('Ej: Saburral, geográfica, normal...', 'e.g. Coated, geographic, normal...')} className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Paladar', 'Palate')}</label>
                                <input type="text" name="exam_intra_paladar" value={formData.exam_intra_paladar || ''} onChange={handleChange} placeholder={t('Ej: Ojival, normal, lesiones...', 'e.g. High arched, normal, lesions...')} className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Piso de la boca', 'Floor of Mouth')}</label>
                                <input type="text" name="exam_intra_piso_boca" value={formData.exam_intra_piso_boca || ''} onChange={handleChange} placeholder={t('Ej: Sin alteraciones, ránula...', 'e.g. Normal, ranula...')} className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Mucosa Yugal', 'Buccal Mucosa')}</label>
                                <input type="text" name="exam_intra_mucosa_yugal" value={formData.exam_intra_mucosa_yugal || ''} onChange={handleChange} placeholder={t('Ej: Línea alba, mordeduras...', 'e.g. Linea alba, cheek bites...')} className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Encías', 'Gums')}</label>
                                <input type="text" name="exam_intra_encias" value={formData.exam_intra_encias || ''} onChange={handleChange} placeholder={t('Ej: Gingivitis, inflamadas, sanas...', 'e.g. Gingivitis, inflamed, healthy...')} className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
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
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('¿Utiliza Prótesis Dental?', 'Do you use dental dentures/prosthetics?')}</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* 5. ANTECEDENTES BUCODENTALES */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-emerald-50 dark:border-emerald-900/30">
                        <div className="flex items-center mb-6 pb-2 border-b border-emerald-500/20">
                            <Wind size={24} className="text-emerald-600 mr-4" />
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">{t('Antecedentes Bucodentales y Hábitos', 'Dental History & Habits')}</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Última visita al Odontólogo', 'Last Dental Visit')}</label>
                                <input type="text" name="ant_buco_ultima_visita" value={formData.ant_buco_ultima_visita || ''} onChange={handleChange} placeholder={t('Ej: Hace 6 meses, Hace 1 año...', 'e.g. 6 months ago, 1 year ago...')} className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" />
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
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('Fuma', 'Smokes')}</span>
                                </label>
                                <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        name="habito_bebe" 
                                        checked={!!formData.habito_bebe} 
                                        onChange={(e) => setFormData(prev => ({ ...prev, habito_bebe: e.target.checked }))} 
                                        className="w-5 h-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700" 
                                    />
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('Bebe alcohol', 'Drinks alcohol')}</span>
                                </label>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Otros hábitos orales', 'Other oral habits')}</label>
                                <input type="text" name="habito_otros" value={formData.habito_otros || ''} onChange={handleChange} placeholder={t('Ej: Onicofagia (comer uñas), succión digital, bruxismo, morder objetos...', 'e.g. Nail biting, thumb sucking, bruxism, object biting...')} className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                        </div>
                    </div>

                    {/* 6. HIGIENE ORAL */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-emerald-50 dark:border-emerald-900/30">
                        <div className="flex items-center mb-6 pb-2 border-b border-emerald-500/20">
                            <Wind size={24} className="text-emerald-600 mr-4" />
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">{t('Higiene Oral', 'Oral Hygiene')}</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">{t('Elementos de higiene que utiliza:', 'Oral hygiene tools used:')}</label>
                                <div className="flex flex-wrap gap-4">
                                    <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                        <input 
                                            type="checkbox" 
                                            name="hig_cepillo" 
                                            checked={!!formData.hig_cepillo} 
                                            onChange={(e) => setFormData(prev => ({ ...prev, hig_cepillo: e.target.checked }))} 
                                            className="w-5 h-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700" 
                                        />
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('Cepillo', 'Toothbrush')}</span>
                                    </label>
                                    <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                        <input 
                                            type="checkbox" 
                                            name="hig_hilo" 
                                            checked={!!formData.hig_hilo} 
                                            onChange={(e) => setFormData(prev => ({ ...prev, hig_hilo: e.target.checked }))} 
                                            className="w-5 h-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700" 
                                        />
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('Hilo Dental', 'Dental Floss')}</span>
                                    </label>
                                    <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                        <input 
                                            type="checkbox" 
                                            name="hig_enjuague" 
                                            checked={!!formData.hig_enjuague} 
                                            onChange={(e) => setFormData(prev => ({ ...prev, hig_enjuague: e.target.checked }))} 
                                            className="w-5 h-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700" 
                                        />
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('Enjuague Bucal', 'Mouthwash')}</span>
                                    </label>
                                    <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                        <input 
                                            type="checkbox" 
                                            name="hig_waterpik" 
                                            checked={!!formData.hig_waterpik} 
                                            onChange={(e) => setFormData(prev => ({ ...prev, hig_waterpik: e.target.checked }))} 
                                            className="w-5 h-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700" 
                                        />
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('Waterpik', 'Waterpik')}</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Frecuencia de Cepillado', 'Brushing Frequency')}</label>
                                <input type="text" name="hig_frecuencia_cepillado" value={formData.hig_frecuencia_cepillado || ''} onChange={handleChange} placeholder={t('Ej: 3 veces al día, 2 veces al día...', 'e.g. 3 times a day, 2 times a day...')} className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" />
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
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('¿Le sangran las encías al cepillarse?', 'Do your gums bleed when brushing?')}</span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('Estado General de Higiene Bucal', 'General Oral Hygiene Condition')}</label>
                                <select name="hig_bucal_estado" value={formData.hig_bucal_estado || ''} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none">
                                    <option value="">{t('-- Seleccionar --', '-- Select --')}</option>
                                    <option value="Bueno">{t('Bueno', 'Good')}</option>
                                    <option value="Regular">{t('Regular', 'Fair')}</option>
                                    <option value="Malo">{t('Malo', 'Poor')}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* 7. OBSERVACIONES GENERALES */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center mb-6 pb-2 border-b border-gray-500/20">
                            <Info size={24} className="text-gray-600 mr-4" />
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">{t('Observaciones', 'Notes & Observations')}</h2>
                        </div>
                        <div>
                            <textarea 
                                name="observaciones_ficha" 
                                value={formData.observaciones_ficha || ''} 
                                onChange={handleChange} 
                                rows={3} 
                                placeholder={t('Observaciones o notas clínicas adicionales sobre la ficha del paciente...', 'Additional clinical notes or observations about patient record...')} 
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
                        {isEditing ? t('Actualizar', 'Update') : t('Guardar', 'Save')}
                    </button>
                    <button 
                        type="button" 
                        onClick={handleVolver} 
                        className="px-10 py-3 rounded-xl bg-gray-500 hover:bg-gray-600 text-white font-bold flex items-center gap-2 transform hover:-translate-y-1 transition-all shadow-lg active:scale-95"
                    >
                        <X size={20} />
                        {t('Cancelar', 'Cancel')}
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
                title={t("Ayuda", "Help")}
                sections={manualSections}
            />

            <CameraModal
                isOpen={showCameraModal}
                onClose={() => setShowCameraModal(false)}
                onCapture={(base64) => setFormData(prev => ({ ...prev, foto: base64 }))}
                isEnglish={isEnglish}
            />
        </div>
    );
};

export default PacienteForm;
