import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { recetasPredisenadasService } from '../services/recetasPredisenadasService';
import type { Especialidad, RecetaPredisenada } from '../types';
import ManualModal, { type ManualSection } from './ManualModal';
import RecetaPredisenadaFormModal from './RecetaPredisenadaFormModal';
import Pagination from './Pagination';
import Swal from 'sweetalert2';
import { FileText, Trash2, Stethoscope } from 'lucide-react';

const RecetasPredisenadasList: React.FC = () => {
    const navigate = useNavigate();

    const [templates, setTemplates] = useState<RecetaPredisenada[]>([]);
    const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
    const [selectedEspecialidadId, setSelectedEspecialidadId] = useState<number | ''>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showManual, setShowManual] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const limit = 10;

    const manualSections: ManualSection[] = [
        {
            title: 'Módulo de Recetas Pre-Diseñadas',
            content: 'Este módulo permite definir recetas estándar o plantillas médicas agrupadas por especialidad (ej. Cirugía, Endodoncia, Odontopediatría).'
        },
        {
            title: 'Crear una Receta Pre-Diseñada',
            content: 'Haga clic en "+ Nueva Receta Pre-Diseñada". Seleccione la especialidad correspondiente, asigne un nombre identificativo y agregue los medicamentos con sus dosis e indicaciones por defecto.'
        },
        {
            title: 'Uso en la Ficha del Paciente',
            content: 'Al ingresar al tab "7 RECETARIO" en la ficha de cualquier paciente, podrá seleccionar una receta pre-diseñada desde el menú desplegable. El formulario cargará automáticamente el diagnóstico, las indicaciones y la lista de medicamentos.'
        }
    ];

    useEffect(() => {
        fetchEspecialidades();
        fetchTemplates();
    }, []);

    const fetchEspecialidades = async () => {
        try {
            const res = await api.get('/especialidad?limit=1000');
            const data = res.data.data || res.data || [];
            setEspecialidades(data);
        } catch (error) {
            console.error('Error fetching especialidades:', error);
        }
    };

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const data = await recetasPredisenadasService.getAll();
            setTemplates(data);
        } catch (error) {
            console.error('Error fetching predesigned templates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNew = () => {
        setEditingId(null);
        setIsModalOpen(true);
    };

    const handleEdit = (id: number) => {
        setEditingId(id);
        setIsModalOpen(true);
    };

    const handleToggleState = async (template: RecetaPredisenada) => {
        const isActivo = template.estado === 'activo';
        if (isActivo) {
            const result = await Swal.fire({
                title: '¿Dar de baja receta pre-diseñada?',
                text: 'La receta pre-diseñada pasará a estado Inactivo.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sí, dar de baja',
                cancelButtonText: 'Cancelar'
            });

            if (result.isConfirmed) {
                try {
                    await recetasPredisenadasService.update(template.id, { estado: 'inactivo' });
                    await Swal.fire({ icon: 'success', title: '¡Receta pre-diseñada dada de baja!', showConfirmButton: false, timer: 1500 });
                    fetchTemplates();
                } catch (error) {
                    console.error('Error:', error);
                    Swal.fire('Error', 'No se pudo dar de baja', 'error');
                }
            }
        } else {
            const result = await Swal.fire({
                title: '¿Reactivar receta pre-diseñada?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#16a34a',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sí, reactivar',
                cancelButtonText: 'Cancelar'
            });

            if (result.isConfirmed) {
                try {
                    await recetasPredisenadasService.update(template.id, { estado: 'activo' });
                    await Swal.fire({ icon: 'success', title: '¡Receta pre-diseñada reactivada!', showConfirmButton: false, timer: 1500 });
                    fetchTemplates();
                } catch (error) {
                    console.error('Error:', error);
                    Swal.fire('Error', 'No se pudo reactivar', 'error');
                }
            }
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Eliminar receta pre-diseñada?',
            text: 'Esta acción eliminará permanentemente la plantilla.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await recetasPredisenadasService.delete(id);
                await Swal.fire({
                    icon: 'success',
                    title: 'Plantilla Eliminada',
                    timer: 1500,
                    showConfirmButton: false
                });
                fetchTemplates();
            } catch (error) {
                console.error('Error deleting template:', error);
                Swal.fire('Error', 'No se pudo eliminar la plantilla', 'error');
            }
        }
    };

    const getEspecialidadNombre = (especialidadId: number) => {
        const found = especialidades.find(e => e.id === especialidadId);
        return found ? found.especialidad : `Especialidad #${especialidadId}`;
    };

    // Filter templates locally
    const filteredTemplates = templates.filter(tmpl => {
        const matchesSearch = searchTerm === '' || 
            tmpl.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (tmpl.diagnostico && tmpl.diagnostico.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesSpec = selectedEspecialidadId === '' || tmpl.especialidadId === Number(selectedEspecialidadId);
        
        return matchesSearch && matchesSpec;
    });

    // Pagination calculations (10 in 10)
    const totalPages = Math.ceil(filteredTemplates.length / limit) || 1;
    const paginatedTemplates = filteredTemplates.slice((currentPage - 1) * limit, currentPage * limit);

    return (
        <div className="content-card p-6 bg-gray-50 dark:bg-gray-800 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/configuration')}
                        className="group flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 !p-0 shadow-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 no-print"
                        title="Volver a Configuración"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-gray-600 dark:text-gray-400"
                        >
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                            <FileText className="text-blue-600" size={32} />
                            <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
                                Recetas Pre-Diseñadas
                            </h2>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Plantillas estándar de medicamentos organizadas por especialidad médica</p>
                    </div>
                </div>

                <div className="flex gap-2 flex-wrap justify-center md:justify-end items-center">
                    <button
                        onClick={() => setShowManual(true)}
                        className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="Ayuda / Manual"
                    >
                        ?
                    </button>

                    <button
                        onClick={handleCreateNew}
                        className="bg-[#3498db] hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <span className="text-xl font-bold">+</span> Nueva Receta Pre-Diseñada
                    </button>
                </div>
            </div>

            {/* Search and Filters Bar */}
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 no-print">
                <div className="flex gap-2 w-full md:max-w-md">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Buscar por receta o diagnóstico..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                    {searchTerm && (
                        <button
                            onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                        >
                            Limpiar
                        </button>
                    )}
                </div>

                <div className="w-full md:w-auto">
                    <select
                        value={selectedEspecialidadId}
                        onChange={(e) => { setSelectedEspecialidadId(e.target.value ? Number(e.target.value) : ''); setCurrentPage(1); }}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">-- Todas las Especialidades --</option>
                        {especialidades.map(e => (
                            <option key={e.id} value={e.id}>
                                {e.especialidad}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Registros Count */}
            <div className="mb-2 text-gray-600 dark:text-gray-400 text-sm">
                Mostrando {filteredTemplates.length === 0 ? 0 : (currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, filteredTemplates.length)} de {filteredTemplates.length} registros
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nombre de la Receta</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Especialidad</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Medicamentos Incluidos</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="text-center py-12">
                                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                    <span className="text-gray-500 dark:text-gray-400 font-medium">Cargando recetas pre-diseñadas...</span>
                                </td>
                            </tr>
                        ) : paginatedTemplates.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-12 text-gray-500 dark:text-gray-400 font-medium">
                                    No hay recetas pre-diseñadas registradas {searchTerm || selectedEspecialidadId ? 'con los filtros aplicados' : ''}.
                                </td>
                            </tr>
                        ) : (
                            paginatedTemplates.map((tmpl, index) => {
                                const isActivo = tmpl.estado === 'activo';
                                return (
                                    <tr key={tmpl.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 font-medium">
                                            {(currentPage - 1) * limit + index + 1}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200 font-bold">
                                            <div className="flex flex-col">
                                                <span>{tmpl.nombre}</span>
                                                {tmpl.diagnostico && (
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-normal mt-0.5">
                                                        Diagnóstico: {tmpl.diagnostico}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                                            {getEspecialidadNombre(tmpl.especialidadId)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">
                                            <div className="flex flex-col gap-1 max-w-md">
                                                {tmpl.detalles && tmpl.detalles.length > 0 ? (
                                                    tmpl.detalles.map((d, i) => (
                                                        <span key={i} className="text-xs text-gray-700 dark:text-gray-300 font-medium truncate">
                                                            • <strong>{d.medicamento}</strong> ({d.cantidad || 's/c'})
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Sin medicamentos especificados</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 py-1 rounded text-sm ${isActivo ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                                                {tmpl.estado}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-2">
                                            <button
                                                onClick={() => handleEdit(tmpl.id)}
                                                className="bg-[#ffc107] hover:bg-yellow-600 text-white p-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                                title="Editar"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                </svg>
                                            </button>
                                            {isActivo ? (
                                                <button
                                                    onClick={() => handleToggleState(tmpl)}
                                                    className="bg-[#dc3545] hover:bg-red-700 text-white p-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                                    title="Dar de baja"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleToggleState(tmpl)}
                                                    className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                                    title="Reactivar"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Component */}
            {filteredTemplates.length > limit && (
                <div className="mt-4 no-print">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={(page) => setCurrentPage(page)}
                    />
                </div>
            )}

            {/* Form Modal */}
            <RecetaPredisenadaFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                id={editingId}
                onSaveSuccess={fetchTemplates}
            />

            {/* Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Recetas Pre-Diseñadas"
                sections={manualSections}
            />
        </div>
    );
};

export default RecetasPredisenadasList;
