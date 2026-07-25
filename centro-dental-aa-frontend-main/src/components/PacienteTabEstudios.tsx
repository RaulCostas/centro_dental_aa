import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, FileText, Calendar, Activity, AlignLeft, Paperclip, MessageCircle, FileCheck, Send } from 'lucide-react';
import api from '../services/api';
import Swal from 'sweetalert2';
import Pagination from './Pagination';
import type { EstudioComplementario, Paciente } from '../types';
import { useParams } from 'react-router-dom';
import ManualModal, { type ManualSection } from './ManualModal';

const formatToDDMMAAAA = (dateString: string) => {
    if (!dateString) return '';
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year}`;
};

const PacienteTabEstudios: React.FC = () => {
    const { id: pacienteId } = useParams<{ id: string }>();
    const [estudios, setEstudios] = useState<EstudioComplementario[]>([]);
    const [paciente, setPaciente] = useState<Paciente | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEstudio, setEditingEstudio] = useState<EstudioComplementario | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [showManual, setShowManual] = useState(false);
    const limit = 10;

    const manualSections: ManualSection[] = [
        {
            title: 'Gestión de Estudios Complementarios',
            content: 'El módulo permite registrar y mantener un historial de los estudios (radiografías, análisis, etc.) realizados por el paciente.'
        },
        {
            title: 'Orden de Estudio y Envío por Chatbot',
            content: 'Puede adjuntar una imagen o PDF de la Orden de Estudio para constancia. Utilice el botón verde de WhatsApp para enviar la orden de estudio directamente al paciente por el Chatbot.'
        },
        {
            title: 'Crear Nuevo Estudio',
            content: 'Use el botón "+ Nuevo Estudio" para abrir el formulario. Puede subir tanto la Orden de Estudio como el Archivo Resultado del estudio.'
        }
    ];

    // Form state
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [tipoEstudio, setTipoEstudio] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [ordenFile, setOrdenFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const ordenFileInputRef = useRef<HTMLInputElement>(null);

    const fetchPaciente = async () => {
        if (!pacienteId) return;
        try {
            const response = await api.get(`/pacientes/${pacienteId}`);
            setPaciente(response.data);
        } catch (error) {
            console.error("Error fetching paciente:", error);
        }
    };

    const fetchEstudios = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                pacienteId: pacienteId || '',
                page: currentPage.toString(),
                limit: limit.toString()
            });
            if (searchTerm) params.append('search', searchTerm);
            
            const response = await api.get(`/estudios-complementarios?${params}`);
            setEstudios(response.data.data || []);
            setTotalPages(response.data.totalPages || 1);
            setTotalItems(response.data.total || (response.data.data || []).length);
        } catch (error) {
            console.error("Error fetching estudios:", error);
            Swal.fire('Error', 'No se pudieron cargar los estudios complementarios.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEstudios();
        fetchPaciente();
    }, [pacienteId, currentPage, searchTerm]);

    const handleOpenForm = (estudio?: EstudioComplementario) => {
        if (estudio) {
            setEditingEstudio(estudio);
            setFecha(estudio.fecha.split('T')[0]);
            setTipoEstudio(estudio.tipo_estudio);
            setObservaciones(estudio.observaciones || '');
        } else {
            setEditingEstudio(null);
            setFecha(new Date().toISOString().split('T')[0]);
            setTipoEstudio('');
            setObservaciones('');
        }
        setFile(null);
        setOrdenFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (ordenFileInputRef.current) ordenFileInputRef.current.value = '';
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingEstudio(null);
        setFile(null);
        setOrdenFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (ordenFileInputRef.current) ordenFileInputRef.current.value = '';
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!tipoEstudio.trim()) {
            Swal.fire('Atención', 'El campo Tipo de Estudio es obligatorio.', 'warning');
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                pacienteId: Number(pacienteId),
                fecha,
                tipo_estudio: tipoEstudio,
                observaciones
            };

            let savedEstudioId: number;

            if (editingEstudio) {
                await api.put(`/estudios-complementarios/${editingEstudio.id}`, payload);
                savedEstudioId = editingEstudio.id;
            } else {
                const res = await api.post('/estudios-complementarios', payload);
                savedEstudioId = res.data.id;
            }

            // Upload result file if selected
            if (file && savedEstudioId) {
                const formData = new FormData();
                formData.append('file', file);
                await api.post(`/estudios-complementarios/${savedEstudioId}/upload`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            // Upload orden file if selected
            if (ordenFile && savedEstudioId) {
                const formData = new FormData();
                formData.append('file', ordenFile);
                await api.post(`/estudios-complementarios/${savedEstudioId}/upload-orden`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            Swal.fire({
                icon: 'success',
                title: editingEstudio ? 'Estudio actualizado' : 'Estudio creado',
                timer: 1500,
                showConfirmButton: false
            });
            
            handleCloseForm();
            fetchEstudios();
        } catch (error: any) {
            console.error("Error saving estudio:", error);
            Swal.fire('Error', error.response?.data?.message || 'Error al guardar el estudio.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Está seguro?',
            text: "No podrá revertir esta acción.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/estudios-complementarios/${id}`);
                Swal.fire('Eliminado', 'El estudio ha sido eliminado.', 'success');
                if (estudios.length === 1 && currentPage > 1) {
                    setCurrentPage(currentPage - 1);
                } else {
                    fetchEstudios();
                }
            } catch (error) {
                console.error('Error deleting estudio:', error);
                Swal.fire('Error', 'No se pudo eliminar el estudio.', 'error');
            }
        }
    };

    const handleSendChatbot = async (estudio: EstudioComplementario) => {
        if (!estudio.orden_estudio_url) {
            Swal.fire('Atención', 'No hay una imagen u orden de estudio cargada para enviar.', 'warning');
            return;
        }

        let currentPaciente = paciente;
        if (!currentPaciente && pacienteId) {
            try {
                const res = await api.get(`/pacientes/${pacienteId}`);
                currentPaciente = res.data;
                setPaciente(currentPaciente);
            } catch (err) {
                console.error('Error fetching paciente:', err);
            }
        }

        if (!currentPaciente) {
            Swal.fire('Error', 'No se pudieron obtener los datos del paciente.', 'error');
            return;
        }

        const phone = currentPaciente.telefono_celular || currentPaciente.celular || currentPaciente.telefono;
        if (!phone) {
            Swal.fire('Atención', 'El paciente no tiene un número de celular registrado.', 'warning');
            return;
        }

        const cleanPhone = String(phone).replace(/\D/g, '');
        const jid = cleanPhone.length === 8 ? `591${cleanPhone}@s.whatsapp.net` : `${cleanPhone}@s.whatsapp.net`;

        const result = await Swal.fire({
            title: '¿Enviar Orden por WhatsApp?',
            text: `Se enviará la constancia de la orden de estudio (${estudio.tipo_estudio}) al WhatsApp (${phone}) del paciente.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, enviar por WhatsApp',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            Swal.fire({
                title: 'Enviando orden...',
                text: 'Por favor espere mientras se envía el mensaje.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            try {
                await api.post('/chatbot/send-media', {
                    jid,
                    filename: estudio.orden_estudio_url,
                    caption: `📄 *CENTRO DENTAL A&A*\nEstimado(a) *${currentPaciente.nombre} ${currentPaciente.paterno || ''}*, adjuntamos su *Orden de Estudio Complementario*: *${estudio.tipo_estudio}*.`
                });

                Swal.fire('¡Enviado!', 'La orden de estudio ha sido enviada exitosamente al paciente vía WhatsApp.', 'success');
            } catch (error: any) {
                console.error('Error sending media via chatbot:', error);
                Swal.fire('Error', error.response?.data?.message || 'No se pudo enviar la orden por WhatsApp. Verifique la conexión del Chatbot.', 'error');
            }
        }
    };

    const getFileUrl = (filename: string) => {
        const baseUrl = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : '';
        return `${baseUrl}/uploads/${filename}`;
    };

    return (
        <div className="content-card p-6 bg-gray-50 dark:bg-gray-800 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex flex-col">
                    <h2 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                        <FileText className="text-blue-500" size={28} />
                        Estudios Complementarios
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión de órdenes y estudios complementarios del paciente</p>
                </div>
                
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowManual(true)}
                        className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="Ayuda / Manual"
                    >
                        ?
                    </button>
                    <button
                        onClick={() => handleOpenForm()}
                        className="bg-[#3498db] hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <span className="text-xl font-bold">+</span> Nuevo Estudio
                    </button>
                </div>
            </div>

            <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center gap-4">
                <div className="flex gap-2 w-full md:max-w-md">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Buscar por tipo de estudio..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-300"
                        />
                        <Search className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" size={20} />
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
            </div>

            {!isLoading && totalItems > 0 && (
                <div className="mb-4 text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Mostrando {(currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, totalItems)} de {totalItems} registros
                </div>
            )}

            {isLoading ? (
                <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">#</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo de Estudio</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Observaciones</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-36">Orden de Estudio</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">Resultado</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {estudios.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">
                                        No se encontraron estudios complementarios.
                                    </td>
                                </tr>
                            ) : (
                                estudios.map((estudio, idx) => (
                                    <tr key={estudio.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-medium">
                                            {(currentPage - 1) * limit + idx + 1}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-medium">
                                            {formatToDDMMAAAA(estudio.fecha)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                                            {estudio.tipo_estudio}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                                            {estudio.observaciones || '-'}
                                        </td>
                                        
                                        {/* ORDEN DE ESTUDIO + BOTÓN CHATBOT */}
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {estudio.orden_estudio_url ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <a 
                                                        href={getFileUrl(estudio.orden_estudio_url)} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors flex justify-center items-center"
                                                        title="Ver Orden de Estudio"
                                                    >
                                                        <FileCheck size={18} />
                                                    </a>
                                                    <button
                                                        onClick={() => handleSendChatbot(estudio)}
                                                        className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md transition-all transform hover:-translate-y-0.5 flex justify-center items-center"
                                                        title="Enviar orden al paciente"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 dark:text-gray-500 text-xs italic">Sin Orden</span>
                                            )}
                                        </td>

                                        {/* ARCHIVO RESULTADO */}
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {estudio.archivo_url ? (
                                                <div className="flex justify-center">
                                                    <a 
                                                        href={getFileUrl(estudio.archivo_url)} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex justify-center items-center"
                                                        title="Ver Archivo Resultado"
                                                    >
                                                        <FileText size={18} />
                                                    </a>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 dark:text-gray-500 text-xs italic">Sin Resultado</span>
                                            )}
                                        </td>

                                        {/* ACCIONES */}
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex justify-center items-center gap-2">
                                                <button
                                                    onClick={() => handleOpenForm(estudio)}
                                                    className="bg-[#ffc107] hover:bg-yellow-600 text-white p-2 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                                    title="Editar"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(estudio.id)}
                                                    className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                                    title="Eliminar"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {!isLoading && totalPages > 1 && (
                <div className="mt-4">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}

            {/* FORMULARIO DE ESTUDIOS */}
            {isFormOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                                {editingEstudio ? 'Editar Estudio Complementario' : 'Nuevo Estudio Complementario'}
                            </h3>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-gray-800">
                            <form id="estudioForm" onSubmit={handleSave} className="space-y-4">
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Fecha <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                                        <input
                                            type="date"
                                            required
                                            value={fecha}
                                            onChange={(e) => setFecha(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Tipo de Estudio <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Activity className="w-5 h-5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej. Radiografía Panorámica, Tomografía CBCT"
                                            value={tipoEstudio}
                                            onChange={(e) => setTipoEstudio(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observaciones</label>
                                    <div className="relative">
                                        <AlignLeft className="w-5 h-5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                                        <textarea
                                            value={observaciones}
                                            onChange={(e) => setObservaciones(e.target.value)}
                                            rows={3}
                                            placeholder="Detalles adicionales o indicación médica..."
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        ></textarea>
                                    </div>
                                </div>

                                {/* ORDEN DE ESTUDIO */}
                                <div className="mb-4 bg-indigo-50/50 dark:bg-indigo-950/20 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                                    <label className="block text-sm font-bold text-indigo-900 dark:text-indigo-200 mb-1 flex items-center gap-1.5">
                                        <FileCheck className="w-4 h-4 text-indigo-600" />
                                        Orden de Estudio (Imagen o PDF de la Orden)
                                    </label>
                                    {editingEstudio?.orden_estudio_url && !ordenFile && (
                                        <div className="mb-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                                            Orden actual: <a href={getFileUrl(editingEstudio.orden_estudio_url)} target="_blank" rel="noreferrer" className="underline hover:text-indigo-500">Ver archivo de orden</a>
                                        </div>
                                    )}
                                    <div className="relative">
                                        <Paperclip className="w-5 h-5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                                        <input
                                            type="file"
                                            accept=".jpg,.jpeg,.png,.pdf"
                                            ref={ordenFileInputRef}
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files.length > 0) {
                                                    setOrdenFile(e.target.files[0]);
                                                } else {
                                                    setOrdenFile(null);
                                                }
                                            }}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-100 dark:file:bg-indigo-900/40 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-200 cursor-pointer"
                                        />
                                    </div>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Adjunte la orden médica para que quede grabada como constancia y poder enviarla por WhatsApp.</p>
                                </div>

                                {/* ARCHIVO RESULTADO */}
                                <div className="mb-4 bg-gray-50/70 dark:bg-gray-900/40 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700">
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                                        <Paperclip className="w-4 h-4 text-blue-500" />
                                        Archivo Resultado del Estudio (Imagen o PDF)
                                    </label>
                                    {editingEstudio?.archivo_url && !file && (
                                        <div className="mb-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                                            Resultado actual: <a href={getFileUrl(editingEstudio.archivo_url)} target="_blank" rel="noreferrer" className="underline hover:text-blue-500">Ver resultado</a>
                                        </div>
                                    )}
                                    <div className="relative">
                                        <Paperclip className="w-5 h-5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                                        <input
                                            type="file"
                                            accept=".jpg,.jpeg,.png,.pdf"
                                            ref={fileInputRef}
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files.length > 0) {
                                                    setFile(e.target.files[0]);
                                                } else {
                                                    setFile(null);
                                                }
                                            }}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 cursor-pointer"
                                        />
                                    </div>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Adjunte el resultado entregado por el laboratorio o centro radiológico.</p>
                                </div>
                            </form>
                        </div>
                        
                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex justify-start gap-3">
                            <button
                                type="submit"
                                form="estudioForm"
                                disabled={isSaving}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-xl flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md disabled:opacity-50"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                    <polyline points="7 3 7 8 15 8"></polyline>
                                </svg>
                                {isSaving ? 'Guardando...' : 'Guardar Estudio'}
                            </button>
                            <button
                                type="button"
                                onClick={handleCloseForm}
                                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Estudios Complementarios"
                sections={manualSections}
            />
        </div>
    );
};

export default PacienteTabEstudios;
