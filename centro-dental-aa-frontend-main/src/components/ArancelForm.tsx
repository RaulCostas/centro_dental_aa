import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import type { Arancel, Especialidad } from '../types';

import EspecialidadForm from './EspecialidadForm';
import { getDynamicFigures } from '../utils/figureRegistry';


interface ArancelFormProps {
    isOpen: boolean;
    onClose: () => void;
    id?: number | null;
    onSaveSuccess: () => void;
}

const ArancelForm: React.FC<ArancelFormProps> = ({ isOpen, onClose, id, onSaveSuccess }) => {
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        detalle: '',
        precio: '' as string | number,
        moneda: '',
        estado: 'activo',
        idEspecialidad: 0,
        odontogramaColor: '',
        odontogramaFigura: ''
    });
    
    const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);

    // Estados para el Modal de Especialidad
    const [isEspecialidadModalOpen, setIsEspecialidadModalOpen] = useState(false);
    const [userPermisos, setUserPermisos] = useState<string[]>([]);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setUserPermisos(Array.isArray(user.permisos) ? user.permisos : []);
            } catch (error) {
                console.error('Error parseando usuario:', error);
            }
        }
    }, []);

    const puedeCrearEspecialidad = !userPermisos.includes('configuracion');

    useEffect(() => {
        if (isOpen) {
            fetchEspecialidades();
            if (isEditMode) {
                api.get<Arancel>(`/arancel/${id}`)
                    .then(response => {
                        setFormData({
                            detalle: response.data.detalle,
                            precio: response.data.precio.toString(),
                            moneda: response.data.moneda || '',
                            estado: response.data.estado,
                            idEspecialidad: Number(response.data.idEspecialidad),
                            odontogramaColor: response.data.odontogramaColor || '',
                            odontogramaFigura: response.data.odontogramaFigura || ''
                        });
                    })
                    .catch(error => {
                        console.error('Error fetching arancel:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Error al cargar el arancel',
                            background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                            color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                        });
                    });
            } else {
                setFormData({
                    detalle: '',
                    precio: '',
                    moneda: '',
                    estado: 'activo',
                    idEspecialidad: 0,
                    odontogramaColor: '',
                    odontogramaFigura: ''
                });
            }
        }
    }, [id, isEditMode, isOpen]);

    const fetchEspecialidades = async () => {
        try {
            const response = await api.get<{ data: Especialidad[] }>('/especialidad?limit=100');
            setEspecialidades(response.data.data);
        } catch (error) {
            console.error('Error fetching especialidades:', error);
        }
    };



    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: (name === 'idEspecialidad') ? Number(value) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const dataToSave = {
            ...formData,
            precio: Number(formData.precio),
            odontogramaColor: formData.odontogramaColor || null,
            odontogramaFigura: formData.odontogramaFigura || null
        };
        try {
            if (isEditMode) {
                await api.patch(`/arancel/${id}`, dataToSave);
                await Swal.fire({
                    icon: 'success',
                    title: 'Arancel Actualizado',
                    text: 'Arancel actualizado exitosamente',
                    timer: 1500,
                    showConfirmButton: false,
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });
            } else {
                await api.post('/arancel', dataToSave);
                await Swal.fire({
                    icon: 'success',
                    title: 'Arancel Creado',
                    text: 'Arancel creado exitosamente',
                    timer: 1500,
                    showConfirmButton: false,
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });
            }
            onSaveSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving arancel:', error);
            const errorMessage = error.response?.data?.message || 'Error al guardar el arancel';
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMessage,
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
        }
    };

    const dynamicFigures = getDynamicFigures();
    const groupedFigures = dynamicFigures.reduce((acc, figure) => {
        if (!acc[figure.specialty]) acc[figure.specialty] = [];
        acc[figure.specialty].push(figure);
        return acc;
    }, {} as Record<string, typeof dynamicFigures>);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 transition-opacity">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <span className="p-2 bg-blue-100 dark:bg-blue-900 rounded-xl text-blue-600 dark:text-blue-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                        </span>
                        {isEditMode ? 'Editar Arancel' : 'Nuevo Arancel'}
                    </h2>
                </div>

                {/* Form Content */}
                <div className="p-5 overflow-y-auto">
                    <form onSubmit={handleSubmit} id="arancel-form">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">




                            <div className="md:col-span-2 mb-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Especialidad</label>
                                <div className="relative">
                                    <div className="flex gap-2">
                                        <div className="relative flex-grow">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="8" r="7"></circle>
                                                    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                                                </svg>
                                            </div>
                                            <select
                                                name="idEspecialidad"
                                                value={formData.idEspecialidad || ''}
                                                onChange={handleChange}
                                                required
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 transition-all appearance-none"
                                            >
                                                <option value="">-- seleccionar especialidad --</option>
                                                {especialidades.map(esp => (
                                                    <option key={esp.id} value={esp.id}>
                                                        {esp.especialidad}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                        {puedeCrearEspecialidad && (
                                            <button
                                                type="button"
                                                onClick={() => setIsEspecialidadModalOpen(true)}
                                                className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-3 py-2 rounded-xl flex items-center justify-center transform hover:-translate-y-0.5 transition-all active:scale-95 shadow-md"
                                                title="Añadir Especialidad"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>



                            <div className="md:col-span-2 mb-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                            <polyline points="14 2 14 8 20 8"></polyline>
                                            <line x1="16" y1="13" x2="8" y2="13"></line>
                                            <line x1="16" y1="17" x2="8" y2="17"></line>
                                            <polyline points="10 9 9 9 8 9"></polyline>
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        name="detalle"
                                        value={formData.detalle}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 transition-all"
                                        placeholder="Ingrese una descripción..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="12" y1="1" x2="12" y2="23"></line>
                                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                        </svg>
                                    </div>
                                    <input
                                        type="number"
                                        name="precio"
                                        value={formData.precio}
                                        onChange={handleChange}
                                        step="0.01"
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 transition-all"
                                        placeholder="Ej: 150.00"
                                        required
                                    />
                                </div>
                            </div>



                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Moneda</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="12" y1="1" x2="12" y2="23"></line>
                                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                        </svg>
                                    </div>
                                    <select
                                        name="moneda"
                                        value={formData.moneda}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 transition-all appearance-none"
                                    >
                                        <option value="" disabled>-- Seleccione --</option>
                                        <option value="Bolivianos">Bolivianos</option>
                                        <option value="Dólares">Dólares</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                                            <line x1="12" y1="2" x2="12" y2="12"></line>
                                        </svg>
                                    </div>
                                    <select
                                        name="estado"
                                        value={formData.estado}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 transition-all appearance-none"
                                    >
                                        <option value="" disabled>-- Seleccione --</option>
                                        <option value="activo">Activo</option>
                                        <option value="inactivo">Inactivo</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>

                            {/* Odontogram Configuration */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color en Odontograma</label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="color"
                                        name="odontogramaColor"
                                        value={formData.odontogramaColor || '#3b82f6'}
                                        onChange={handleChange}
                                        className="w-12 h-10 p-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer flex-shrink-0"
                                    />
                                    <input
                                        type="text"
                                        name="odontogramaColor"
                                        value={formData.odontogramaColor || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: #3b82f6"
                                        className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Figura en Odontograma</label>
                                <div className="relative">
                                    <select
                                        name="odontogramaFigura"
                                        value={formData.odontogramaFigura || ''}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 transition-all appearance-none"
                                    >
                                        <option value="">-- Sin Comportamiento --</option>
                                        <optgroup label="Símbolos Predeterminados">
                                            <option value="caries">Caries (Relleno de cara)</option>
                                            <option value="cara_rellena">Obturación (Relleno completo)</option>
                                            <option value="tachar_ausente">Diente Ausente (X azul)</option>
                                            <option value="tachar_extraccion">A Extracción (X roja)</option>
                                            <option value="circulo_corona">Corona Definitiva (Círculo)</option>
                                            <option value="corona_provisoria">Corona Provisoria (Línea punteada)</option>
                                            <option value="perno">Perno Muñón (Poste)</option>
                                            <option value="puente">Puente Fijo (Enlace)</option>
                                            <option value="protesis_removible">Prótesis Removible (Bases)</option>
                                            <option value="sellante">Sellante (Marca SFF)</option>
                                            <option value="fractura">Fractura (Rayo)</option>
                                            <option value="conducto">Endodoncia / Conducto (Raíz)</option>
                                            <option value="ortodoncia">Ortodoncia (Bracket + Alambre)</option>
                                            <option value="implante">Implante (Tornillo + Corona)</option>
                                        </optgroup>
                                        
                                        {Object.entries(groupedFigures).map(([specialty, figures]) => (
                                            <optgroup key={specialty} label={`Personalizado: ${specialty}`}>
                                                {figures.map(fig => (
                                                    <option key={fig.pathKey} value={`dynamic:${fig.pathKey}`}>
                                                        {fig.name}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-start gap-3 rounded-b-xl">
                    <button
                        type="submit"
                        form="arancel-form"
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-xl flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                            <polyline points="17 21 17 13 7 13 7 21"></polyline>
                            <polyline points="7 3 7 8 15 8"></polyline>
                        </svg>
                        {isEditMode ? 'Actualizar' : 'Guardar'}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Cancelar
                    </button>
                </div>
            </div>

            {/* Modal de Creación Rápida de Especialidad */}
            {puedeCrearEspecialidad && (
                <EspecialidadForm
                    isOpen={isEspecialidadModalOpen}
                    onClose={() => setIsEspecialidadModalOpen(false)}
                    onSaveSuccess={() => {
                        fetchEspecialidades();
                        setIsEspecialidadModalOpen(false);
                    }}
                />
            )}


        </div>
    );
};

export default ArancelForm;
