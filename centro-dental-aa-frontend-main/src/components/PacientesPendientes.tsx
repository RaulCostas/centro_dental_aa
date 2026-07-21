import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { formatDate } from '../utils/dateUtils';
import { formatFullName } from '../utils/formatters';
import { Clock, Search, XCircle } from 'lucide-react';
import ManualModal, { type ManualSection } from './ManualModal';
import Pagination from './Pagination';

interface PacientePendiente {
    id: number;
    nombre: string;
    paterno: string;
    materno: string;
    celular: string;
    ultima_fecha_seguimiento: string | null;
    ultima_cita: string | null;
    ultimo_doctor: string | null;
    ultimo_tratamiento: string | null;
    ultima_especialidad: string | null;
    numero_presupuesto: number | null;
}

const PacientesPendientes: React.FC = () => {
    const [pacientes, setPacientes] = useState<PacientePendiente[]>([]);
    const [loading, setLoading] = useState(true);
    const [showManual, setShowManual] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalRecords, setTotalRecords] = useState(0);
    const limit = 10;

    const manualSections: ManualSection[] = [
        {
            title: 'Pacientes por Agendar',
            content: 'Muestra pacientes que tienen tratamientos en curso o planes de tratamiento activos pero que no cuentan con una cita activa (Agendada o Confirmada) desde su última atención.'
        },
        {
            title: 'Buscador de Pacientes',
            content: 'Puede buscar pacientes específicos por nombre o apellido utilizando la barra de búsqueda superior.'
        },
        {
            title: 'Seguimiento Clínico',
            content: 'En la tabla puede ver el número de plan de tratamiento, la fecha del último seguimiento (atención en clínica), quién lo atendió y qué tratamiento se realizó por última vez.'
        }];

    const fetchPacientes = useCallback(async (searchOverride?: string, pageOverride?: number) => {
        setLoading(true);
        try {
            const currentSearch = searchOverride !== undefined ? searchOverride : searchTerm;
            const currentPageToFetch = pageOverride !== undefined ? pageOverride : currentPage;
            
            const params = new URLSearchParams();
            params.append('tab', 'no_agendados');
            params.append('page', currentPageToFetch.toString());
            params.append('limit', limit.toString());
            if (currentSearch) params.append('search', currentSearch);

            const response = await api.get<{ data: PacientePendiente[], total: number, totalPages: number }>(`/pacientes/pendientes?${params.toString()}`);
            setPacientes(response.data.data);
            setTotalRecords(response.data.total);
            setTotalPages(response.data.totalPages);
        } catch (error) {
            console.error('Error fetching pacientes pendientes:', error);
        } finally {
            setLoading(false);
        }
    }, [searchTerm, currentPage]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            setCurrentPage(1);
            fetchPacientes(searchTerm, 1);
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    useEffect(() => {
        fetchPacientes();
    }, [currentPage]);

    const handleClear = () => {
        setSearchTerm('');
    };

    return (
        <div className="content-card p-6 bg-gray-50 dark:bg-gray-800 min-h-screen text-gray-800 dark:text-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <Clock className="text-blue-600" size={32} />
                        Pacientes por Agendar
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Pacientes con planes activos sin cita futura</p>
                </div>
                <button
                    onClick={() => setShowManual(true)}
                    className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title="Ayuda / Manual"
                >
                    ?
                </button>
            </div>

            {/* Search Bar */}
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 no-print">
                <div className="flex gap-2 w-full md:max-w-md">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Escriba nombre o apellido del paciente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-300 shadow-sm"
                        />
                        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                    </div>
                    {searchTerm && (
                        <button
                            onClick={handleClear}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 whitespace-nowrap"
                        >
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                Mostrando {totalRecords === 0 ? 0 : (currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, totalRecords)} de {totalRecords} registros
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <div className="text-gray-500 dark:text-gray-400">Cargando pacientes por agendar...</div>
                </div>
            ) : (
                <>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden transition-colors border border-gray-100 dark:border-gray-700">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider w-16">#</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider"># Plan</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Paciente</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Especialidad</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Último Tratamiento</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Último Seguimiento</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Doctor</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                                    {pacientes.length > 0 ? (
                                        pacientes.map((p, index) => (
                                            <tr key={`${p.id}-${p.numero_presupuesto}`} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">{(currentPage - 1) * limit + index + 1}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-blue-600 dark:text-blue-400 font-bold">{p.numero_presupuesto || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white font-semibold">
                                                    {formatFullName(p)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs">
                                                        {p.ultima_especialidad || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400 max-w-xs truncate" title={p.ultimo_tratamiento || ''}>
                                                    {p.ultimo_tratamiento || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400 font-medium">
                                                    {formatDate(p.ultima_fecha_seguimiento)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                                                    {p.ultimo_doctor || '-'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center">
                                                    <Search className="text-gray-300 mb-2" size={48} />
                                                    <p className="text-gray-500 dark:text-gray-400 italic">No se encontraron pacientes por agendar.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {totalPages > 1 && (
                        <div className="mt-4 flex justify-center">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </>
            )}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual - Pacientes Pendientes"
                sections={manualSections}
            />
        </div>
    );
};

export default PacientesPendientes;
