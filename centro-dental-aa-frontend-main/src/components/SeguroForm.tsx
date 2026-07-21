import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import type { Seguro } from '../types';
import { ShieldCheck, Palette, Save, X, Hash, Phone, MapPin, Mail, User } from 'lucide-react';

interface SeguroFormProps {
    isOpen: boolean;
    onClose: () => void;
    id?: number | null;
    onSaveSuccess: () => void;
}

const SeguroForm: React.FC<SeguroFormProps> = ({ isOpen, onClose, id, onSaveSuccess }) => {
    const [formData, setFormData] = useState({
        nombre: '',
        color: '#3498db',
        estado: 'activo',
        nit: '',
        direccion: '',
        telefono: '',
        email: '',
        contacto_nombre: ''
    });

    const colors = [
        { name: 'Azul', value: '#3b82f6' },
        { name: 'Verde', value: '#10b981' },
        { name: 'Rojo', value: '#ef4444' },
        { name: 'Amarillo', value: '#f59e0b' },
        { name: 'Púrpura', value: '#8b5cf6' },
        { name: 'Rosa', value: '#ec4899' },
        { name: 'Teal', value: '#14b8a6' },
        { name: 'Indigo', value: '#6366f1' },
        { name: 'Naranja', value: '#f97316' },
        { name: 'Slate', value: '#64748b' },
    ];

    useEffect(() => {
        if (isOpen) {
            if (id) {
                api.get<Seguro>(`/seguro/${id}`)
                    .then(response => {
                        setFormData({
                            nombre: response.data.nombre,
                            color: response.data.color,
                            estado: response.data.estado,
                            nit: response.data.nit || '',
                            direccion: response.data.direccion || '',
                            telefono: response.data.telefono || '',
                            email: response.data.email || '',
                            contacto_nombre: response.data.contacto_nombre || ''
                        });
                    })
                    .catch(error => {
                        console.error('Error fetching particular/seguro:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Error al cargar los datos'
                        });
                    });
            } else {
                setFormData({
                    nombre: '',
                    color: '#3b82f6',
                    estado: 'activo',
                    nit: '',
                    direccion: '',
                    telefono: '',
                    email: '',
                    contacto_nombre: ''
                });
            }
        }
    }, [id, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleColorSelect = (colorValue: string) => {
        setFormData({
            ...formData,
            color: colorValue
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (id) {
                await api.patch(`/seguro/${id}`, formData);
                await Swal.fire({
                    icon: 'success',
                    title: 'Actualizado',
                    text: 'Registro actualizado exitosamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await api.post('/seguro', formData);
                await Swal.fire({
                    icon: 'success',
                    title: 'Creado',
                    text: 'Registro creado exitosamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
            onSaveSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving particular/seguro:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al guardar los datos'
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 transition-opacity">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <span className="p-2 bg-blue-100 dark:bg-blue-900 rounded-xl text-blue-600 dark:text-blue-300">
                            <ShieldCheck size={20} />
                        </span>
                        {id ? 'Editar Aseguradora / Convenio' : 'Nueva Aseguradora / Convenio'}
                    </h2>
                </div>

                {/* Form Content */}
                <div className="p-5 overflow-y-auto">
                    <form onSubmit={handleSubmit} id="seguro-form">
                        <div className="mb-4">
                            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Razón Social / Nombre de la Aseguradora:</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <ShieldCheck size={18} className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={handleChange}
                                    required
                                    placeholder="Ej: Caja de Salud, Alianza, etc."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">NIT:</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Hash size={18} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        name="nit"
                                        value={formData.nit}
                                        onChange={handleChange}
                                        placeholder="Ej: 123456789"
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Teléfono:</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Phone size={18} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        name="telefono"
                                        value={formData.telefono}
                                        onChange={handleChange}
                                        placeholder="Ej: 70012345"
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="mb-4">
                            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Dirección:</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MapPin size={18} className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    name="direccion"
                                    value={formData.direccion}
                                    onChange={handleChange}
                                    placeholder="Ej: Av. Principal #123"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Email:</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail size={18} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="Ej: contacto@empresa.com"
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Contacto (Nombre):</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User size={18} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        name="contacto_nombre"
                                        value={formData.contacto_nombre}
                                        onChange={handleChange}
                                        placeholder="Ej: Juan Pérez"
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Color Picker Grid */}
                        <div className="mb-4">
                            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Palette size={16} /> Color Distintivo:
                            </label>
                            <div className="grid grid-cols-5 gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                                {colors.map((c) => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        onClick={() => handleColorSelect(c.value)}
                                        className={`w-8 h-8 rounded-full transition-all border-2 ${formData.color === c.value ? 'border-gray-600 dark:border-white ring-1 ring-blue-400' : 'border-transparent shadow-sm'}`}
                                        style={{ backgroundColor: c.value }}
                                        title={c.name}
                                    />
                                ))}
                            </div>
                        </div>



                        <div className="mb-4">
                            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Estado:</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                                        <line x1="12" y1="2" x2="12" y2="12"></line>
                                    </svg>
                                </div>
                                <select
                                    name="estado"
                                    value={formData.estado}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none transition-all"
                                    required
                                >
                                    <option value="activo">Activo</option>
                                    <option value="inactivo">Inactivo</option>
                                </select>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-start gap-3 rounded-b-xl">
                    <button
                        type="submit"
                        form="seguro-form"
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-xl flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md"
                    >
                        <Save size={18} />
                        {id ? 'Actualizar' : 'Guardar'}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <X size={18} />
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SeguroForm;
