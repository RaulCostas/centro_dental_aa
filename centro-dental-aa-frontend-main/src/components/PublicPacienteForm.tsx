import React, { useState, useEffect } from 'react';

import api from '../services/api';
import Swal from 'sweetalert2';
import SignatureCanvas from './SignatureCanvas';
import { CheckCircle } from 'lucide-react';



import { getLocalDateString } from '../utils/dateUtils';



const PublicPacienteForm: React.FC = () => {
    const isEditing = false;
    const [currentStep, setCurrentStep] = useState<'form' | 'signature' | 'success'>('form');
    const [newPatientId, setNewPatientId] = useState<number | null>(null);

    // Los formularios públicos son agnóticos a la sesión, no deben limpiarla preventivamente

    const [formData, setFormData] = useState({
        fecha_ingreso: getLocalDateString(),
        paterno: '',
        materno: '',
        nombre: '',
        direccion: '',
        telefono_celular: '',
        email: '',
        estado_civil: 'Soltero',
        fecha_nacimiento: '',
        genero: '',
        responsable: '',
        parentesco: '',
        telefono_responsable: '',
        ci: '',
        estado: 'activo',
        grado_instruccion: 'Ninguna',
        seguroId: '' as string | number,
        tutor_celular: '',
        persona_brinda_informacion: '',
        telefono: '',
        lugar_residencia: '',
        profesion: '',
        direccion_responsable: '',

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

    // New state for phone country code
    const [countryCode, setCountryCode] = useState('+591');
    const [localCelular, setLocalCelular] = useState('');
    const [responsableCountryCode, setResponsableCountryCode] = useState('+591');
    const [localTelefonoResponsable, setLocalTelefonoResponsable] = useState('');

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

    const [seguros, setSeguros] = useState<any[]>([]);

    useEffect(() => {
        fetchSeguros();
    }, []);

    const fetchSeguros = async () => {
        try {
            const response = await api.get('/seguro?page=1&limit=9999');
            setSeguros(response.data.data || []);
        } catch (error) {
            console.error('Error fetching seguros:', error);
        }
    };

    // const [categorias, setCategorias] = useState<any[]>([]);

    // useEffect(() => {
    //     fetchCategorias();
    // }, []);

    // const fetchCategorias = async () => {
    //     try {
    //         const response = await api.get('/categoria-paciente?limit=100');
    //         const activeCategorias = (response.data.data || []).filter((cat: any) => cat.estado === 'activo');
    //         setCategorias(activeCategorias);
    //     } catch (error) {
    //         console.error('Error fetching categorias:', error);
    //     }
    // };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = { ...formData };
            Object.entries(payload).forEach(([key, value]) => {
                if (value === null || value === undefined || value === '') {
                    delete payload[key];
                }
            });
            
            payload.genero = formData.genero;
            payload.telefono_celular = `${countryCode}${localCelular}`;

            // Map Responsable fields to Tutor fields in the backend
            if (formData.responsable) {
                payload.tutor_nombre = formData.responsable;
            }
            if (localTelefonoResponsable) {
                payload.tutor_celular = `${responsableCountryCode}${localTelefonoResponsable}`;
            }

            const response = await api.post('/pacientes', payload);
            const createdId = response.data.id;

            if (createdId) {
                setNewPatientId(createdId);
                setCurrentStep('signature');
                window.scrollTo(0, 0);
            } else {
                throw new Error("No se recibió el ID del paciente creado");
            }
        } catch (error: any) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Hubo un error guardando sus datos. Intente nuevamente.'
            });
        }
    };

    const handleSaveSignature = async (signatureData: string) => {
        if (!newPatientId) return;

        try {
            await api.post('/firmas', {
                tipoDocumento: 'paciente',
                documentoId: newPatientId,
                rolFirmante: 'paciente',
                firmaData: signatureData,
                tipoFirma: 'dibujada',
                usuarioId: 1, // Default admin
                timestamp: new Date().toISOString()
            });

            setCurrentStep('success');
            window.scrollTo(0, 0);
        } catch (error: any) {
            console.error("Error salvando firma:", error);
            const errorMsg = error.response?.data?.message || 'No se pudo guardar la firma digital. Intente de nuevo.';
            Swal.fire({
                icon: 'error',
                title: 'Error al Guardar Firma',
                text: typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)
            });
        }
    };


    if (currentStep === 'signature') {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
                <div className="w-full max-w-[700px] mb-8">
                    <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">1</div>
                            <span className="text-gray-400 font-medium line-through">Datos Personales</span>
                        </div>
                        <div className="h-px bg-blue-200 flex-1 mx-4"></div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">2</div>
                            <span className="text-blue-600 font-bold">Firma Digital</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Casi terminamos</h2>
                            <p className="text-gray-500 mt-2">Por favor, realice su firma digital para completar el registro legal de su ficha.</p>
                        </div>
                        
                        <SignatureCanvas 
                            onSave={handleSaveSignature} 
                            onCancel={() => setCurrentStep('form')} 
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (currentStep === 'success') {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-10 px-4">
                <div className="w-full max-w-[500px] bg-white rounded-2xl shadow-xl p-10 text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-12 h-12 text-green-600" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-4">¡Registro Exitoso!</h2>
                    <p className="text-gray-600 text-lg mb-8">
                        Muchas gracias por completar su registro y firmar su ficha médica. <br/>
                        Ya puede pasar a sala de espera, lo llamaremos enseguida.
                    </p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl text-lg transition-all shadow-lg active:scale-95"
                    >
                        Finalizar
                    </button>
                    <p className="mt-6 text-sm text-gray-400">La página se reiniciará automáticamente para el siguiente paciente.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
            <div className="w-full max-w-[700px] bg-white rounded-xl shadow-lg p-6 md:p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-blue-600 mb-2">CENTRO DENTAL A&A</h1>
                    <p className="text-gray-500">Formulario de Ingreso de Paciente Nuevo</p>
                </div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <span className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </span>
                    Registro de Paciente
                </h2>
                
            </div>

            <form onSubmit={handleSubmit} className="grid gap-5">
                {/* Datos Personales */}
                 <fieldset className="border border-gray-300 p-4 rounded-lg">
                    <legend className="font-bold px-2 text-gray-600">Datos Personales</legend>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Paterno:</label>
                             <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <input type="text" name="paterno" value={formData.paterno} onChange={handleChange} required placeholder="Ej: Pérez"
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Materno:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <input type="text" name="materno" value={formData.materno} onChange={handleChange} required placeholder="Ej: Gómez"
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Nombre:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required placeholder="Ej: Juan"
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Fecha Nacimiento:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleChange} required className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Sexo:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                                <select name="genero" value={formData.genero} onChange={handleChange} required className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                                    <option value="" disabled>-- Seleccione --</option>
                                    <option value="M">Masculino</option>
                                    <option value="F">Femenino</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Estado Civil:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                </svg>
                                <select name="estado_civil" value={formData.estado_civil} onChange={handleChange} required className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                                    <option value="" disabled>-- Seleccione --</option>
                                    <option value="Soltero">Soltero(a)</option>
                                    <option value="Casado">Casado(a)</option>
                                    <option value="Viudo">Viudo(a)</option>
                                    <option value="Separado">Separado(a)</option>
                                    <option value="Conviviente">Conviviente</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Carnet de Identidad (CI):</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                </svg>
                                <input type="text" name="ci" value={formData.ci} onChange={handleChange} placeholder="Ej: 1234567"
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700">Grado de Instrucción:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                </svg>
                                <select name="grado_instruccion" value={formData.grado_instruccion} onChange={handleChange} required className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
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
                            <label className="block mb-1 font-medium text-gray-700">Seguro / Convenio:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                </svg>
                                <select 
                                    name="seguroId" 
                                    value={formData.seguroId || ''} 
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block appearance-none"
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
                </fieldset>

                {/* Contacto */}
                 <fieldset className="border border-gray-300 p-4 rounded-lg mt-4">
                    <legend className="font-bold px-2 text-gray-600">Contacto</legend>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-3">
                            <label className="block mb-1 font-medium text-gray-700">Dirección:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                    <circle cx="12" cy="10" r="3"></circle>
                                </svg>
                                <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} placeholder="Dirección completa..."
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block"
                                />
                            </div>
                        </div>
                        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
                            <div>
                                 <label className="block mb-1 font-medium text-gray-700">Teléfono:</label>
                                <div className="relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                    </svg>
                                    <input type="text" name="telefono" value={formData.telefono} onChange={handleChange} placeholder="Ej: 4-440000"
                                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block mb-1 font-medium text-gray-700">Celular:</label>
                                <div className="flex gap-2">
                                    <select
                                        value={countryCode}
                                        onChange={(e) => setCountryCode(e.target.value)}
                                        className="py-2 px-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="" disabled>-- Seleccione --</option>
                                        {countryCodes.map(c => (
                                            <option key={c.code} value={c.code}>{c.label}</option>
                                        ))}
                                    </select>
                                    <div className="relative flex-1">
                                         <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                                            <line x1="12" y1="18" x2="12.01" y2="18"></line>
                                        </svg>
                                        <input
                                            type="text"
                                            name="localCelular"
                                            value={localCelular}
                                            onChange={(e) => setLocalCelular(e.target.value)}
                                            placeholder="Ej: 70012345"
                                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800 transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                             <label className="block mb-1 font-medium text-gray-700">Email:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                    <polyline points="22,6 12,13 2,6"></polyline>
                                </svg>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Ej: correo@ejemplo.com"
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block"
                                />
                            </div>
                        </div>
                         <div>
                            <label className="block mb-1 font-medium text-gray-700">Lugar de Residencia:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                    <circle cx="12" cy="10" r="3"></circle>
                                </svg>
                                <input type="text" name="lugar_residencia" value={formData.lugar_residencia} onChange={handleChange} placeholder="Ej: Cochabamba"
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700">Profesión:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                                </svg>
                                <input type="text" name="profesion" value={formData.profesion} onChange={handleChange} placeholder="Ej: Arquitecto"
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block"
                                />
                            </div>
                        </div>
                    </div>
                </fieldset>



                {/* Responsable */}
                 <fieldset className="border border-gray-300 p-4 rounded-lg mt-4">
                    <legend className="font-bold px-2 text-gray-600">Responsable</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1 font-medium text-gray-700">Nombre Responsable:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <input type="text" name="responsable" value={formData.responsable} onChange={handleChange} placeholder="Ej: María Gómez"
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700">Parentesco:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                                <input type="text" name="parentesco" value={formData.parentesco} onChange={handleChange} placeholder="Ej: Madre"
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700">Dirección Responsable:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                    <circle cx="12" cy="10" r="3"></circle>
                                </svg>
                                <input type="text" name="direccion_responsable" value={formData.direccion_responsable} onChange={handleChange} placeholder="Dirección completa..."
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700">Teléfono Responsable:</label>
                            <div className="flex gap-2">
                                <select
                                    value={responsableCountryCode}
                                    onChange={(e) => setResponsableCountryCode(e.target.value)}
                                    className="py-2 px-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    <option value="" disabled>-- Seleccione --</option>
                                    {countryCodes.map(c => (
                                        <option key={c.code} value={c.code}>{c.label}</option>
                                    ))}
                                </select>
                                <div className="relative flex-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                    </svg>
                                    <input 
                                        type="text" 
                                        value={localTelefonoResponsable} 
                                        onChange={(e) => setLocalTelefonoResponsable(e.target.value)} 
                                        placeholder="Ej: 70012345"
                                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </fieldset>

                {/* Ficha Médica Title */}
                <div className="mt-8 mb-2 pb-2 border-b-2 border-blue-500">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-blue-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        Cuestionario Médico (Ficha Médica)
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Por favor complete sus antecedentes médicos de manera honesta para su seguridad.</p>
                </div>

                {/* MOTIVO DE CONSULTA */}
                <fieldset className="border border-gray-300 p-4 rounded-lg">
                    <legend className="font-bold px-2 text-blue-600">Motivo de Consulta</legend>
                    <div className="mt-2">
                        <label className="block mb-1 font-medium text-gray-700">Motivo de la consulta dental:</label>
                        <textarea 
                            name="motivo_consulta" 
                            value={formData.motivo_consulta || ''} 
                            onChange={handleChange} 
                            rows={2} 
                            placeholder="Describa brevemente por qué acude a la consulta hoy..." 
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </fieldset>

                {/* 1. ANTECEDENTES FAMILIARES */}
                <fieldset className="border border-gray-300 p-4 rounded-lg">
                    <legend className="font-bold px-2 text-gray-700">Antecedentes Familiares</legend>
                    <div className="mt-2">
                        <label className="block mb-1 font-medium text-gray-700">Enfermedades familiares hereditarias:</label>
                        <textarea 
                            name="ant_pat_familiares" 
                            value={formData.ant_pat_familiares || ''} 
                            onChange={handleChange} 
                            rows={3} 
                            placeholder="Especifique si algún familiar directo padece de Diabetes, Hipertensión, Cardiopatías, Cáncer, etc." 
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </fieldset>

                {/* 2. ANTECEDENTES PERSONALES PATOLÓGICOS */}
                <fieldset className="border border-gray-300 p-4 rounded-lg mt-4">
                    <legend className="font-bold px-2 text-gray-700">Antecedentes Personales Patológicos</legend>
                    <p className="text-sm text-gray-600 mb-3">Marque las condiciones que padece o ha padecido:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
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
                            <label key={cond.id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-gray-200 transition-colors text-gray-700">
                                <input 
                                    type="checkbox" 
                                    name={cond.id} 
                                    checked={!!(formData as any)[cond.id]} 
                                    onChange={(e) => setFormData(prev => ({ ...prev, [cond.id]: e.target.checked }))} 
                                    className="accent-blue-500 w-4 h-4 cursor-pointer" 
                                />
                                <span className="text-sm font-semibold">{cond.label}</span>
                            </label>
                        ))}
                    </div>

                    <div className="space-y-4 mt-4">
                        {/* Cirugías */}
                        <div className="flex flex-col gap-1 border-t pt-3 border-gray-200">
                            <label className="flex items-center gap-2 cursor-pointer text-gray-700 font-bold">
                                <input 
                                    type="checkbox" 
                                    name="ant_pat_cirugia" 
                                    checked={formData.ant_pat_cirugia} 
                                    onChange={handleChange} 
                                    className="accent-blue-500 w-4 h-4 cursor-pointer" 
                                /> 
                                ¿Tuvo alguna cirugía? / ¿Le realizaron alguna operación?
                            </label>
                            {formData.ant_pat_cirugia && (
                                <input 
                                    type="text" 
                                    name="ant_pat_cirugia_detalle" 
                                    placeholder="Indique qué tipo de cirugía y hace cuánto tiempo" 
                                    value={formData.ant_pat_cirugia_detalle} 
                                    onChange={handleChange} 
                                    className="w-full px-3 py-1.5 mt-1 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" 
                                />
                            )}
                        </div>

                        {/* Alergias */}
                        <div className="flex flex-col gap-1 border-t pt-3 border-gray-200">
                            <label className="flex items-center gap-2 cursor-pointer text-gray-700 font-bold">
                                <input 
                                    type="checkbox" 
                                    name="ant_pat_alergias" 
                                    checked={formData.ant_pat_alergias} 
                                    onChange={handleChange} 
                                    className="accent-blue-500 w-4 h-4 cursor-pointer" 
                                /> 
                                ¿Es alérgico a algún medicamento o sustancia?
                            </label>
                            {formData.ant_pat_alergias && (
                                <input 
                                    type="text" 
                                    name="ant_pat_alergias_detalle" 
                                    placeholder="Indique cuál (ej. Penicilina, Látex, etc.)" 
                                    value={formData.ant_pat_alergias_detalle} 
                                    onChange={handleChange} 
                                    className="w-full px-3 py-1.5 mt-1 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" 
                                />
                            )}
                        </div>

                        {/* Condicional Embarazo si el género es Femenino */}
                        {formData.genero === 'F' && (
                            <div className="flex flex-col gap-1 border-t pt-3 border-gray-200">
                                <label className="flex items-center gap-2 cursor-pointer text-gray-700 font-bold">
                                    <input 
                                        type="checkbox" 
                                        name="ant_pat_embarazo" 
                                        checked={formData.ant_pat_embarazo} 
                                        onChange={handleChange} 
                                        className="accent-blue-500 w-4 h-4 cursor-pointer" 
                                    /> 
                                    ¿Existe posibilidad de que esté embarazada?
                                </label>
                                {formData.ant_pat_embarazo && (
                                    <input 
                                        type="number" 
                                        name="ant_pat_embarazo_semanas" 
                                        placeholder="Indique las semanas de gestación (si aplica)" 
                                        value={formData.ant_pat_embarazo_semanas} 
                                        onChange={handleChange} 
                                        min={1}
                                        max={45}
                                        className="w-full px-3 py-1.5 mt-1 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" 
                                    />
                                )}
                            </div>
                        )}

                        {/* Tratamiento Médico */}
                        <div className="flex flex-col gap-1 border-t pt-3 border-gray-200">
                            <label className="flex items-center gap-2 cursor-pointer text-gray-700 font-bold">
                                <input 
                                    type="checkbox" 
                                    name="ant_pat_tratamiento_medico" 
                                    checked={formData.ant_pat_tratamiento_medico} 
                                    onChange={handleChange} 
                                    className="accent-blue-500 w-4 h-4 cursor-pointer" 
                                /> 
                                ¿Se encuentra actualmente bajo tratamiento médico?
                            </label>
                            {formData.ant_pat_tratamiento_medico && (
                                <input 
                                    type="text" 
                                    name="ant_pat_tratamiento_medico_detalle" 
                                    placeholder="Indique el motivo y tratamiento" 
                                    value={formData.ant_pat_tratamiento_medico_detalle} 
                                    onChange={handleChange} 
                                    className="w-full px-3 py-1.5 mt-1 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" 
                                />
                            )}
                        </div>

                        {/* Toma Medicamentos */}
                        <div className="flex flex-col gap-1 border-t pt-3 border-gray-200">
                            <label className="flex items-center gap-2 cursor-pointer text-gray-700 font-bold">
                                <input 
                                    type="checkbox" 
                                    name="ant_pat_toma_medicamentos" 
                                    checked={formData.ant_pat_toma_medicamentos} 
                                    onChange={handleChange} 
                                    className="accent-blue-500 w-4 h-4 cursor-pointer" 
                                /> 
                                ¿Esta tomado algún medicamento?
                            </label>
                            {formData.ant_pat_toma_medicamentos && (
                                <input 
                                    type="text" 
                                    name="ant_pat_toma_medicamentos_detalle" 
                                    placeholder="Indique qué medicamento y dosis" 
                                    value={formData.ant_pat_toma_medicamentos_detalle} 
                                    onChange={handleChange} 
                                    className="w-full px-3 py-1.5 mt-1 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" 
                                />
                            )}
                        </div>

                        {/* Hemorragias */}
                        <div className="flex flex-col gap-1 border-t pt-3 border-gray-200">
                            <label className="flex items-center gap-2 cursor-pointer text-gray-700 font-bold">
                                <input 
                                    type="checkbox" 
                                    name="ant_pat_hemorragias" 
                                    checked={formData.ant_pat_hemorragias} 
                                    onChange={handleChange} 
                                    className="accent-blue-500 w-4 h-4 cursor-pointer" 
                                /> 
                                ¿Ha tenido hemorragias anormales tras extracciones o cortes?
                            </label>
                            {formData.ant_pat_hemorragias && (
                                <select 
                                    name="ant_pat_hemorragias_tipo" 
                                    value={formData.ant_pat_hemorragias_tipo} 
                                    onChange={handleChange} 
                                    className="w-full px-3 py-2 mt-1 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                                >
                                    <option value="">-- Seleccionar tipo --</option>
                                    <option value="Inmediata">Inmediata (durante la intervención)</option>
                                    <option value="Mediata">Mediata (horas después)</option>
                                </select>
                            )}
                        </div>

                        {/* Otros patológicos */}
                        <div className="flex flex-col gap-1 border-t pt-3 border-gray-200">
                            <label className="block text-sm font-semibold text-gray-700">Otros antecedentes personales patológicos:</label>
                            <input 
                                type="text" 
                                name="ant_pat_otros" 
                                value={formData.ant_pat_otros} 
                                onChange={handleChange} 
                                placeholder="Especifique cirugías, alergias no listadas u otras enfermedades importantes" 
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            />
                        </div>
                    </div>
                </fieldset>

                {/* 3. ANTECEDENTES BUCODENTALES Y HÁBITOS */}
                <fieldset className="border border-gray-300 p-4 rounded-lg mt-4">
                    <legend className="font-bold px-2 text-gray-700">Antecedentes Bucodentales y Hábitos</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <div>
                            <label className="block mb-1 font-medium text-gray-700">Última visita al odontólogo:</label>
                            <input 
                                type="text" 
                                name="ant_buco_ultima_visita" 
                                value={formData.ant_buco_ultima_visita} 
                                onChange={handleChange} 
                                placeholder="Ej: Hace 6 meses, Hace 1 año..." 
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700">Otros hábitos orales:</label>
                            <input 
                                type="text" 
                                name="habito_otros" 
                                value={formData.habito_otros} 
                                onChange={handleChange} 
                                placeholder="Ej: Bruxismo (apretar dientes), comer uñas, morder lapiceros..." 
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            />
                        </div>
                        <div className="flex gap-6 mt-2 md:col-span-2">
                            <label className="flex items-center gap-2 cursor-pointer text-gray-700">
                                <input 
                                    type="checkbox" 
                                    name="habito_fuma" 
                                    checked={formData.habito_fuma} 
                                    onChange={handleChange} 
                                    className="accent-blue-500 w-4 h-4 cursor-pointer" 
                                /> 
                                ¿Fuma habitualmente?
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-gray-700">
                                <input 
                                    type="checkbox" 
                                    name="habito_bebe" 
                                    checked={formData.habito_bebe} 
                                    onChange={handleChange} 
                                    className="accent-blue-500 w-4 h-4 cursor-pointer" 
                                /> 
                                ¿Consume bebidas alcohólicas habitualmente?
                            </label>
                        </div>
                    </div>
                </fieldset>

                {/* 4. HIGIENE ORAL */}
                <fieldset className="border border-gray-300 p-4 rounded-lg mt-4">
                    <legend className="font-bold px-2 text-gray-700">Higiene Oral</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <div>
                            <label className="block mb-2 font-medium text-gray-700">¿Qué elementos de higiene utiliza?</label>
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-2 cursor-pointer text-gray-700">
                                    <input 
                                        type="checkbox" 
                                        name="hig_cepillo" 
                                        checked={formData.hig_cepillo} 
                                        onChange={handleChange} 
                                        className="accent-blue-500 w-4 h-4 cursor-pointer" 
                                    /> 
                                    Cepillo Dental
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-gray-700">
                                    <input 
                                        type="checkbox" 
                                        name="hig_hilo" 
                                        checked={formData.hig_hilo} 
                                        onChange={handleChange} 
                                        className="accent-blue-500 w-4 h-4 cursor-pointer" 
                                    /> 
                                    Hilo / Cinta Dental
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-gray-700">
                                    <input 
                                        type="checkbox" 
                                        name="hig_enjuague" 
                                        checked={formData.hig_enjuague} 
                                        onChange={handleChange} 
                                        className="accent-blue-500 w-4 h-4 cursor-pointer" 
                                    /> 
                                    Enjuague Bucal
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-gray-700">
                                    <input 
                                        type="checkbox" 
                                        name="hig_waterpik" 
                                        checked={formData.hig_waterpik} 
                                        onChange={handleChange} 
                                        className="accent-blue-500 w-4 h-4 cursor-pointer" 
                                    /> 
                                    Waterpik
                                </label>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block mb-1 font-medium text-gray-700">Frecuencia de cepillado:</label>
                                <input 
                                    type="text" 
                                    name="hig_frecuencia_cepillado" 
                                    value={formData.hig_frecuencia_cepillado} 
                                    onChange={handleChange} 
                                    placeholder="Ej: 3 veces al día" 
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                />
                            </div>
                            <div>
                                <label className="block mb-1 font-medium text-gray-700">Estado de Higiene Percibido:</label>
                                <select 
                                    name="hig_bucal_estado" 
                                    value={formData.hig_bucal_estado} 
                                    onChange={handleChange} 
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">-- Seleccionar --</option>
                                    <option value="Bueno">Bueno</option>
                                    <option value="Regular">Regular</option>
                                    <option value="Malo">Malo</option>
                                </select>
                            </div>
                        </div>

                        <div className="md:col-span-2 pt-2">
                            <label className="flex items-center gap-2 cursor-pointer text-gray-700">
                                <input 
                                    type="checkbox" 
                                    name="hig_sangrado_encias" 
                                    checked={formData.hig_sangrado_encias} 
                                    onChange={handleChange} 
                                    className="accent-blue-500 w-4 h-4 cursor-pointer" 
                                /> 
                                ¿Le sangran las encías al realizar el cepillado?
                            </label>
                        </div>
                    </div>
                </fieldset>

                {/* 5. OBSERVACIONES Y AUDITORÍA */}
                <div className="mt-4">
                    <label className="block mb-2 font-medium text-gray-700">Persona que brinda la información:</label>
                    <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <input 
                            type="text" 
                            name="persona_brinda_informacion" 
                            value={formData.persona_brinda_informacion} 
                            onChange={handleChange} 
                            placeholder="Ej: El mismo paciente, Madre, Padre" 
                            className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        />
                    </div>
                </div>

                <div className="mt-4">
                    <label className="block mb-2 font-medium text-gray-700">Observaciones Generales:</label>
                    <textarea 
                        name="observaciones_ficha" 
                        value={formData.observaciones_ficha || ''} 
                        onChange={handleChange} 
                        rows={2} 
                        placeholder="Cualquier aclaración adicional..." 
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-center mt-8 pt-6 border-t border-gray-200">
    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-lg text-lg w-full md:w-auto transition-transform hover:-translate-y-1 shadow-md">
        Enviar Datos y Completar Registro
    </button>
</div>
            </form>
            


        </div>
</div>
    );
};

export default PublicPacienteForm;
