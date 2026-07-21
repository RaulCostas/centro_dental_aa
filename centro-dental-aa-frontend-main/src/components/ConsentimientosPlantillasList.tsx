import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { ConsentimientoPlantilla } from '../types';
import ManualModal, { type ManualSection } from './ManualModal';
import Pagination from './Pagination';
import Swal from 'sweetalert2';
import ConsentimientosPlantillaForm from './ConsentimientosPlantillaForm';
import { FileText, ArrowLeft, Printer } from 'lucide-react';

interface PaginatedResponse {
    data: ConsentimientoPlantilla[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

const ConsentimientosPlantillasList: React.FC = () => {
    const navigate = useNavigate();
    const [plantillas, setPlantillas] = useState<ConsentimientoPlantilla[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [showManual, setShowManual] = useState(false);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const limit = 10;

    const manualSections: ManualSection[] = [
        {
            title: 'Gestión de Plantillas',
            content: 'Aquí puede crear y editar las plantillas de Consentimientos Informados.'
        },
        {
            title: 'Variables Automáticas',
            content: 'Use etiquetas como {{NOMBRE_PACIENTE}} en el texto. Estas serán reemplazadas automáticamente al momento de imprimir el PDF desde la ficha del paciente.'
        }];

    useEffect(() => {
        fetchPlantillas();
    }, [currentPage, searchTerm]);

    const fetchPlantillas = async () => {
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: limit.toString(),
            });

            if (searchTerm) {
                params.append('search', searchTerm);
            }

            const response = await api.get<PaginatedResponse>(`/consentimientos-plantillas?${params}`);
            setPlantillas(response.data.data);
            setTotalPages(response.data.totalPages);
            setTotal(response.data.total);
        } catch (error) {
            console.error('Error fetching plantillas:', error);
            Swal.fire('Error', 'No se pudieron cargar las plantillas', 'error');
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Eliminar plantilla?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/consentimientos-plantillas/${id}`);
                await Swal.fire({ icon: 'success', title: '¡Plantilla eliminada!', showConfirmButton: false, timer: 1500 });
                fetchPlantillas();
            } catch (error) {
                console.error('Error:', error);
                Swal.fire('Error', 'No se pudo eliminar', 'error');
            }
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handlePrint = async () => {
        try {
            // Fetch ALL records for printing (without pagination)
            const response = await api.get<PaginatedResponse>(`/consentimientos-plantillas?page=1&limit=9999${searchTerm ? `&search=${searchTerm}` : ''}`);
            const allPlantillas = response.data.data;

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
                    <title>Lista de Plantillas de Consentimientos</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                        
                        @page {
                            size: A4;
                            margin: 2cm 1.5cm 3cm 1.5cm;
                        }
                        
                        body {
                            font-family: 'Inter', sans-serif;
                            margin: 0;
                            padding: 0;
                            color: #1e293b;
                        }
                        
                        .header {
                            display: flex;
                            justify-content: center;
                            margin-bottom: 30px;
                            padding-bottom: 20px;
                            border-bottom: 3px solid #3b82f6;
                        }
                        
                        h1 {
                            color: #1e3a8a;
                            margin: 0;
                            font-size: 26px;
                            font-weight: 700;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        }
                        
                        table {
                            width: 100%;
                            border-collapse: separate;
                            border-spacing: 0;
                            margin-top: 20px;
                            font-size: 13px;
                            border: 1px solid #e2e8f0;
                            border-radius: 8px;
                            overflow: hidden;
                        }
                        
                        th {
                            background-color: #2563eb;
                            color: white;
                            padding: 12px 10px;
                            text-align: left;
                            font-weight: 600;
                            border-bottom: 1px solid #1d4ed8;
                        }
                        
                        td {
                            padding: 10px;
                            border-bottom: 1px solid #e2e8f0;
                            color: #334155;
                        }
                        
                        tr:last-child td {
                            border-bottom: none;
                        }
                        
                        tr:nth-child(even) {
                            background-color: #f8fafc;
                        }
                        
                        @media print {
                            th {
                                background-color: #2563eb !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            
                            tr:nth-child(even) {
                                background-color: #f8fafc !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Lista de Plantillas de Consentimientos</h1>
                    </div>
                   
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Título de la Plantilla</th>
                                <th>Última Actualización</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allPlantillas.map((p, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${p.titulo}</td>
                                    <td>${p.fechaActualizacion ? new Date(p.fechaActualizacion).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}</td>
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

            // Esperar un momento para que se carguen los estilos
            setTimeout(() => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                
                // Cleanup iframe after printing
                setTimeout(() => {
                    document.body.removeChild(iframe);
                }, 1000);
            }, 500);

        } catch (error) {
            console.error('Error printing:', error);
            Swal.fire('Error', 'No se pudo generar el documento para imprimir', 'error');
        }
    };

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
                            <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">Consentimientos Informados</h1>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Administre los documentos legales que firman sus pacientes</p>
                    </div>
                </div>

                <div className="flex gap-2 flex-wrap justify-center md:justify-end items-center mt-4 md:mt-0">
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
                        <span className="text-xl font-bold">+</span> Nuevo Consentimiento Informado
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 no-print">
                <div className="flex gap-2 w-full md:max-w-md">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Buscar por título..."
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

            <div className="mb-2 text-gray-600 dark:text-gray-400 text-sm">
                Mostrando {total === 0 ? 0 : (currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, total)} de {total} registros
            </div>

            <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Especialidad</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Título del Consentimiento</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha Actualización</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {plantillas.map((p, index) => (
                            <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{(currentPage - 1) * limit + index + 1}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{p.especialidad?.especialidad || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 max-w-xs truncate" title={p.titulo}>{p.titulo}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                                    {p.fechaActualizacion ? new Date(p.fechaActualizacion).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-2">
                                    <button
                                        onClick={() => { setSelectedId(p.id); setIsModalOpen(true); }}
                                        className="bg-[#ffc107] hover:bg-yellow-600 text-white p-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                        title="Editar"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(p.id)}
                                        className="bg-[#dc3545] hover:bg-red-700 text-white p-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                        title="Eliminar"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {plantillas.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                    No se encontraron consentimientos informados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Setup */}
            {totalPages > 1 && (
                <div className="mt-6 flex justify-center no-print">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                </div>
            )}

            {/* Modal Manual */}
            {showManual && (
                <ManualModal
                    isOpen={showManual}
                    onClose={() => setShowManual(false)}
                    sections={manualSections}
                />
            )}

            {/* Modal Formulario */}
            <ConsentimientosPlantillaForm
                isOpen={isModalOpen}
                id={selectedId}
                onClose={() => { setIsModalOpen(false); setSelectedId(null); }}
                onSaved={() => {
                    setIsModalOpen(false);
                    setSelectedId(null);
                    fetchPlantillas();
                }}
            />
        </div>
    );
};

export default ConsentimientosPlantillasList;
