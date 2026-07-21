import React, { useState, useEffect } from 'react';
import api from '../services/api';
import type { Paciente, User, Agenda } from '../types';
import { formatDate } from '../utils/dateUtils';
import { formatFullName } from '../utils/formatters';
import SearchablePatientSelect from './SearchablePatientSelect';

interface QuienAgendoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export interface SearchFilters {
    fechaInicio?: string;
    fechaFinal?: string;
    pacienteId?: number;
    usuarioId?: number;
}

const QuienAgendoModal: React.FC<QuienAgendoModalProps> = ({ isOpen, onClose }) => {
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFinal, setFechaFinal] = useState('');
    const [pacienteId, setPacienteId] = useState<number | undefined>(undefined);
    const [usuarioId, setUsuarioId] = useState<number | undefined>(undefined);

    const [usuarios, setUsuarios] = useState<User[]>([]);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [isUserSearchOpen, setIsUserSearchOpen] = useState(false);
    const [results, setResults] = useState<Agenda[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // fetchPacientes(); // Removed
            // fetchUsuarios(); // Removed
            // Reset state when modal opens
            setShowResults(false);
            setResults([]);
        }
    }, [isOpen]);

    // User Search Logic
    useEffect(() => {
        if (!isOpen || userSearchTerm.trim().length < 2) {
            setUsuarios([]);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const response = await api.get(`/users?search=${userSearchTerm}&limit=10&estado=activo`);
                setUsuarios(response.data.data || []);
            } catch (error) {
                console.error('Error searching users:', error);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [userSearchTerm, isOpen]);

    const handleSearch = async () => {
        setLoading(true);
        try {
            let url = '/agenda?';
            const params: string[] = [];

            if (fechaInicio) params.push(`fechaInicio=${fechaInicio}`);
            if (fechaFinal) params.push(`fechaFinal=${fechaFinal}`);
            if (pacienteId) params.push(`pacienteId=${pacienteId}`);
            if (usuarioId) params.push(`usuarioId=${usuarioId}`);

            url += params.join('&');

            const response = await api.get(url);
            const data = Array.isArray(response.data) ? response.data : [];
            setResults(data);
            setShowResults(true);
        } catch (error) {
            console.error('Error searching:', error);
            setResults([]);
            setShowResults(true);
        } finally {
            setLoading(false);
        }
    };

    const handleNewSearch = () => {
        setShowResults(false);
        setResults([]);
        setFechaInicio('');
        setFechaFinal('');
        setPacienteId(undefined);
        setUsuarioId(undefined);
    };

    const formatDateLocal = (dateStr: string) => {
        return formatDate(dateStr);
    };

    const formatTime = (timeStr: string) => {
        if (!timeStr) return '-';
        return timeStr.substring(0, 5);
    };

    const formatDateTime = (dateTimeStr: string) => {
        return formatDate(dateTimeStr); // Keep it consistent with dd/mm/aaaa as requested
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
                    <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4" id="modal-title">
                                    ¿Quién Agendó?
                                </h3>

                                {!showResults ? (
                                    // Search Form
                                    <div className="mt-4 space-y-4">
                                        {/* Date Range */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Fecha Inicio
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                                            <line x1="16" y1="2" x2="16" y2="6"></line>
                                                            <line x1="8" y1="2" x2="8" y2="6"></line>
                                                            <line x1="3" y1="10" x2="21" y2="10"></line>
                                                        </svg>
                                                    </div>
                                                    <input
                                                        type="date"
                                                        value={fechaInicio}
                                                        onChange={(e) => setFechaInicio(e.target.value)}
                                                        className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Fecha Final
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                                            <line x1="16" y1="2" x2="16" y2="6"></line>
                                                            <line x1="8" y1="2" x2="8" y2="6"></line>
                                                            <line x1="3" y1="10" x2="21" y2="10"></line>
                                                        </svg>
                                                    </div>
                                                    <input
                                                        type="date"
                                                        value={fechaFinal}
                                                        onChange={(e) => setFechaFinal(e.target.value)}
                                                        className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Patient Dropdown */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Paciente
                                                </label>
                                                <SearchablePatientSelect
                                                    onSelect={(type, id) => setPacienteId(id || undefined)}
                                                    selectedId={pacienteId}
                                                    selectedType={pacienteId ? 'particular' : null} // Simplified for this modal which currently only handles particular patients in its original select? 
                                                    // Wait, the original select didn't differentiate between type? 
                                                    // Let's check line 195: {pacientes.map((p) => ( ... formatFullName(p) ))}
                                                    // The original QuienAgendoModal only fetched from /pacientes (particular). 
                                                    placeholder="Todos los pacientes"
                                                />
                                            </div>

                                            {/* User Dropdown */}
                                            <div className="relative">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Usuario
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                            <circle cx="8.5" cy="7" r="4"></circle>
                                                        </svg>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={isUserSearchOpen ? userSearchTerm : (usuarios.find(u => u.id === usuarioId)?.name || 'Todos los usuarios')}
                                                        onFocus={() => setIsUserSearchOpen(true)}
                                                        onChange={(e) => setUserSearchTerm(e.target.value)}
                                                        placeholder="Buscar usuario..."
                                                        className="w-full pl-10 pr-10 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                    {usuarioId && (
                                                        <button 
                                                            onClick={() => { setUsuarioId(undefined); setIsUserSearchOpen(false); setUserSearchTerm(''); }}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 bg-transparent hover:bg-transparent border-none p-0 min-h-0 min-w-0 shadow-none focus:outline-none focus:ring-0"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                        </button>
                                                    )}
                                                </div>
                                                {isUserSearchOpen && userSearchTerm.length >= 2 && (
                                                    <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg max-h-40 overflow-y-auto">
                                                        {usuarios.map(u => (
                                                            <div 
                                                                key={u.id}
                                                                onClick={() => { setUsuarioId(u.id); setIsUserSearchOpen(false); setUserSearchTerm(''); }}
                                                                className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer text-sm text-gray-800 dark:text-gray-200"
                                                            >
                                                                {u.name}
                                                            </div>
                                                        ))}
                                                        {usuarios.length === 0 && <div className="p-2 text-xs text-gray-500 text-center">No se encontraron usuarios</div>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    // Results Table
                                    <div className="mt-4">
                                        <div className="mb-4 flex justify-between items-center">
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                Se encontraron {results.length} resultado(s)
                                            </p>
                                            <button
                                                onClick={handleNewSearch}
                                                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded text-sm font-medium transition-colors"
                                            >
                                                Nueva Búsqueda
                                            </button>
                                        </div>

                                        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                                    <tr>
                                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Usuario</th>
                                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Fecha Agendada</th>
                                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Paciente</th>
                                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Consultorio</th>
                                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Fecha Cita</th>
                                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Hora Cita</th>
                                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                    {results.length > 0 ? (
                                                        results.map((agenda) => (
                                                            <tr key={agenda.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                                    {agenda.usuario?.name || '-'}
                                                                </td>
                                                                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                                    {formatDateTime(agenda.fechaAgendado)}
                                                                </td>
                                                                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                                    {agenda.paciente ? formatFullName(agenda.paciente) : '-'}
                                                                </td>
                                                                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                                    {agenda.consultorio || '-'}
                                                                </td>
                                                                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                                    {formatDateLocal(agenda.fecha)}
                                                                </td>
                                                                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                                    {formatTime(agenda.hora)}
                                                                </td>
                                                                <td className="px-3 py-4 whitespace-nowrap">
                                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${agenda.estado === 'agendado' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                                                        agenda.estado === 'confirmado' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                                            agenda.estado === 'cancelado' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                                                                agenda.estado === 'atendido' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' :
                                                                                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                                        }`}>
                                                                        {agenda.estado.toUpperCase()}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                                                No se encontraron resultados
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="px-8 py-6 pb-10 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-start gap-3 rounded-b-xl -mx-4 sm:-mx-6">
                        {!showResults ? (
                            <>
                                <button
                                    type="button"
                                    onClick={handleSearch}
                                    disabled={loading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-8 text-lg rounded-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                    </svg>
                                    {loading ? 'Buscando...' : 'Buscar'}
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                    Cerrar
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={onClose}
                                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                Cerrar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuienAgendoModal;
