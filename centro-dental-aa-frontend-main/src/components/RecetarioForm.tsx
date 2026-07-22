import React, { useState, useEffect } from 'react';
import api from '../services/api';
import type { Paciente, RecetaDetalle, RecetaPredisenada, Especialidad } from '../types';
import Swal from 'sweetalert2';
import ManualModal, { type ManualSection } from './ManualModal';
import { getLocalDateString } from '../utils/dateUtils';
import { formatFullName } from '../utils/formatters';
import SearchablePatientSelect from './SearchablePatientSelect';
import { Stethoscope, Sparkles, FileText, Pill, Plus } from 'lucide-react';
import { recetasPredisenadasService } from '../services/recetasPredisenadasService';


interface FormData {
    pacienteId: number;
    userId: number;
    fecha: string;
    medicamentos: string; // Legacy/Notes
    indicaciones: string; // Legacy/General Notes
    diagnostico?: string;
    detalles: RecetaDetalle[];
}

interface RecetarioFormProps {
    isOpen: boolean;
    onClose: () => void;
    id?: number | string | null;
    onSaveSuccess?: () => void;
    defaultPacienteId?: number;
}

const RecetarioForm: React.FC<RecetarioFormProps> = ({ isOpen, onClose, id, onSaveSuccess, defaultPacienteId }) => {
    
    const isEditing = Boolean(id);
    const localDate = getLocalDateString();

    const [formData, setFormData] = useState<FormData>({
        pacienteId: defaultPacienteId || 0,
        userId: 0,
        fecha: localDate,
        medicamentos: '',
        indicaciones: '',
        detalles: [{
            id: 0,
            recetaId: 0,
            medicamento: '',
            cantidad: '',
            indicacion: ''
        }]
    });

    const [showManual, setShowManual] = useState(false);
    const [predisenadas, setPredisenadas] = useState<RecetaPredisenada[]>([]);
    const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
    const [selectedPredisenadaId, setSelectedPredisenadaId] = useState<number | ''>('');

    const manualSections: ManualSection[] = [
        {
            title: 'Crear/Editar Receta',
            content: 'Complete los datos del formulario para crear o editar una receta médica. Seleccione el paciente y agregue los medicamentos necesarios.'
        },
        {
            title: 'Agregar Medicamentos',
            content: 'Use la tabla de "Detalle de Medicamentos" para agregar múltiples medicamentos. Haga clic en el botón "+" verde para agregar más filas. Complete el nombre del medicamento, cantidad e indicaciones específicas para cada uno.'
        },
        {
            title: 'Eliminar Medicamentos',
            content: 'Para eliminar un medicamento de la lista, haga clic en el botón rojo de papelera en la fila correspondiente. Debe mantener al menos un medicamento en la receta.'
        },
        {
            title: 'Notas Adicionales',
            content: 'Puede expandir la sección "Notas Adicionales / Generales" para agregar indicaciones generales que apliquen a toda la receta, no solo a un medicamento específico.'
        },
        {
            title: 'Guardar Receta',
            content: 'Una vez completados todos los datos, haga clic en "Guardar Receta" o "Actualizar Receta" según corresponda. La receta quedará registrada y podrá ser enviada por WhatsApp desde la lista de recetas.'
        }];

    useEffect(() => {
        if (!isOpen) return;

        const userStr = localStorage.getItem('user');
        let currentUserId = 0;
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user.id) {
                    currentUserId = user.id;
                    setFormData(prev => ({ ...prev, userId: user.id }));
                }
            } catch (e) {
                console.error("Error parsing user", e);
            }
        }

        if (isEditing && id) {
            fetchReceta();
        } else {
            setFormData({
                pacienteId: defaultPacienteId || 0,
                userId: currentUserId,
                fecha: localDate,
                medicamentos: '',
                indicaciones: '',
                diagnostico: '',
                detalles: [{
                    id: 0,
                    recetaId: 0,
                    medicamento: '',
                    cantidad: '',
                    indicacion: ''
                }]
            });
        }
        fetchPredisenadasData();
    }, [isOpen, isEditing, id, defaultPacienteId]);

    const fetchPredisenadasData = async () => {
        try {
            const [tmplList, specRes] = await Promise.all([
                recetasPredisenadasService.getAll({ estado: 'activo' }),
                api.get('/especialidad?limit=1000')
            ]);
            setPredisenadas(tmplList);
            const specs = specRes.data.data || specRes.data || [];
            setEspecialidades(specs);
        } catch (e) {
            console.error("Error fetching predesigned recipes", e);
        }
    };

    const handleClearPredisenada = () => {
        setSelectedPredisenadaId('');
        setFormData(prev => ({
            ...prev,
            diagnostico: '',
            indicaciones: '',
            detalles: [{
                id: 0,
                recetaId: 0,
                medicamento: '',
                cantidad: '',
                indicacion: ''
            }]
        }));
    };

    const handleApplyPredisenada = (tmplId: number) => {
        if (!tmplId) {
            handleClearPredisenada();
            return;
        }
        const found = predisenadas.find(p => p.id === tmplId);
        if (!found) return;

        setSelectedPredisenadaId(tmplId);
        setFormData(prev => ({
            ...prev,
            diagnostico: found.diagnostico || prev.diagnostico || '',
            indicaciones: found.indicaciones || prev.indicaciones || '',
            detalles: found.detalles && found.detalles.length > 0
                ? found.detalles.map(d => ({
                    id: 0,
                    recetaId: 0,
                    medicamento: d.medicamento,
                    cantidad: d.cantidad,
                    indicacion: d.indicacion
                }))
                : prev.detalles
        }));
    };



    // fetchPacientes removed to save egress

    const fetchReceta = async () => {
        try {
            const response = await api.get(`/receta/${id}`);
            const data = response.data;
            setFormData({
                pacienteId: data.pacienteId,
                userId: data.userId,
                fecha: data.fecha.split('T')[0],
                medicamentos: data.medicamentos || '',
                indicaciones: data.indicaciones || '',
                diagnostico: data.diagnostico || '',
                detalles: data.detalles || []
            });
            if (!data.detalles || data.detalles.length === 0) {
                addDetalle();
            }
        } catch (error) {
            console.error('Error fetching receta:', error);
            Swal.fire('Error', 'No se pudo cargar la receta', 'error');
            onClose();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: (name === 'pacienteId') ? Number(value) : value
        }));
    };

    // Detail handlers
    const addDetalle = () => {
        setFormData(prev => ({
            ...prev,
            detalles: [...prev.detalles, {
                id: 0,
                recetaId: 0,
                medicamento: '',
                cantidad: '',
                indicacion: ''
            }]
        }));
    };

    const removeDetalle = (index: number) => {
        setFormData(prev => ({
            ...prev,
            detalles: prev.detalles.filter((_, i) => i !== index)
        }));
    };

    const handleDetalleChange = (index: number, field: keyof RecetaDetalle, value: string) => {
        setFormData(prev => {
            const newDetalles = [...prev.detalles];
            newDetalles[index] = { ...newDetalles[index], [field]: value };
            return { ...prev, detalles: newDetalles };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.pacienteId) {
            Swal.fire('Atención', 'Seleccione un paciente', 'warning');
            return;
        }
        if (!formData.userId) {
            Swal.fire('Atención', 'No se pudo identificar al usuario. Recargue la página.', 'warning');
            return;
        }

        // Filter out empty rows
        const validDetalles = formData.detalles.filter(d => d.medicamento.trim() !== '');

        // Don't enforce details if legacy user wants to use text areas, but encourage it.
        // Or if we strictly follow user request: "register various medications", we assume they use the table.
        // Let's pass the payload as is, but clean up the empty rows.

        const payload = {
            ...formData,
            detalles: validDetalles
        };

        try {
            if (isEditing) {
                await api.patch(`/receta/${id}`, payload);
                await Swal.fire({
                    icon: 'success',
                    title: 'Receta Actualizada',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await api.post('/receta', payload);
                await Swal.fire({
                    icon: 'success',
                    title: 'Receta Creada',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
            if (onSaveSuccess) onSaveSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving receta:', error);
            Swal.fire('Error', 'No se pudo guardar la receta', 'error');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black bg-opacity-50 transition-opacity">
            <div className="w-full max-w-[1000px] h-full bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto transform transition-transform animate-slide-in-right">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6 border-b dark:border-gray-700 pb-4">
                        <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-800 dark:text-white">
                            <span className="p-2 bg-blue-100 dark:bg-blue-900 rounded-xl text-blue-600 dark:text-blue-300">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </span>
                            {isEditing ? 'Editar Receta' : 'Nueva Receta'}
                        </h2>
                        <button
                            type="button"
                            onClick={() => setShowManual(true)}
                            className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                            title="Ayuda / Manual"
                        >
                            ?
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Fecha:</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="date"
                                        name="fecha"
                                        value={formData.fecha}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-10 p-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {!defaultPacienteId && (
                            <div>
                                <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Paciente:</label>
                                <SearchablePatientSelect
                                    onSelect={(type, id) => {
                                        setFormData(prev => ({ ...prev, pacienteId: id }));
                                    }}
                                    selectedId={formData.pacienteId}
                                    selectedType="particular"
                                    allowType="particular"
                                    required
                                />
                            </div>
                        )}

                        {/* Cargar Receta Pre-Diseñada */}
                        {!isEditing && predisenadas.length > 0 && (
                            <div className="bg-blue-50/70 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/60 p-4 rounded-xl shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                                        <Sparkles size={16} className="text-blue-600 dark:text-blue-400 animate-pulse" />
                                        Cargar Receta Pre-Diseñada (Opcional):
                                    </label>
                                    {selectedPredisenadaId && (
                                        <button
                                            type="button"
                                            onClick={handleClearPredisenada}
                                            className="text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-300 font-bold px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-800/60 transition-all shadow-xs"
                                        >
                                            ✕ Limpiar selección
                                        </button>
                                    )}
                                </div>
                                <select
                                    value={selectedPredisenadaId || ''}
                                    onChange={(e) => handleApplyPredisenada(Number(e.target.value))}
                                    className="w-full p-2.5 rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 shadow-xs"
                                >
                                    <option value="">-- Seleccionar Receta Pre-Diseñada por Especialidad --</option>
                                    {predisenadas.map(tmpl => {
                                        const specFound = especialidades.find(e => e.id === tmpl.especialidadId);
                                        const specName = specFound ? specFound.especialidad : `Especialidad #${tmpl.especialidadId}`;
                                        return (
                                            <option key={tmpl.id} value={tmpl.id}>
                                                [{specName}] - {tmpl.nombre}
                                            </option>
                                        );
                                    })}
                                </select>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                                    Al elegir una plantilla pre-diseñada, el formulario se rellenará automáticamente. Podrás editar cualquier campo o agregar más medicamentos libremente.
                                </p>
                            </div>
                        )}

                        {/* Diagnostico Field */}
                        <div className="mb-4">
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Diagnóstico:</label>
                            <div className="relative">
                                <Stethoscope size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    name="diagnostico"
                                    value={formData.diagnostico || ''}
                                    onChange={handleChange}
                                    placeholder="Escriba el diagnóstico del paciente (Opcional)"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                                />
                            </div>
                        </div>

                        {/* Details Table */}
                        <div className="mt-6 border p-4 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-base text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                    <Pill size={18} className="text-blue-500" />
                                    Detalle de Medicamentos
                                </h3>
                                <button
                                    type="button"
                                    onClick={addDetalle}
                                    className="p-1 bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 text-green-600 dark:text-green-400 rounded-full transition-all transform hover:-translate-y-0.5 shadow-sm flex items-center gap-1 px-2.5 py-1 text-xs font-semibold"
                                    title="Agregar Medicamento"
                                >
                                    <Plus size={16} />
                                    <span>Agregar Medicamento</span>
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Medicamento</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-36">Cantidad</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Indicaciones</th>
                                            <th className="px-3 py-2 text-center w-10">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {formData.detalles.map((detalle, index) => (
                                            <tr key={index}>
                                                <td className="p-2 align-top">
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                                            </svg>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={detalle.medicamento}
                                                            onChange={(e) => handleDetalleChange(index, 'medicamento', e.target.value)}
                                                            placeholder="Nombre del medicamento"
                                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="p-2 align-top">
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                                                            </svg>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={detalle.cantidad}
                                                            onChange={(e) => handleDetalleChange(index, 'cantidad', e.target.value)}
                                                            placeholder="Cant."
                                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="p-2 align-top">
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={detalle.indicacion}
                                                            onChange={(e) => handleDetalleChange(index, 'indicacion', e.target.value)}
                                                            placeholder="Indicaciones específicas"
                                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="p-2 text-center align-middle">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeDetalle(index)}
                                                        className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-full transition-all transform hover:-translate-y-0.5 shadow-sm"
                                                        disabled={formData.detalles.length === 1 && index === 0}
                                                        title="Eliminar fila"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Indicaciones Generales de la Receta */}
                        <div className="mt-6">
                            <label className="block mb-1 font-semibold text-gray-700 dark:text-gray-300">
                                Indicaciones Generales de la Receta (Opcional):
                            </label>
                            <div className="relative">
                                <FileText size={18} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
                                <textarea
                                    name="indicaciones"
                                    value={formData.indicaciones}
                                    onChange={handleChange}
                                    rows={3}
                                    placeholder="Escriba las indicaciones generales de la receta (ej: Aplicar hielo local por 15 minutos, mantener reposo, no usar sorbete, etc.)"
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-xs"
                                />
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="flex justify-start gap-3 mt-8 p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl -mx-6 -mb-6">
                            <button
                                type="submit"
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-xl flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                    <polyline points="7 3 7 8 15 8"></polyline>
                                </svg>
                                {isEditing ? 'Actualizar Receta' : 'Guardar Receta'}
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

                    </form>

                    {/* Manual Modal */}
                    <ManualModal
                        isOpen={showManual}
                        onClose={() => setShowManual(false)}
                        title="Manual de Usuario - Formulario de Receta"
                        sections={manualSections}
                    />
                </div>
            </div>
        </div>
    );
};

export default RecetarioForm;
