import React from 'react';
import { formatDate } from '../utils/dateUtils';
import { formatFullName } from '../utils/formatters';
import { X, ClipboardList, User, Activity, FileText, Calendar } from 'lucide-react';
import type { HistoriaClinica, Paciente, Proforma } from '../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    historia: HistoriaClinica[];
    paciente: Paciente | null;
    selectedProformaId?: number | null;
    proformas?: Proforma[];
}

const SeguimientoViewModal: React.FC<Props> = ({ 
    isOpen, 
    onClose, 
    historia, 
    paciente, 
    selectedProformaId, 
    proformas = []
}) => {
    if (!isOpen) return null;

    // Filter by proforma if provided
    let filteredHistoria = historia;
    if (selectedProformaId) {
        filteredHistoria = historia.filter(h => h.proformaId === selectedProformaId);
    }

    // Sort by date descending
    const sortedHistoria = [...filteredHistoria].sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );

    const getPacienteFullName = () => {
        if (!paciente) return '';
        return `${paciente.nombre} ${paciente.paterno} ${paciente.materno}`.toUpperCase();
    };

    const getPlanNumero = (item: HistoriaClinica) => {
        if (!item.proformaId) return 'N/A';
        const proforma = proformas.find(p => p.id === item.proformaId);
        return proforma?.numero || item.proformaId;
    };

    const getTratamientoDetalle = (item: HistoriaClinica) => {
        if (item.tratamiento) return item.tratamiento;
        if (item.proformaDetalle?.arancel?.detalle) return item.proformaDetalle.arancel.detalle;
        return 'Tratamiento General';
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-[#1a1d29] border border-gray-200 dark:border-white/10 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-transparent">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
                            <ClipboardList size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white leading-tight">Seguimiento Clínico Completo</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-widest mt-1">
                                Cronología completa de tratamientos para <span className="text-blue-600 dark:text-blue-400">{getPacienteFullName()}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-gray-50 dark:bg-transparent">
                    {sortedHistoria.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50">
                            <ClipboardList size={48} className="text-gray-400 mb-4" />
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No hay seguimientos registrados para este plan.</p>
                        </div>
                    ) : (
                        <div className="relative border-l-2 border-gray-200 dark:border-white/5 ml-4 pl-8 space-y-8">
                            {sortedHistoria.map((item, index) => (
                                <div key={item.id || index} className="relative">
                                    {/* Timeline Dot */}
                                    <div className="absolute -left-[41px] top-0 w-5 h-5 bg-blue-500 rounded-full border-4 border-white dark:border-[#1a1d29] shadow-lg shadow-blue-500/20"></div>
                                    
                                    {/* Card */}
                                    <div className="bg-white dark:bg-[#212533] border border-gray-100 dark:border-white/5 rounded-2xl p-6 shadow-md dark:shadow-xl transition-all hover:border-blue-200 dark:hover:border-white/10 group">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                                                <Calendar size={12} />
                                                {formatDate(item.fecha)}
                                            </div>
                                            <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                                item.estadoTratamiento === 'terminado' 
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                            }`}>
                                                {item.estadoTratamiento === 'terminado' ? 'TERMINADO' : 'NO TERMINADO'}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* Left side: Treatment & Diagnosis */}
                                            <div className="space-y-4">
                                                <div>
                                                    <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2">Tratamiento & Diagnóstico</h4>
                                                    <div className="flex items-center gap-3">
                                                        <p className="text-lg font-black text-gray-800 dark:text-white tracking-tight uppercase">{getTratamientoDetalle(item)}</p>
                                                        {item.pieza && (
                                                            <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded-md text-[10px] font-bold">
                                                                PZA: {item.pieza}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="bg-gray-50 dark:bg-[#1a1d29]/50 border border-gray-100 dark:border-white/5 rounded-xl p-4">
                                                    <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Diagnóstico:</span>
                                                    <p className="text-gray-600 dark:text-gray-300 text-sm italic">
                                                        {item.diagnostico || '.'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Right side: Details & Observations */}
                                            <div className="space-y-4">
                                                <div className="flex flex-wrap gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <User size={14} className="text-blue-500 dark:text-blue-400" />
                                                        <span className="text-gray-600 dark:text-gray-400 text-[11px] font-medium">{item.doctor ? formatFullName(item.doctor) : 'Dr. No Asignado'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Activity size={14} className="text-purple-500 dark:text-purple-400" />
                                                        <span className="text-gray-600 dark:text-gray-400 text-[11px] font-medium">{(item.especialidad) ? item.especialidad.especialidad : 'General'}</span>
                                                    </div>
                                                </div>
                                                <div className="bg-gray-50 dark:bg-[#1a1d29]/50 border border-gray-100 dark:border-white/5 rounded-xl p-4">
                                                    <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Descripción del Tratamiento Realizado:</span>
                                                    <p className="text-gray-600 dark:text-gray-300 text-sm italic leading-relaxed">
                                                        {item.observaciones || 'Sin observaciones adicionales.'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Button */}
                <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#1a1d29] flex justify-end">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 px-8 py-2.5 bg-gray-200 dark:bg-[#3f4458] hover:bg-gray-300 dark:hover:bg-[#4b526d] text-gray-700 dark:text-white font-bold uppercase tracking-widest text-[11px] rounded-xl transition-all transform hover:-translate-y-0.5 active:scale-95 shadow-md"
                    >
                        <X size={16} />
                        Cerrar
                    </button>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 10px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 0, 0, 0.2);
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
            `}</style>
        </div>
    );
};

export default SeguimientoViewModal;
