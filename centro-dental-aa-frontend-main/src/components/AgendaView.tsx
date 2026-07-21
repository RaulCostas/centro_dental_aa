import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './AgendaView.css'; // Import custom overrides
import api from '../services/api';
import type { Agenda, Paciente } from '../types';
import AgendaForm from './AgendaForm';
import Swal from 'sweetalert2';
import ManualModal, { type ManualSection } from './ManualModal';
import QuienAgendoModal from './QuienAgendoModal';

import { getLocalDateString, formatDate } from '../utils/dateUtils';
import { formatFullName } from '../utils/formatters';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];


import { Calendar as CalendarIcon, X as CloseIcon } from 'lucide-react';

const getStatusColor = (estado: string) => {
    switch (estado) {
        case 'agendado': return '#3498db'; // Blue
        case 'confirmado': return '#2ecc71'; // Green
        case 'cancelado': return '#e74c3c'; // Red
        case 'atendido': return '#95a5a6'; // Gray
        case 'no asistio': return '#e67e22'; // Orange
        default: return '#f1c40f'; // Yellow
    }
};

const AgendaView: React.FC = () => {
    const navigate = useNavigate();
    

    // Removed local activeClinicId state to use globalClinicaId from context directly
    // const [activeClinicId, setActiveClinicId] = useState<number | null>(null);

    const [currentDate, setCurrentDate] = useState(getLocalDateString());
    const [dateValue, setDateValue] = useState<Value>(new Date());
    const [appointments, setAppointments] = useState<Agenda[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ time: string, consultorio: number } | null>(null);
    const [editingAppointment, setEditingAppointment] = useState<Agenda | null>(null);
    const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
    const [monthAppointments, setMonthAppointments] = useState<Agenda[]>([]);


    // Patient Search State
    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredPacientes, setFilteredPacientes] = useState<Paciente[]>([]);
    const [showPatientResults, setShowPatientResults] = useState(false);
    const [patientHistory, setPatientHistory] = useState<Agenda[]>([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedPatientForHistory, setSelectedPatientForHistory] = useState<Paciente | null>(null);

    const [showManual, setShowManual] = useState(false);
    const [showQuienAgendoModal, setShowQuienAgendoModal] = useState(false);
    const [showMobileCalendar, setShowMobileCalendar] = useState(false);



    const manualSections: ManualSection[] = [
        {
            title: 'Modalidad Global',
            content: 'El sistema opera ahora en modalidad única (Global). No se requiere selección de clínica.'
        },
        {
            title: 'Navegación',
            content: 'Utilice los botones "<<" y ">>" para moverse entre días, o "Hoy" para volver a la fecha actual. También puede seleccionar una fecha específica en el calendario lateral.'
        },
        {
            title: 'Agendar Cita',
            content: 'Haga clic en cualquier espacio vacío de la grilla para programar una nueva cita en ese horario y consultorio. Complete el formulario con los datos del paciente.'
        },
        {
            title: 'Gestión de Citas',
            content: 'Haga clic en una cita existente (celdas coloreadas) para ver detalles, editarla o cambiar su estado. Los colores indican: Azul (Agendado), Verde (Confirmado), Rojo (Cancelado), Gris (Atendido).'
        },
        {
            title: 'Búsqueda de Pacientes',
            content: 'Utilice el buscador en la barra lateral izquierda para encontrar pacientes y ver su historial completo de citas.'
        }
    ];

    // Sync with global clinic selection is now handled directly by using globalClinicaId


    const timeSlots: string[] = [];
    let startHour = 8;
    let startMinute = 30;
    while (startHour < 20 || (startHour === 20 && startMinute <= 30)) {
        const hourStr = startHour.toString().padStart(2, '0');
        const minStr = startMinute.toString().padStart(2, '0');
        timeSlots.push(`${hourStr}:${minStr}`);

        startMinute += 30;
        if (startMinute === 60) {
            startMinute = 0;
            startHour++;
        }
    }

    useEffect(() => {
        if (viewMode === 'day') {
            fetchAppointments();
        } else {
            fetchMonthAppointments();
        }
        // Removed fetchPatients() to save egress
    }, [currentDate, viewMode]);

    // Sync dateValue when currentDate changes (e.g. via prev/next buttons)
    useEffect(() => {
        const [year, month, day] = currentDate.split('-').map(Number);
        setDateValue(new Date(year, month - 1, day));
    }, [currentDate]);

    // Patient Search Logic
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        if (debouncedSearchTerm.trim() === '') {
            setFilteredPacientes([]);
            setShowPatientResults(false);
            return;
        }

        const searchPatients = async () => {
            try {
                const response = await api.get(`/pacientes?search=${debouncedSearchTerm}&limit=10`);
                setFilteredPacientes(response.data.data || []);
                setShowPatientResults(true);
            } catch (error) {
                console.error('Error searching patients:', error);
            }
        };

        searchPatients();
    }, [debouncedSearchTerm]);

    const handlePatientSelect = async (patient: Paciente) => {
        setSearchTerm(formatFullName(patient));
        setShowPatientResults(false);
        setSelectedPatientForHistory(patient);

        try {
            const response = await api.get(`/agenda/paciente/${patient.id}`);
            setPatientHistory(response.data);
            setShowHistoryModal(true);
        } catch (error) {
            console.error('Error fetching patient history:', error);
            Swal.fire('Error', 'No se pudo obtener el historial del paciente', 'error');
        }
    };

    const fetchAppointments = async () => {
        try {
            let url = `/agenda?date=${currentDate}`;
            const response = await api.get(url);
            setAppointments(response.data || []);
        } catch (error) {
            console.error('Error fetching appointments:', error);
        }
    };


    const handleEnviarRecordatorioIndividual = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent opening the edit modal

        try {
            const result = await Swal.fire({
                title: '¿Enviar recordatorio?',
                text: 'Se enviará un recordatorio de cita individual a través de WhatsApp.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, enviar',
                cancelButtonText: 'Cancelar'
            });

            if (!result.isConfirmed) return;

            Swal.fire({
                title: 'Enviando recordatorio...',
                text: 'Por favor, espere un momento.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                },
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });

            const response = await api.post(`/agenda/${id}/recordatorio`);

            if (response.data.success) {
                Swal.fire({
                    title: '¡Enviado!',
                    text: response.data.message || 'El recordatorio se envió con éxito.',
                    icon: 'success',
                    showConfirmButton: false,
                    timer: 2000,
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });
                fetchAppointments(); // Refresh grid
            } else {
                Swal.fire('Error', response.data.message || 'No se pudo enviar el recordatorio', 'error');
            }
        } catch (error: any) {
            console.error('Error sending individual reminder:', error);
            Swal.fire('Error', error.response?.data?.message || 'Error al conectar con el servidor', 'error');
        }
    };

    const fetchMonthAppointments = async () => {
        try {
            const date = new Date(currentDate + 'T00:00:00');
            const year = date.getFullYear();
            const month = date.getMonth();
            
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            
            const fechaInicio = firstDay.toISOString().split('T')[0];
            const fechaFinal = lastDay.toISOString().split('T')[0];
            
            const response = await api.get(`/agenda?fechaInicio=${fechaInicio}&fechaFinal=${fechaFinal}`);
            setMonthAppointments(response.data || []);
        } catch (error) {
            console.error('Error fetching month appointments:', error);
        }
    };

    const handlePrevDay = () => {
        const date = new Date(currentDate + 'T00:00:00');
        if (viewMode === 'day') {
            date.setDate(date.getDate() - 1);
        } else {
            date.setMonth(date.getMonth() - 1);
            date.setDate(1); // Set to 1st to avoid overflow issues
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        setCurrentDate(`${year}-${month}-${day}`);
    };

    const handleNextDay = () => {
        const date = new Date(currentDate + 'T00:00:00');
        if (viewMode === 'day') {
            date.setDate(date.getDate() + 1);
        } else {
            date.setMonth(date.getMonth() + 1);
            date.setDate(1);
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        setCurrentDate(`${year}-${month}-${day}`);
    };

    const handleToday = () => {
        setCurrentDate(getLocalDateString());
    };

    const handleCalendarChange = (value: Value) => {
        if (value instanceof Date) {
            // Adjust for timezone offset to prevent day shift
            const year = value.getFullYear();
            const month = String(value.getMonth() + 1).padStart(2, '0');
            const day = String(value.getDate()).padStart(2, '0');
            setCurrentDate(`${year}-${month}-${day}`);
            setShowMobileCalendar(false);
        }
    };

    const handleCellClick = (time: string, consultorio: number) => {
        const existing = getAppointmentForSlot(time, consultorio);
        if (existing) {
            setEditingAppointment(existing);
        } else {
            setEditingAppointment(null);
            setSelectedSlot({ time, consultorio });
        }
        setIsFormOpen(true);
    };

    const handleFormClose = () => {
        setIsFormOpen(false);
        setSelectedSlot(null);
        setEditingAppointment(null);
    };

    const handleStatusChange = async (appointmentId: number, nuevoEstado: string, e: React.MouseEvent | React.ChangeEvent) => {
        e.stopPropagation(); // Prevent opening the edit modal

        try {
            // Special case for cancelled status
            let motivoCancelacion = '';
            if (nuevoEstado === 'cancelado') {
                const { value: text, isConfirmed } = await Swal.fire({
                    title: 'Motivo de Cancelación',
                    input: 'textarea',
                    inputPlaceholder: 'Ingrese el motivo...',
                    showCancelButton: true,
                    confirmButtonText: 'Confirmar Cancelación',
                    cancelButtonText: 'Volver',
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });

                if (!isConfirmed) {
                    fetchAppointments(); // Reset select if cancelled
                    return;
                }
                motivoCancelacion = text || 'Sin motivo especificado';
            }

            const payload: any = { estado: nuevoEstado };
            if (nuevoEstado === 'cancelado') {
                payload.motivoCancelacion = motivoCancelacion;
            }

            await api.patch(`/agenda/${appointmentId}`, payload);
            
            Swal.fire({
                icon: 'success',
                title: 'Estado actualizado',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });

            fetchAppointments();
        } catch (error: any) {
            console.error('Error updating status:', error);
            Swal.fire('Error', 'No se pudo actualizar el estado', 'error');
            fetchAppointments();
        }
    };

    const handleFormSave = () => {
        fetchAppointments();
        handleFormClose();
    };

    // Removed handleClinicTabClick as it is no longer used

    const getAppointmentForSlot = (time: string, consultorio: number) => {
        return appointments.find(app => {
            const appTime = app.hora.substring(0, 5);
            // Exclude cancelled appointments from blocking the slot, but show "no asistio"
            return appTime === time && app.consultorio === consultorio && app.estado !== 'cancelado';
        });
    };



    // Calculate which cells to skip rendering because they are covered by a rowspan
    const skipCells = new Set<string>();
    appointments.forEach(app => {
        // Skip cancelled appointments - they don't block time slots. Show "no asistio"
        if (app.estado === 'cancelado') return;

        const duration = app.duracion || 30;
        const rowSpan = Math.ceil(duration / 30);
        if (rowSpan > 1) {
            const appTime = app.hora.substring(0, 5);
            const startIndex = timeSlots.indexOf(appTime);
            if (startIndex !== -1) {
                for (let i = 1; i < rowSpan; i++) {
                    if (startIndex + i < timeSlots.length) {
                        const nextTime = timeSlots[startIndex + i];
                        skipCells.add(`${nextTime}-${app.consultorio}`);
                    }
                }
            }
        }
    });

    const renderMonthView = () => {
        const date = new Date(currentDate + 'T00:00:00');
        const year = date.getFullYear();
        const month = date.getMonth();
        
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        
        // Day of week for the 1st (0=Sun, 1=Mon, ..., 6=Sat)
        // We want Monday (1) as the first column. 
        // If 1st is Sun(0), we want it in 7th pos.
        let firstDayWeekday = firstDayOfMonth.getDay();
        if (firstDayWeekday === 0) firstDayWeekday = 7; // Sunday to 7
        
        const daysInMonth = lastDayOfMonth.getDate();
        const days = [];
        
        // Leading days from prev month
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = firstDayWeekday - 1; i > 0; i--) {
            days.push({ day: prevMonthLastDay - i + 1, currentMonth: false, date: null });
        }
        
        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dayAppointments = monthAppointments.filter(app => app.fecha === dateStr && app.estado !== 'cancelado');
            days.push({ day: i, currentMonth: true, date: dateStr, appointments: dayAppointments });
        }
        
        // Trailing days from next month
        const remainingCells = 42 - days.length; // 6 rows * 7 columns
        for (let i = 1; i <= remainingCells; i++) {
            days.push({ day: i, currentMonth: false, date: null });
        }

        const weekdayNames = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];

        return (
            <div className="flex-1 flex flex-col min-w-0">
                <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                    {weekdayNames.map(name => (
                        <div key={name} className="py-2 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                            {name}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 flex-1 overflow-y-auto">
                    {days.map((dayObj, index) => {
                        const isToday = dayObj.date === getLocalDateString();
                        return (
                            <div 
                                key={index} 
                                className={`min-h-[80px] sm:min-h-[120px] p-1 border-b border-r border-gray-200 dark:border-gray-700 transition-colors ${dayObj.currentMonth ? 'bg-white dark:bg-gray-800 hover:bg-blue-50/30 dark:hover:bg-gray-700' : 'bg-gray-50 dark:bg-gray-900/50 text-gray-300 dark:text-gray-600'} ${dayObj.date ? 'cursor-pointer' : ''}`}
                                onClick={() => {
                                    if (dayObj.date) {
                                        setCurrentDate(dayObj.date);
                                        setViewMode('day');
                                    }
                                }}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`text-[10px] sm:text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full transition-all ${isToday ? 'bg-blue-600 text-white shadow-md scale-110' : 'text-gray-500 dark:text-gray-400 group-hover:text-blue-600'}`}>
                                        {dayObj.day}
                                    </span>
                                    {dayObj.appointments && dayObj.appointments.length > 0 && (
                                        <div className="flex gap-1 items-center">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse sm:hidden"></span>
                                            <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-black hidden sm:inline-block shadow-sm">
                                                {dayObj.appointments.length} CITAS
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    {dayObj.appointments?.slice(0, 4).map((app, appIndex) => (
                                        <div 
                                            key={appIndex} 
                                            className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded truncate text-white font-bold shadow-sm"
                                            style={{ backgroundColor: getStatusColor(app.estado) }}
                                        >
                                            {app.hora.substring(0, 5)} {app.paciente ? formatFullName(app.paciente) : (app.tratamiento || 'Bloqueo')}
                                        </div>
                                    ))}
                                    {(dayObj.appointments?.length || 0) > 4 && (
                                        <div className="text-[9px] text-gray-500 font-bold ml-1">
                                            + {(dayObj.appointments?.length || 0) - 4} más...
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };


    return (
        <div className="flex flex-col h-[85vh] p-2 md:p-5">
            {/* Main View Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-2 md:mb-6 no-print gap-2 md:gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <h1 className="text-xl sm:text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2 sm:gap-3">
                            <CalendarIcon className="text-blue-600" size={24} />
                            Agenda
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 text-xs sm:text-sm hidden sm:block">Gestión de citas y programación de consultorios</p>
                    </div>
                </div>



                <div className="flex gap-2 flex-wrap justify-center md:justify-end items-center">
                    <button
                        onClick={() => setShowManual(true)}
                        className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors self-center mr-2"
                        title="Ayuda / Manual"
                    >
                        ?
                    </button>



                    <div className="flex bg-gray-100/80 dark:bg-gray-700/80 rounded-lg p-1 shadow-inner border border-gray-200 dark:border-gray-600 backdrop-blur-sm">
                        <button
                            onClick={() => setViewMode('day')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all duration-300 border-none outline-none ${viewMode === 'day' ? 'bg-blue-600 text-white shadow-md transform scale-105' : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                        >
                            Día
                        </button>
                        <button
                            onClick={() => setViewMode('month')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all duration-300 border-none outline-none ${viewMode === 'month' ? 'bg-blue-600 text-white shadow-md transform scale-105' : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                        >
                            Mes
                        </button>
                    </div>
                </div>
            </div>

            {/* Status Legend */}
            <div className="flex flex-wrap gap-4 mb-4 px-2 py-2 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm no-print">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2 flex items-center">Estados:</span>
                {[
                    { label: 'Agendado', color: '#3498db' },
                    { label: 'Confirmado', color: '#2ecc71' },
                    { label: 'Atendido', color: '#95a5a6' },
                    { label: 'No Asistió', color: '#e67e22' },
                    { label: 'Cancelado', color: '#e74c3c' }
                ].map(s => (
                    <div key={s.label} className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: s.color }}></div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase">{s.label}</span>
                    </div>
                ))}
            </div>

            <div className="flex flex-col md:flex-row-reverse gap-5 flex-1 overflow-hidden">

                {/* Sidebar Calendar - Hidden on mobile */}
                <div className="hidden md:flex w-[300px] flex-shrink-0 flex-col gap-5">

                    {/* Patient Search Widget */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm relative border border-gray-100 dark:border-gray-700">
                        <h3 className="m-0 mb-2.5 text-base font-bold text-gray-800 dark:text-gray-200">Buscar Paciente</h3>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Nombre, Apellido o CI..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        {showPatientResults && filteredPacientes.length > 0 && (
                            <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-b-lg shadow-lg z-[9999] max-h-[200px] overflow-y-auto">
                                {filteredPacientes.map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => handlePatientSelect(p)}
                                        className="p-3 cursor-pointer border-b border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-sm text-gray-800 dark:text-gray-200"
                                    >
                                        <strong>{formatFullName(p)}</strong>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-2.5 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 calendar-wrapper">
                        <Calendar
                            onChange={handleCalendarChange}
                            value={dateValue}
                            locale="es-ES"
                            className="dark:bg-gray-800 dark:text-white dark:border-gray-700 w-full"
                            tileClassName={({ date, view }) => view === 'month' && date.toDateString() === new Date().toDateString() ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full' : 'hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full'}
                        />
                    </div>
                </div>

                {/* Main Agenda Grid */}
                <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden min-w-0">

                    {/* Clinic Tabs Removed (Option A) */}

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-2 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-10 gap-2">
                        <div className="flex items-center gap-2 sm:gap-4 invisible w-0 h-0 overflow-hidden">
                            {/* Hidden since it's now at the top */}
                            <h2 className="m-0 text-lg sm:text-xl font-bold text-gray-900 dark:text-white">AGENDA</h2>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 no-scrollbar mr-auto">
                            <button
                                onClick={() => setShowQuienAgendoModal(true)}
                                className="flex-shrink-0 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded font-bold transition-all text-xs sm:text-sm shadow-md"
                                title="Buscar quién agendó"
                            >
                                Quien Agendó
                            </button>
                            <button
                                onClick={() => navigate('/recordatorio')}
                                className="flex-shrink-0 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded font-bold transition-all text-xs sm:text-sm shadow-md"
                                title="Gestionar recordatorios"
                            >
                                Recordatorio
                            </button>
                            <button
                                onClick={() => navigate('/contactos')}
                                className="flex-shrink-0 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded font-bold transition-all text-xs sm:text-sm shadow-md"
                                title="Ver Contactos"
                            >
                                Contactos
                            </button>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-between sm:justify-end mt-1 sm:mt-0">
                            <button
                                onClick={handleToday}
                                className="px-2 sm:px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded font-bold transition-all transform hover:-translate-y-0.5 text-xs sm:text-sm shadow-md"
                                title="Ir a hoy"
                            >
                                Hoy
                            </button>
                            <button
                                onClick={() => setShowMobileCalendar(true)}
                                className="md:hidden px-2 py-1.5 bg-blue-600 text-white rounded font-bold transition-all shadow-md flex items-center justify-center translate-y-[2px]"
                                title="Abrir Calendario"
                            >
                                <CalendarIcon size={16} />
                            </button>
                            <button
                                onClick={handlePrevDay}
                                className="px-2 sm:px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded font-bold transition-all transform hover:-translate-y-0.5 text-xs sm:text-sm shadow-md"
                                title={viewMode === 'day' ? 'Día anterior' : 'Mes anterior'}
                            >
                                {'<<'}
                            </button>
                            <span className="text-sm sm:text-lg font-bold min-w-[90px] sm:min-w-[120px] text-center text-gray-800 dark:text-white capitalize">
                                {viewMode === 'day' 
                                    ? formatDate(currentDate) 
                                    : new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(currentDate + 'T00:00:00'))}
                            </span>
                            <button
                                onClick={handleNextDay}
                                className="px-2 sm:px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded font-bold transition-all transform hover:-translate-y-0.5 text-xs sm:text-sm shadow-md"
                                title={viewMode === 'day' ? 'Día siguiente' : 'Mes siguiente'}
                            >
                                {'>>'}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-x-auto overflow-y-auto relative bg-white dark:bg-gray-800 flex flex-col">
                        {viewMode === 'day' ? (
                            <table className="min-w-[800px] w-full border-collapse table-fixed">
                                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700 z-10 shadow-sm">
                                    <tr>
                                        <th className="border border-gray-300 dark:border-gray-600 p-2 text-center font-bold text-gray-700 dark:text-gray-200 w-20 text-[10px] sm:text-xs">HORA</th>
                                        {[1, 2, 3, 4].map(num => (
                                            <th key={num} className="border border-gray-300 dark:border-gray-600 p-2 text-center font-bold text-gray-700 dark:text-gray-200 text-[10px] sm:text-xs">
                                                {num === 4 ? 'QUIROFANO' : `CONSULTORIO #${num}`}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {timeSlots.map(time => (
                                        <tr key={time}>
                                            <td className="border border-gray-300 dark:border-gray-600 p-1 text-center bg-gray-50 dark:bg-gray-700 font-bold text-gray-600 dark:text-gray-400 text-[10px] sm:text-xs align-middle">{time}</td>
                                            {[1, 2, 3, 4].map(consultorio => {
                                                const cellKey = `${time}-${consultorio}`;
                                                if (skipCells.has(cellKey)) {
                                                    return null;
                                                }

                                                const appointment = getAppointmentForSlot(time, consultorio);
                                                const rowSpan = appointment ? Math.ceil((appointment.duracion || 30) / 30) : 1;

                                                const bgColor = appointment
                                                    ? getStatusColor(appointment.estado)
                                                    : undefined;

                                                return (
                                                    <td
                                                        key={cellKey}
                                                        rowSpan={rowSpan}
                                                        className={`border border-gray-300 dark:border-gray-600 p-1 align-top cursor-pointer transition-colors hover:bg-blue-50 dark:hover:bg-gray-700 ${!appointment ? 'bg-white dark:bg-gray-800' : ''}`}
                                                        style={{
                                                            backgroundColor: bgColor,
                                                            height: appointment ? 'auto' : '40px'
                                                        }}
                                                        onClick={() => handleCellClick(time, consultorio)}
                                                    >
                                                        {appointment && (
                                                            <div className="h-full flex flex-col justify-center text-[10px] overflow-hidden text-white drop-shadow-md pl-2 pr-1 py-1 rounded-sm relative">
                                                                
                                                                {appointment.paciente && appointment.paciente.clasificacion && (
                                                                    <div className={`absolute top-0 right-0 px-1 py-0.5 rounded-bl-[4px] text-[8px] font-black backdrop-blur-sm z-10 border-l border-b border-white/10 shadow-sm ${appointment.paciente.clasificacion.charAt(0) === 'A' ? 'bg-yellow-500/60 text-yellow-50' :
                                                                        appointment.paciente.clasificacion.charAt(0) === 'B' ? 'bg-slate-500/60 text-slate-50' :
                                                                            'bg-orange-500/60 text-orange-50'
                                                                        }`}>
                                                                        {appointment.paciente.clasificacion}
                                                                    </div>
                                                                )}
                                                                <div className="font-bold truncate pr-6 ml-1">
                                                                    {appointment.paciente ? (
                                                                        <span 
                                                                            className="hover:underline cursor-pointer transition-all hover:text-white/80"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const id = appointment.pacienteId;
                                                                                // Navigate to the patient's profile
                                                                                navigate(`/pacientes/${id}/ficha`);
                                                                            }}
                                                                        >
                                                                            {formatFullName(appointment.paciente)}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="italic">
                                                                            {appointment.tratamiento || 'Bloqueo'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="truncate opacity-90">{appointment.doctor ? `Dr. ${formatFullName(appointment.doctor)}` : ''}</div>
                                                                {appointment.paciente && appointment.tratamiento && (
                                                                    <div className="text-[9px] italic mt-0.5 truncate opacity-80 decoration-white/30 decoration-1">
                                                                        {appointment.tratamiento}
                                                                    </div>
                                                                )}
                                                                <div className="text-[9px] mt-0.5 font-bold uppercase opacity-80 flex items-center gap-1">
                                                                    <select
                                                                        value={appointment.estado}
                                                                        className="bg-black/20 hover:bg-black/30 text-white border-none rounded px-1 py-0.5 cursor-pointer focus:ring-1 focus:ring-white/50 text-[9px] font-bold outline-none appearance-none"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        onChange={(e) => handleStatusChange(appointment.id, e.target.value, e)}
                                                                    >
                                                                        <option value="agendado" className="bg-blue-600">AGENDADO</option>
                                                                        <option value="confirmado" className="bg-green-600">CONFIRMADO</option>
                                                                        <option value="atendido" className="bg-gray-600">ATENDIDO</option>
                                                                        <option value="no asistio" className="bg-orange-600">NO ASISTIÓ</option>
                                                                        <option value="cancelado" className="bg-red-600">CANCELADO</option>
                                                                    </select>
                                                                    {(appointment.paciente || appointment.pacienteSeguro) && appointment.estado === 'agendado' && (
                                                                        <button
                                                                            onClick={(e) => handleEnviarRecordatorioIndividual(appointment.id, e)}
                                                                            className="ml-1 flex-shrink-0 bg-green-500 hover:bg-green-600 text-white p-1 rounded-full transition-all shadow-sm flex items-center justify-center"
                                                                            title="Enviar recordatorio por WhatsApp"
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                                            </svg>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : renderMonthView()}
                    </div>
                </div>
            </div>
                {isFormOpen && (
                    <AgendaForm
                        isOpen={isFormOpen}
                        onClose={handleFormClose}
                        onSave={handleFormSave}
                        initialData={editingAppointment}
                        defaultDate={currentDate}
                        defaultTime={selectedSlot?.time}
                        defaultConsultorio={selectedSlot?.consultorio}
                        existingAppointments={appointments}
                    />
                )}

                {/* History Modal */}
                {showHistoryModal && selectedPatientForHistory && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
                        <div className="bg-white dark:bg-gray-800 w-[90%] max-w-4xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
                            <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white m-0">📅 Historial de Citas: {formatFullName(selectedPatientForHistory)}</h2>
                            </div>
                            <div className="p-0 overflow-y-auto flex-1 dark:bg-gray-800">
                                {patientHistory.length === 0 ? (
                                    <p className="text-center text-gray-500 dark:text-gray-400 p-8">No hay citas registradas para este paciente.</p>
                                ) : (
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                            <tr>
                                                <th className="p-3 border-b border-gray-200 dark:border-gray-600 font-semibold text-gray-700 dark:text-white">Fecha</th>
                                                <th className="p-3 border-b border-gray-200 dark:border-gray-600 font-semibold text-gray-700 dark:text-white">Hora</th>
                                                <th className="p-3 border-b border-gray-200 dark:border-gray-600 font-semibold text-gray-700 dark:text-white">Doctor</th>
                                                <th className="p-3 border-b border-gray-200 dark:border-gray-600 font-semibold text-gray-700 dark:text-white">Tratamiento</th>
                                                <th className="p-3 border-b border-gray-200 dark:border-gray-600 font-semibold text-gray-700 dark:text-white">Estado</th>
                                                <th className="p-3 border-b border-gray-200 dark:border-gray-600 font-semibold text-gray-700 dark:text-white">Motivo</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {patientHistory.map((cita) => (
                                                <tr key={cita.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                    <td className="p-3 text-gray-700 dark:text-gray-300">{formatDate(cita.fecha)}</td>
                                                    <td className="p-3 text-gray-700 dark:text-gray-300">{cita.hora ? cita.hora.substring(0, 5) : '-'}</td>
                                                    <td className="p-3 text-gray-700 dark:text-gray-300">{cita.doctor ? `Dr. ${formatFullName(cita.doctor)}` : '-'}</td>
                                                    <td className="p-3 text-gray-700 dark:text-gray-300">{cita.tratamiento || '-'}</td>
                                                    <td className="p-3">
                                                        <span className="px-2 py-1 rounded-full text-xs font-bold text-white shadow-sm" style={{ backgroundColor: getStatusColor(cita.estado) }}>
                                                            {cita.estado.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-gray-700 dark:text-gray-300 text-sm">
                                                        {cita.estado === 'cancelado' && cita.motivoCancelacion ? (
                                                            <span className="italic">{cita.motivoCancelacion}</span>
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-right">
                                <button
                                    onClick={() => setShowHistoryModal(false)}
                                    className="px-5 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-sm font-medium transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <ManualModal
                    isOpen={showManual}
                    onClose={() => setShowManual(false)}
                    title="Manual de Usuario - Agenda"
                    sections={manualSections}
                />

                <QuienAgendoModal
                    isOpen={showQuienAgendoModal}
                    onClose={() => setShowQuienAgendoModal(false)}
                />

                {/* Mobile Calendar Modal */}
                {showMobileCalendar && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in md:hidden">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-[320px] overflow-hidden border border-gray-100 dark:border-gray-700 transform transition-all scale-100">
                            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <CalendarIcon size={18} className="text-blue-500" />
                                    Seleccionar Fecha
                                </h3>
                                <button
                                    onClick={() => setShowMobileCalendar(false)}
                                    className="text-gray-400 hover:text-red-500 transition-colors p-1 bg-transparent border-none flex items-center justify-center"
                                >
                                    <CloseIcon size={24} />
                                </button>
                            </div>
                            <div className="p-2 calendar-wrapper mobile-calendar">
                                <Calendar
                                    onChange={handleCalendarChange}
                                    value={dateValue}
                                    locale="es-ES"
                                    className="dark:bg-gray-800 dark:text-white dark:border-none w-full border-none"
                                />
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 text-center">
                                <button
                                    onClick={() => setShowMobileCalendar(false)}
                                    className="w-full py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <style>{`
                /* Base Calendar Styles */
                .calendar-wrapper .react-calendar { 
                    border: none; 
                    font-family: inherit;
                    width: 100%;
                    background-color: white;
                    color: #1f2937;
                }
                
                .calendar-wrapper .react-calendar__navigation button {
                    min-width: 44px;
                    background: none;
                    color: #1f2937;
                }
                
                .calendar-wrapper .react-calendar__navigation__label {
                    font-weight: bold;
                }
                
                .calendar-wrapper .react-calendar__navigation button:enabled:hover,
                .calendar-wrapper .react-calendar__navigation button:enabled:focus {
                    background-color: #f3f4f6;
                }
                
                /* Light Mode Day Styles */
                .calendar-wrapper .react-calendar__month-view__days__day {
                    color: #374151;
                }
                
                .calendar-wrapper .react-calendar__month-view__days__day--weekend {
                    color: #dc2626;
                }
                
                .calendar-wrapper .react-calendar__month-view__days__day--neighboringMonth {
                    color: #9ca3af;
                }
                
                .calendar-wrapper .react-calendar__tile:enabled:hover,
                .calendar-wrapper .react-calendar__tile:enabled:focus {
                    background-color: #f3f4f6;
                }
                
                .calendar-wrapper .react-calendar__tile--now {
                    background: #fef3c7;
                    color: #92400e;
                    font-weight: bold;
                }
                
                .calendar-wrapper .react-calendar__tile--now:enabled:hover,
                .calendar-wrapper .react-calendar__tile--now:enabled:focus {
                    background: #fde68a;
                }
                
                .calendar-wrapper .react-calendar__tile--active {
                    background: #3b82f6;
                    color: white;
                    font-weight: bold;
                }
                
                .calendar-wrapper .react-calendar__tile--active:enabled:hover,
                .calendar-wrapper .react-calendar__tile--active:enabled:focus {
                    background: #2563eb;
                }
                
                /* Dark Mode Calendar Styles */
                .dark .calendar-wrapper .react-calendar {
                    background-color: #1f2937;
                    color: white;
                }
                
                .dark .calendar-wrapper .react-calendar__navigation button {
                    color: white;
                }
                
                .dark .calendar-wrapper .react-calendar__navigation button:enabled:hover,
                .dark .calendar-wrapper .react-calendar__navigation button:enabled:focus {
                    background-color: #374151;
                }
                
                .dark .calendar-wrapper .react-calendar__month-view__days__day {
                    color: #d1d5db;
                }
                
                .dark .calendar-wrapper .react-calendar__month-view__days__day--weekend {
                    color: #f87171;
                }
                
                .dark .calendar-wrapper .react-calendar__month-view__days__day--neighboringMonth {
                    color: #6b7280;
                }
                
                .dark .calendar-wrapper .react-calendar__tile:enabled:hover,
                .dark .calendar-wrapper .react-calendar__tile:enabled:focus {
                    background-color: #374151;
                }
                
                .dark .calendar-wrapper .react-calendar__tile--now {
                    background: #eab308;
                    color: black;
                    font-weight: bold;
                }
                
                .dark .calendar-wrapper .react-calendar__tile--now:enabled:hover,
                .dark .calendar-wrapper .react-calendar__tile--now:enabled:focus {
                    background: #ca8a04;
                }
                
                .dark .calendar-wrapper .react-calendar__tile--active {
                    background: #2563eb;
                    color: white;
                    font-weight: bold;
                }
                
                .dark .calendar-wrapper .react-calendar__tile--active:enabled:hover,
                .dark .calendar-wrapper .react-calendar__tile--active:enabled:focus {
                    background: #1d4ed8;
                }

                /* Mobile specific style adjustment */
                .mobile-calendar .react-calendar {
                    border: none !important;
                    width: 100% !important;
                }
                
                .animate-fade-in {
                    animation: fadeIn 0.15s ease-out;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }

                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }

                @media (max-height: 600px) and (orientation: landscape) {
                    .flex.flex-col.h-\[85vh\] {
                        height: 92vh !important;
                    }
                    h1.text-xl {
                        font-size: 1.1rem !important;
                        margin-bottom: 0 !important;
                    }
                    .mb-2.md\:mb-6 {
                        margin-bottom: 0.25rem !important;
                    }
                    .p-2.sm\:p-4 {
                        padding: 0.25rem 0.5rem !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default AgendaView;
