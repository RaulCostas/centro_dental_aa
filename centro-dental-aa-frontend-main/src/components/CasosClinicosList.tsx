import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { CasoClinico, CasoClinicoFoto } from '../types';
import ManualModal, { type ManualSection } from './ManualModal';
import Pagination from './Pagination';
import CasoClinicoFormModal from './CasoClinicoFormModal';
import Swal from 'sweetalert2';
import { Printer, FolderGit2, Play, Image, ChevronLeft, ChevronRight, X, Video } from 'lucide-react';

interface PaginatedResponse {
    data: CasoClinico[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

const CasosClinicosList: React.FC = () => {
    const navigate = useNavigate();
    const [casos, setCasos] = useState<CasoClinico[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [showManual, setShowManual] = useState(false);

    // Form Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    // Video Player Modal State
    const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
    const [activeVideoTitle, setActiveVideoTitle] = useState<string>('');

    // Photo Gallery Lightbox State
    const [activeGalleryFotos, setActiveGalleryFotos] = useState<CasoClinicoFoto[]>([]);
    const [activeGalleryIndex, setActiveGalleryIndex] = useState<number>(0);
    const [activeGalleryTitle, setActiveGalleryTitle] = useState<string>('');

    const limit = 10;

    const manualSections: ManualSection[] = [
        {
            title: 'Módulo de Casos Clínicos',
            content: 'Este módulo permite al Dr. registrar y organizar casos clínicos con fotos de antes/después y videos para demostración explicativa a los pacientes.'
        },
        {
            title: 'Crear un Caso Clínico',
            content: 'Haga clic en el botón "+ Nuevo Caso Clínico", asigne el nombre del tratamiento, la especialidad correspondiente, y adjunte fotos y/o video demostrativo.'
        },
        {
            title: 'Visualización interactiva',
            content: 'En la lista, haga clic en las miniatura de foto o en el botón de Video para reproducirlo y mostrar las fotos a pantalla completa ante el paciente.'
        }
    ];

    useEffect(() => {
        fetchCasos();
    }, [currentPage, searchTerm]);

    const fetchCasos = async () => {
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: limit.toString(),
            });

            if (searchTerm) {
                params.append('search', searchTerm);
            }

            const response = await api.get<PaginatedResponse>(`/casos-clinicos?${params}`);
            setCasos(response.data.data);
            setTotalPages(response.data.totalPages);
            setTotal(response.data.total);
        } catch (error) {
            console.error('Error fetching casos clínicos:', error);
            alert('Error al cargar los casos clínicos');
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Dar de baja caso clínico?',
            text: 'El caso clínico pasará a estado Inactivo.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, dar de baja',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.patch(`/casos-clinicos/${id}`, { estado: 'inactivo' });
                await Swal.fire({ icon: 'success', title: '¡Caso clínico dado de baja!', showConfirmButton: false, timer: 1500 });
                fetchCasos();
            } catch (error) {
                console.error('Error:', error);
                Swal.fire('Error', 'No se pudo dar de baja', 'error');
            }
        }
    };

    const handleReactivate = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Reactivar caso clínico?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, reactivar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.patch(`/casos-clinicos/${id}`, { estado: 'activo' });
                await Swal.fire({ icon: 'success', title: '¡Caso clínico reactivado!', showConfirmButton: false, timer: 1500 });
                fetchCasos();
            } catch (error) {
                console.error('Error:', error);
                Swal.fire('Error', 'No se pudo reactivar', 'error');
            }
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handlePrint = async () => {
        try {
            const response = await api.get<PaginatedResponse>(`/casos-clinicos?page=1&limit=9999${searchTerm ? `&search=${searchTerm}` : ''}`);
            const allCasos = response.data.data;

            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            document.body.appendChild(iframe);

            const doc = iframe.contentWindow?.document;
            if (!doc) {
                document.body.removeChild(iframe);
                return;
            }

            const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Lista de Casos Clínicos</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                        @page { size: A4; margin: 2cm 1.5cm 3cm 1.5cm; }
                        body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; color: #1e293b; }
                        .header { display: flex; justify-content: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #3b82f6; }
                        h1 { color: #1e3a8a; margin: 0; font-size: 26px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
                        table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 20px; font-size: 13px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
                        th { background-color: #2563eb; color: white; padding: 12px 10px; text-align: left; font-weight: 600; border-bottom: 1px solid #1d4ed8; }
                        td { padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; }
                        tr:last-child td { border-bottom: none; }
                        tr:nth-child(even) { background-color: #f8fafc; }
                        .status-active { color: #059669; font-weight: 600; }
                        .status-inactive { color: #dc2626; font-weight: 600; }
                        @media print {
                            th { background-color: #2563eb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            tr:nth-child(even) { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Lista de Casos Clínicos</h1>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Nombre del Caso</th>
                                <th>Especialidad</th>
                                <th>Fotos</th>
                                <th>Video</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allCasos.map((c, i) => `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td>${c.nombre || '-'}</td>
                                    <td>${c.especialidad?.especialidad || 'General'}</td>
                                    <td>${c.fotos?.length || 0} foto(s)</td>
                                    <td>${c.video ? 'Sí' : 'No'}</td>
                                    <td class="${c.estado === 'activo' ? 'status-active' : 'status-inactive'}">
                                        ${c.estado ? (c.estado.charAt(0).toUpperCase() + c.estado.slice(1)) : 'Inactivo'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </body>
                </html>
            `;

            doc.open();
            doc.write(printContent);
            doc.close();

            const doPrint = () => {
                try {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                } catch (e) {
                    console.error('Print error:', e);
                } finally {
                    setTimeout(() => {
                        if (document.body.contains(iframe)) {
                            document.body.removeChild(iframe);
                        }
                    }, 2000);
                }
            };

            doPrint();
        } catch (error: any) {
            console.error('Error al imprimir:', error);
            alert('Error al generar el documento de impresión: ' + (error.message || 'Error desconocido'));
        }
    };

    const openGallery = (fotos: CasoClinicoFoto[], title: string, initialIndex = 0) => {
        if (!fotos || fotos.length === 0) return;
        setActiveGalleryFotos(fotos);
        setActiveGalleryIndex(initialIndex);
        setActiveGalleryTitle(title);
    };

    return (
        <div className="content-card p-6 bg-gray-50 dark:bg-gray-800 min-h-screen">
            {/* Header matching Especialidades */}
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
                            <FolderGit2 className="text-blue-600" size={32} />
                            <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
                                Casos Clínicos
                            </h2>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Gestión de casos clínicos con fotos y videos explicativos
                        </p>
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

                    <div className="flex gap-2 items-center">
                        <button
                            onClick={handlePrint}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                            title="Imprimir"
                        >
                            <Printer size={18} />
                            <span className="text-sm">Imprimir</span>
                        </button>
                    </div>

                    <div className="h-10 w-px bg-gray-300 dark:bg-gray-600 mx-1 self-center"></div>

                    <button
                        onClick={() => { setSelectedId(null); setIsModalOpen(true); }}
                        className="bg-[#3498db] hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <span className="text-xl font-bold">+</span> Nueva Caso Clínico
                    </button>
                </div>
            </div>

            {/* Search Bar matching Especialidades with Clear Button */}
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 no-print">
                <div className="flex gap-2 w-full md:max-w-md">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Buscar por caso clínico..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
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
            </div>

            {/* Counter matching Especialidades */}
            <div className="mb-2 text-gray-600 dark:text-gray-400 text-sm">
                Mostrando {total === 0 ? 0 : (currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, total)} de {total} registros
            </div>

            {/* Table matching Especialidades */}
            <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nombre del Caso</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Especialidad</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fotos</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Video</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {casos.map((caso, index) => (
                            <tr key={caso.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                                    {(currentPage - 1) * limit + index + 1}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 font-semibold">
                                    {caso.nombre}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                                    {caso.especialidad?.especialidad || 'General'}
                                </td>
                                {/* Fotos column */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {caso.fotos && caso.fotos.length > 0 ? (
                                        <button
                                            onClick={() => openGallery(caso.fotos!, caso.nombre, 0)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-300 rounded-lg text-xs font-semibold transition-all border border-blue-200 dark:border-blue-800"
                                        >
                                            <Image size={14} />
                                            <span>{caso.fotos.length} foto(s)</span>
                                        </button>
                                    ) : (
                                        <span className="text-gray-400 text-xs italic">Sin fotos</span>
                                    )}
                                </td>
                                {/* Video column */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {caso.video ? (
                                        <button
                                            onClick={() => {
                                                setActiveVideoUrl(caso.video!);
                                                setActiveVideoTitle(caso.nombre);
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-300 rounded-lg text-xs font-semibold transition-all border border-red-200 dark:border-red-800"
                                        >
                                            <Play size={14} className="fill-current" />
                                            <span>Ver Video</span>
                                        </button>
                                    ) : (
                                        <span className="text-gray-400 text-xs italic">Sin video</span>
                                    )}
                                </td>
                                {/* Estado column matching Especialidades */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 py-1 rounded text-sm ${caso.estado === 'activo' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                                        {caso.estado}
                                    </span>
                                </td>
                                {/* Actions column matching Especialidades */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-2">
                                    <button
                                        onClick={() => { setSelectedId(caso.id); setIsModalOpen(true); }}
                                        className="bg-[#ffc107] hover:bg-yellow-600 text-white p-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                        title="Editar"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                        </svg>
                                    </button>
                                    {caso.estado === 'activo' ? (
                                        <button
                                            onClick={() => handleDelete(caso.id)}
                                            className="bg-[#dc3545] hover:bg-red-700 text-white p-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                            title="Dar de baja"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleReactivate(caso.id)}
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
                        ))}
                    </tbody>
                </table>
            </div>

            {casos.length === 0 && (
                <p className="text-center mt-5 text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'No se encontraron resultados' : 'No hay casos clínicos registrados'}
                </p>
            )}

            {/* Pagination matching Especialidades */}
            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            )}

            {/* Video Player Modal */}
            {activeVideoUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="relative bg-gray-900 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl border border-gray-700">
                        <div className="flex items-center justify-between px-6 py-3 bg-gray-800 text-white border-b border-gray-700">
                            <div className="flex items-center gap-2 font-bold text-sm">
                                <Video size={18} className="text-teal-400" />
                                <span>{activeVideoTitle}</span>
                            </div>
                            <button
                                onClick={() => setActiveVideoUrl(null)}
                                className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-2 bg-black flex justify-center items-center">
                            <video
                                src={activeVideoUrl}
                                controls
                                autoPlay
                                className="max-h-[75vh] w-full object-contain rounded-lg"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Photo Lightbox Modal */}
            {activeGalleryFotos.length > 0 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="relative max-w-5xl w-full flex flex-col items-center">
                        <div className="w-full flex items-center justify-between text-white mb-4">
                            <div>
                                <h3 className="font-bold text-lg">{activeGalleryTitle}</h3>
                                <p className="text-xs text-gray-400">Foto {activeGalleryIndex + 1} de {activeGalleryFotos.length}</p>
                            </div>
                            <button
                                onClick={() => setActiveGalleryFotos([])}
                                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="relative w-full flex items-center justify-center min-h-[50vh] max-h-[75vh] bg-black/50 rounded-2xl overflow-hidden p-2">
                            <img
                                src={activeGalleryFotos[activeGalleryIndex]?.foto}
                                alt={`Foto ${activeGalleryIndex + 1}`}
                                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-2xl transition-all"
                            />

                            {activeGalleryFotos.length > 1 && (
                                <>
                                    <button
                                        onClick={() => setActiveGalleryIndex(prev => (prev > 0 ? prev - 1 : activeGalleryFotos.length - 1))}
                                        className="absolute left-4 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full transition-all border border-white/20"
                                    >
                                        <ChevronLeft size={28} />
                                    </button>
                                    <button
                                        onClick={() => setActiveGalleryIndex(prev => (prev < activeGalleryFotos.length - 1 ? prev + 1 : 0))}
                                        className="absolute right-4 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full transition-all border border-white/20"
                                    >
                                        <ChevronRight size={28} />
                                    </button>
                                </>
                            )}
                        </div>

                        {activeGalleryFotos[activeGalleryIndex]?.descripcion && (
                            <div className="mt-4 px-6 py-2 bg-white/10 backdrop-blur-md rounded-xl text-white text-sm font-semibold text-center max-w-xl">
                                {activeGalleryFotos[activeGalleryIndex].descripcion}
                            </div>
                        )}

                        {activeGalleryFotos.length > 1 && (
                            <div className="flex gap-2 mt-4 overflow-x-auto max-w-full p-2">
                                {activeGalleryFotos.map((item, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveGalleryIndex(idx)}
                                        className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                                            idx === activeGalleryIndex ? 'border-teal-500 scale-105 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'
                                        }`}
                                    >
                                        <img src={item.foto} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Form Modal */}
            <CasoClinicoFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchCasos}
                casoId={selectedId}
            />

            {/* Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Casos Clínicos"
                sections={manualSections}
            />
        </div>
    );
};

export default CasosClinicosList;
