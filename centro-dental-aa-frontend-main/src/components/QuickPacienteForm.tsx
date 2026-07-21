import React, { useState } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import type { Paciente } from '../types';
import { getLocalDateString } from '../utils/dateUtils';
import { Plus, Shield } from 'lucide-react';
import type { Seguro } from '../types';


interface QuickPacienteFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newPaciente: Paciente) => void;
}

const QuickPacienteForm: React.FC<QuickPacienteFormProps> = ({ isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        nombre: '',
        paterno: '',
        materno: '',
        ci: '',
        genero: 'M' // Default
    });

    const [countryCode, setCountryCode] = useState('+591');
    const [localCelular, setLocalCelular] = useState('');

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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Combine phone code and number
            const fullCelular = `${countryCode}${localCelular}`;

            // Create a clean payload removing null, undefined, or empty values
            const payload: any = {};
            Object.entries(formData).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    payload[key] = value;
                }
            });

            // Set phone number
            payload.telefono_celular = fullCelular;

            // Set required defaults
            payload.fecha_ingreso = getLocalDateString();
            payload.estado = 'activo';
            payload.genero = formData.genero; 

            // Add medical history defaults if not present
            const defaults = {
                ant_pat_tratamiento_medico: false,
                ant_pat_hemorragias: false,
                ant_pat_intervencion_quirurgica: false,
                ant_pat_reaccion_anestesia: false,
                ant_pat_toma_medicamentos: false,
                ant_pat_alergias: false,
                ant_no_pat_fuma: false,
                ant_no_pat_bruxismo: false,
                ant_no_pat_bebe: false,
                ant_no_pat_succion_digital: false,
                ant_no_pat_onicofagia: false,
                ant_no_pat_mordisqueo_objetos: false,
                ant_no_pat_queilofagia: false
            };

            Object.entries(defaults).forEach(([key, val]) => {
                if (payload[key] === undefined) {
                    payload[key] = val;
                }
            });

            // Add user ID for auditing
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    if (user.id) payload.usuarioId = Number(user.id);
                } catch (e) {
                    console.error("Error parsing user for auditing", e);
                }
            }

            const response = await api.post('/pacientes', payload);
            if (response.data) {
                Swal.fire({
                    icon: 'success',
                    title: 'Paciente Registrado',
                    text: 'Paciente registrado correctamente',
                    timer: 1500,
                    showConfirmButton: false
                });
                onSuccess(response.data);
                onClose();
            }
        } catch (error: any) {
            console.error('Error creating patient:', error);
            const errorMessage = error.response?.data?.message || 'Error al crear paciente';
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMessage
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[9999] p-2 sm:p-4">
            <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-xl w-full max-w-[400px] max-h-[95vh] overflow-y-auto shadow-lg text-gray-800 dark:text-white">
                <h3 className="mt-0 text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-900 dark:text-white">Nuevo Paciente Rápido</h3>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-3">
                        <div>
                            <label className="block mb-1 font-bold text-sm text-gray-700 dark:text-gray-300">Nombre:</label>
                            <input
                                type="text"
                                name="nombre"
                                value={formData.nombre}
                                onChange={handleChange}
                                required
                                className="w-full p-2 pl-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ej: Juan"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block mb-1 font-bold text-sm text-gray-700 dark:text-gray-300">Paterno:</label>
                                <input
                                    type="text"
                                    name="paterno"
                                    value={formData.paterno}
                                    onChange={handleChange}
                                    required
                                    className="w-full p-2 pl-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ej: Pérez"
                                />
                            </div>
                            <div>
                                <label className="block mb-1 font-bold text-sm text-gray-700 dark:text-gray-300">Materno:</label>
                                <input
                                    type="text"
                                    name="materno"
                                    value={formData.materno}
                                    onChange={handleChange}
                                    className="w-full p-2 pl-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ej: Gómez"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block mb-1 font-bold text-sm text-gray-700 dark:text-gray-300">C.I.:</label>
                                <input
                                    type="text"
                                    name="ci"
                                    value={formData.ci}
                                    onChange={handleChange}
                                    className="w-full p-2 pl-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Opcional"
                                />
                            </div>
                            <div>
                                <label className="block mb-1 font-bold text-sm text-gray-700 dark:text-gray-300">Sexo:</label>
                                <select
                                    name="genero"
                                    value={formData.genero}
                                    onChange={handleChange}
                                    className="w-full p-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="M">Masculino</option>
                                    <option value="F">Femenino</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-bold text-sm text-gray-700 dark:text-gray-300">Celular:</label>
                            <div className="flex gap-2">
                                <select
                                    value={countryCode}
                                    onChange={(e) => setCountryCode(e.target.value)}
                                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans text-sm"
                                >
                                    {countryCodes.map(c => (
                                        <option key={c.code} value={c.code}>{c.label}</option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    value={localCelular}
                                    onChange={(e) => setLocalCelular(e.target.value)}
                                    required
                                    className="flex-1 p-2 pl-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ej: 70012345"
                                />
                            </div>
                        </div>
                    </div>
                    {/* Footer Buttons */}
                    <div className="flex justify-start gap-3 mt-8 p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl -mx-4 -mb-5 sm:-mx-5 sm:-mb-5">
                        <button
                            type="submit"
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 sm:px-4 rounded-xl flex items-center gap-2 transition-colors transform hover:-translate-y-0.5 shadow-sm text-sm sm:text-base"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="sm:w-[18px] sm:h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                <polyline points="7 3 7 8 15 8"></polyline>
                            </svg>
                            Guardar
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-3 sm:px-4 rounded-xl transition-all flex items-center gap-2 text-sm sm:text-base"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Unused styles removed

export default QuickPacienteForm;
