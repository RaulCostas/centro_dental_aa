import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { Agenda, Paciente } from '../types';
import { formatDate, getLocalDateString } from '../utils/dateUtils';
import { formatFullName } from '../utils/formatters';
import { Calendar, Plus, ChevronRight, Info } from 'lucide-react';
import ManualModal, { type ManualSection } from './ManualModal';
import AgendaForm from './AgendaForm';
import Pagination from './Pagination';

const estadoColor = (estado: string) => {
    switch (estado?.toLowerCase()) {
        case 'agendado':   return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
        case 'completada':
        case 'atendido':   return 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
        case 'cancelada':
        case 'cancelado':  return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
        case 'no asistio':
        case 'no asistió': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300';
        case 'en espera':  return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300';
        case 'en atencion':
        case 'en atención':return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300';
        default:           return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    }
};

const addMinutes = (hora: string, mins: number): string => {
    if (!hora) return '';
    const [h, m] = hora.split(':').map(Number);
    const total = h * 60 + m + (mins || 0);
    const rh = Math.floor(total / 60) % 24;
    const rm = total % 60;
    return `${String(rh).padStart(2, '0')}:${String(rm).padStart(2, '0')}`;
};

const PacienteTabCitas: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [citas, setCitas] = useState<Agenda[]>([]);
    const [loading, setLoading] = useState(true);
    const [paciente, setPaciente] = useState<Paciente | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedCita, setSelectedCita] = useState<Agenda | null>(null);
    const [showManual, setShowManual] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const manualSections: ManualSection[] = [
        {
            title: 'Historial de Citas',
            content: 'En esta pestaña puede ver todas las citas programadas, atendidas o canceladas del paciente.'
        },
        {
            title: 'Programar Nueva Cita',
            content: 'Use el botón "+ Nueva Cita" para abrir el formulario de agenda. El paciente ya estará pre-seleccionado.'
        },
        {
            title: 'Editar Citas',
            content: 'Haga clic en la fecha de una cita próxima (resaltada en azul) para modificar sus detalles o estado.'
        }
    ];

    const fetchCitas = async () => {
        if (!id) return;
        try {
            const baseUrl = '/pacientes';
            const agendaUrl = `/agenda?pacienteId=${id}`;

            const [pacRes, agendaRes] = await Promise.allSettled([
                api.get(`${baseUrl}/${id}`),
                api.get(`${agendaUrl}&limit=1000`),
            ]);
            if (pacRes.status === 'fulfilled') setPaciente(pacRes.value.data);
            if (agendaRes.status === 'fulfilled') {
                const d = agendaRes.value.data;
                setCitas(Array.isArray(d) ? d : (d?.data ?? []));
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchCitas();
    }, [id]);

    const sorted = [...citas].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const paginatedCitas = sorted.slice(indexOfFirstItem, indexOfLastItem);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPast = (fecha: string) => new Date(fecha) < today;

    const rowStyle = (c: Agenda) => {
        const estado = c.estado?.toLowerCase();
        if (estado === 'cancelada' || estado === 'cancelado')
            return 'bg-red-50 dark:bg-red-950/40 border-l-4 border-red-400 dark:border-red-600';
        if (isPast(c.fecha))
            return 'opacity-60 bg-gray-50 dark:bg-gray-900/40';
        return 'bg-blue-50/40 dark:bg-blue-900/10';
    };

    const handleFechaClick = (c: Agenda) => {
        if (!isPast(c.fecha)) {
            setSelectedCita(c);
            setModalOpen(true);
        }
    };

    return (
        <div className="content-card bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6 transition-colors">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex flex-col">
                    <h2 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                        <Calendar className="text-blue-500" size={28} />
                        Historial de Citas
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión y seguimiento de citas programadas</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowManual(true)}
                        className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm"
                        title="Ayuda / Manual"
                    >
                        ?
                    </button>
                    <button
                        onClick={() => {
                            setSelectedCita(null);
                            setModalOpen(true);
                        }}
                        className="bg-[#3498db] hover:bg-blue-600 text-white hover:text-white font-bold py-2.5 px-8 text-lg rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <Plus size={20} /> Nueva Cita
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : sorted.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                    <Calendar size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Sin citas registradas para este paciente</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-4 mb-2 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                        <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm border-[1.5px] border-blue-500 dark:border-blue-400"></span> Citas futuras <span className="text-[9px] text-gray-400 font-normal normal-case ml-1">(clic en fecha para editar)</span></div>
                        <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm border-[1.5px] border-gray-400 dark:border-gray-500"></span> Citas pasadas</div>
                        <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm border-[1.5px] border-red-500 dark:border-red-400"></span> Canceladas</div>
                    </div>

                    {/* Record Count */}
                    {sorted.length > 0 && (
                        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                            Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, sorted.length)} de {sorted.length} registros
                        </div>
                    )}
                    
                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                                <tr>
                                    {['Fecha', 'Hora', 'Doctor', 'Tratamiento', 'Estado'].map(h => (
                                        <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                {paginatedCitas.map(c => {
                                    const estadoNorm = c.estado?.toLowerCase() || '';
                                    const esCancelada = ['cancelada', 'cancelado'].includes(estadoNorm);
                                    const esPasada = isPast(c.fecha) && !esCancelada;
                                    const esFutura = !isPast(c.fecha) && !esCancelada;

                                    let rowClass = 'transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ';
                                    if (esCancelada) rowClass += 'bg-red-50/10 dark:bg-red-900/10 opacity-70';
                                    else if (esPasada) rowClass += 'bg-gray-50/50 dark:bg-gray-900/20 opacity-70';
                                    else rowClass += 'bg-white dark:bg-gray-800';

                                    return (
                                        <tr key={c.id} className={rowClass}>
                                            <td className="px-4 py-3 text-sm font-semibold">
                                                <div className="flex items-center gap-2">
                                                    {esFutura ? (
                                                        <span
                                                            onClick={() => handleFechaClick(c)}
                                                            className="cursor-pointer text-blue-600 dark:text-blue-400 flex items-center gap-2 group"
                                                            title="Clic para editar esta cita"
                                                        >
                                                            {formatDate(c.fecha)}
                                                            <span className="text-[9px] font-bold bg-blue-600/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-md uppercase tracking-wide flex items-center gap-1 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                                próxima ✎
                                                            </span>
                                                        </span>
                                                    ) : esCancelada ? (
                                                        <span className="text-red-500 dark:text-red-400">{formatDate(c.fecha)}</span>
                                                    ) : (
                                                        <span className="text-gray-600 dark:text-gray-400">{formatDate(c.fecha)}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className={`px-4 py-3 text-sm ${esCancelada ? 'text-red-500' : esPasada ? 'text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {c.hora?.substring(0, 5)}
                                                {c.duracion ? <span className="opacity-70"> - {addMinutes(c.hora, c.duracion)}</span> : null}
                                            </td>
                                            <td className={`px-4 py-3 text-sm font-medium ${esCancelada ? 'text-red-500' : esPasada ? 'text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                                                {c.doctor ? formatFullName(c.doctor) : '—'}
                                            </td>
                                            <td className={`px-4 py-3 text-sm uppercase ${esCancelada ? 'text-red-500/80' : esPasada ? 'text-gray-500/80' : 'text-gray-600 dark:text-gray-400'}`}>
                                                {c.tratamiento || '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${estadoColor(c.estado)}`}>
                                                    {c.estado}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {sorted.length > itemsPerPage && (
                        <div className="mt-4">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={Math.ceil(sorted.length / itemsPerPage)}
                                onPageChange={(page) => setCurrentPage(page)}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Link to full agenda */}
            <div className="mt-4 flex justify-end">
                <span
                    onClick={() => navigate('/agenda')}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                    Ir a la Agenda completa <ChevronRight size={14} />
                </span>
            </div>

            {/* AgendaForm modal */}
            {modalOpen && (
                <AgendaForm
                    isOpen={modalOpen}
                    onClose={() => { setModalOpen(false); setSelectedCita(null); }}
                    onSave={() => {
                        setModalOpen(false);
                        setSelectedCita(null);
                        setLoading(true);
                        fetchCitas();
                    }}
                    initialData={selectedCita}
                    defaultDate={selectedCita ? selectedCita.fecha : getLocalDateString()}
                    defaultTime={selectedCita ? selectedCita.hora : '08:00'}
                    defaultConsultorio={selectedCita ? selectedCita.consultorio : 1}
                    defaultPacienteId={Number(id)}
                />
            )}

            <ManualModal 
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Historial de Citas"
                sections={manualSections}
            />
        </div>
    );
};

export default PacienteTabCitas;
