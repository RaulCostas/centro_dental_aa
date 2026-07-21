import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { formatDate } from '../utils/dateUtils';
import { formatNumber } from '../utils/formatters';
import { X, FileText, Calendar, User, DollarSign, CheckCircle, Clock } from 'lucide-react';
import Swal from 'sweetalert2';
import type { HistoriaClinica } from '../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    id: string; // patientId
    proformaId: string | null;
    onUpdate?: () => void;
}

const PresupuestoViewModal: React.FC<Props> = ({ isOpen, onClose, id, proformaId, onUpdate }) => {
    const [proforma, setProforma] = useState<any>(null);
    const [historiaClinica, setHistoriaClinica] = useState<HistoriaClinica[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && proformaId) {
            fetchData();
        } else {
            setProforma(null);
        }
    }, [isOpen, proformaId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [proformaRes, historiaRes] = await Promise.all([
                api.get(`/proformas/${proformaId}`),
                api.get(`/historia-clinica/paciente/${id}`)
            ]);
            setProforma(proformaRes.data);
            setHistoriaClinica(historiaRes.data || []);
        } catch (error) {
            console.error('Error fetching proforma details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleCurrency = async () => {
        if (!proforma) return;
        const isUSD = proforma.moneda === 'USD';

        if (isUSD) {
            // Revert to Bs
            try {
                await api.patch(`/proformas/${proformaId}`, { moneda: 'Bs', tipoCambio: 1 });
                fetchData();
                if (onUpdate) onUpdate();
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'No se pudo cambiar la moneda', 'error');
            }
        } else {
            // Ask for exchange rate to switch to USD
            Swal.fire({
                title: 'Cambiar a Dólares (USD)',
                text: 'Ingrese el tipo de cambio actual (Ej. 6.96):',
                input: 'number',
                inputAttributes: {
                    min: '1',
                    step: '0.01'
                },
                inputValue: '6.96',
                showCancelButton: true,
                confirmButtonText: 'Cambiar a USD',
                cancelButtonText: 'Cancelar'
            }).then(async (result) => {
                if (result.isConfirmed && result.value) {
                    const tipoCambio = parseFloat(result.value);
                    if (tipoCambio > 0) {
                        try {
                            await api.patch(`/proformas/${proformaId}`, { moneda: 'USD', tipoCambio });
                            fetchData();
                            if (onUpdate) onUpdate();
                        } catch (error) {
                            console.error(error);
                            Swal.fire('Error', 'No se pudo cambiar la moneda', 'error');
                        }
                    }
                }
            });
        }
    };

    const handleTogglePaymentPlan = () => {
        if (!proforma) return;
        
        const isActivo = proforma.plan_pagos?.activo;

        Swal.fire({
            title: isActivo ? 'Editar Plan de Pagos' : 'Configurar Plan de Pagos',
            html: `
                <div class="space-y-4 text-left">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Cuota Inicial (Opcional)</label>
                        <input type="number" id="swal-cuota-inicial" class="swal2-input w-full mx-0 mt-1 !text-lg" placeholder="Ej: 5000" value="${proforma.plan_pagos?.cuotaInicial || ''}" min="0">
                        <div class="text-xs text-gray-500 mt-1">El monto restante se dividirá en cuotas.</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Duración en meses</label>
                        <input type="number" id="swal-meses" class="swal2-input w-full mx-0 mt-1 !text-lg" value="${proforma.plan_pagos?.meses || 6}" min="1" max="60">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Día de pago (del mes)</label>
                        <input type="number" id="swal-dia" class="swal2-input w-full mx-0 mt-1 !text-lg" value="${proforma.plan_pagos?.diaPago || 15}" min="1" max="31">
                    </div>
                    <div class="pt-2 text-xs text-gray-500 dark:text-gray-400">
                        La cuota se calculará dividiendo el total del presupuesto (menos la cuota inicial) entre los meses.
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            showDenyButton: isActivo,
            confirmButtonText: 'Guardar Plan',
            cancelButtonText: 'Cancelar',
            denyButtonText: 'Eliminar Plan',
            preConfirm: () => {
                const cuotaInicial = (document.getElementById('swal-cuota-inicial') as HTMLInputElement).value;
                const meses = (document.getElementById('swal-meses') as HTMLInputElement).value;
                const dia = (document.getElementById('swal-dia') as HTMLInputElement).value;
                if (!meses || Number(meses) < 1) {
                    Swal.showValidationMessage('Ingrese una cantidad válida de meses');
                    return false;
                }
                if (!dia || Number(dia) < 1 || Number(dia) > 31) {
                    Swal.showValidationMessage('El día debe estar entre 1 y 31');
                    return false;
                }
                
                const cuotaInicialNum = cuotaInicial ? Number(cuotaInicial) : undefined;
                
                return { meses: Number(meses), diaPago: Number(dia), cuotaInicial: cuotaInicialNum };
            }
        }).then(async (result) => {
            if (result.isConfirmed && result.value) {
                try {
                    await api.patch(`/proformas/${proformaId}`, { 
                        plan_pagos: { 
                            activo: true, 
                            meses: result.value.meses, 
                            diaPago: result.value.diaPago,
                            cuotaInicial: result.value.cuotaInicial,
                            fechaInicio: proforma.plan_pagos?.fechaInicio || proforma.fecha || new Date().toISOString()
                        } 
                    });
                    fetchData();
                    if (onUpdate) onUpdate();
                    Swal.fire({
                        title: 'Guardado',
                        text: 'Plan de pagos configurado',
                        icon: 'success',
                        showConfirmButton: false,
                        timer: 1500
                    });
                } catch (error) {
                    console.error(error);
                    Swal.fire('Error', 'No se pudo guardar el plan', 'error');
                }
            } else if (result.isDenied) {
                try {
                    await api.patch(`/proformas/${proformaId}`, { 
                        plan_pagos: null
                    });
                    fetchData();
                    if (onUpdate) onUpdate();
                    Swal.fire({
                        title: 'Eliminado',
                        text: 'Plan de pagos eliminado correctamente',
                        icon: 'success',
                        showConfirmButton: false,
                        timer: 1500
                    });
                } catch (error) {
                    console.error(error);
                    Swal.fire('Error', 'No se pudo eliminar el plan', 'error');
                }
            }
        });
    };

    if (!isOpen) return null;

    const isItemCompleted = (item: any) => {
        const matchingHistory = historiaClinica.filter(h => {
            if (h.estadoTratamiento !== 'terminado') return false;
            if (h.proformaDetalleId) {
                return item.id && h.proformaDetalleId === item.id;
            }
            if (proformaId && h.proformaId === Number(proformaId)) {
                return h.tratamiento === item.arancel?.detalle;
            }
            return false;
        });
        const totalCompleted = matchingHistory.reduce((sum, h) => sum + (h.cantidad || 0), 0);
        return totalCompleted >= item.cantidad;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-80 gap-3 bg-white dark:bg-gray-800">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Cargando...</p>
                    </div>
                ) : proforma ? (
                    <>
                        {/* Header - Standard App Style but Orange */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-3">
                                <span className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl text-orange-600 dark:text-orange-400">
                                    <FileText size={20} />
                                </span>
                                <div>
                                    <span className="block leading-none">Plan de Tratamiento #{proforma.numero}</span>
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mt-1 block">
                                        {proforma.paciente ? `${proforma.paciente.paterno} ${proforma.paciente.materno} ${proforma.paciente.nombre}` : ''}
                                    </span>
                                </div>
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleTogglePaymentPlan}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-all transform hover:-translate-y-0.5 active:scale-95 shadow-sm border ${proforma.plan_pagos?.activo ? 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'}`}
                                >
                                    <Calendar size={14} />
                                    {proforma.plan_pagos?.activo ? 'Plan Activo' : 'Crear Plan'}
                                </button>
                                <button
                                    onClick={handleToggleCurrency}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-all transform hover:-translate-y-0.5 active:scale-95 shadow-sm border ${proforma.moneda === 'USD' ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'}`}
                                >
                                    <DollarSign size={14} />
                                    {proforma.moneda === 'USD' ? 'Volver a Bs.' : 'Cambiar a USD'}
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-5 overflow-y-auto custom-scrollbar bg-gray-50/50 dark:bg-gray-900/20">
                            {/* Info Cards - More Compact & Standard */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-xl flex flex-col gap-0.5 shadow-sm">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Plan #</span>
                                    <span className="text-lg font-bold text-gray-800 dark:text-white">{proforma.numero.toString().padStart(2, '0')}</span>
                                </div>
                                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-xl flex flex-col gap-0.5 shadow-sm">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Fecha</span>
                                    <span className="text-sm font-bold text-gray-800 dark:text-white">{formatDate(proforma.fecha)}</span>
                                </div>
                                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-xl flex flex-col gap-0.5 shadow-sm">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Registrado</span>
                                    <span className="text-sm font-bold text-gray-800 dark:text-white truncate">{proforma.usuario?.name?.split(' ')[0] || 'Sistema'}</span>
                                </div>
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 p-3 rounded-xl flex flex-col gap-0.5 shadow-sm">
                                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total</span>
                                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(proforma.total / (proforma.tipoCambio || 1))} <span className="text-[9px]">{proforma.moneda === 'USD' ? '$' : 'Bs.'}</span></span>
                                </div>
                            </div>

                            {/* Section: Tratamientos */}
                            <div className="space-y-3">
                                <h3 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Listado de Tratamientos</h3>
                                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-[9px] font-bold uppercase tracking-wider">
                                                <th className="px-4 py-3">#</th>
                                                <th className="px-4 py-3">Tratamiento</th>
                                                <th className="px-4 py-3">Pieza</th>
                                                <th className="px-4 py-3 text-center">Cant.</th>
                                                <th className="px-4 py-3 text-center">Desc. (%)</th>
                                                <th className="px-4 py-3 text-right">P.U.</th>
                                                <th className="px-4 py-3 text-right">Total</th>
                                                <th className="px-4 py-3 text-center">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {proforma.detalles?.map((item: any, index: number) => {
                                                const completed = isItemCompleted(item);

                                                // Robustly split pieces by slash, comma, space, or hyphen
                                                let completedPieces: string[] = [];
                                                let allPieces: string[] = [];
                                                if (item.piezas) {
                                                    allPieces = item.piezas.split(/[\/\s,\-]+/).filter((p: string) => p.trim() !== '');
                                                    historiaClinica.forEach(h => {
                                                        const isMatchingHistory = 
                                                            (h.proformaDetalleId && h.proformaDetalleId === item.id) ||
                                                            (!h.proformaDetalleId && h.proformaId === Number(proformaId) && h.tratamiento === item.arancel?.detalle);
                                                        
                                                        if (isMatchingHistory && h.estadoTratamiento === 'terminado' && h.pieza) {
                                                            const hPieces = h.pieza.split(/[\/\s,\-]+/).filter((p: string) => p.trim() !== '');
                                                            completedPieces.push(...hPieces);
                                                        }
                                                    });
                                                }

                                                return (
                                                    <tr key={index} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${completed ? 'bg-green-50/70 dark:bg-green-950/20' : ''}`}>
                                                        <td className="px-4 py-3 text-[10px] text-gray-400 font-bold">{index + 1}</td>
                                                        <td className={`px-4 py-3 text-sm font-bold ${completed ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-800 dark:text-white'}`}>
                                                            {item.arancel?.detalle}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                                                            {item.piezas ? (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {allPieces.map((pieza, idx) => {
                                                                        const isPieceDone = completedPieces.includes(pieza);
                                                                        return (
                                                                            <span
                                                                                key={idx}
                                                                                className={`px-2 py-0.5 rounded text-xs font-semibold border ${isPieceDone
                                                                                    ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50'
                                                                                    : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
                                                                                    }`}
                                                                            >
                                                                                {pieza} {isPieceDone && '✓'}
                                                                            </span>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ) : '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 text-center font-bold">{item.cantidad}</td>
                                                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 text-center">{item.descuento || 0}%</td>
                                                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 text-right">{formatNumber(item.precioUnitario / (proforma.tipoCambio || 1))}</td>
                                                        <td className="px-4 py-3 text-xs text-gray-800 dark:text-white text-right font-bold">{formatNumber(item.total / (proforma.tipoCambio || 1))}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            {completed ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[8px] font-bold uppercase tracking-wider border border-green-200 dark:border-green-800/50">
                                                                    <CheckCircle size={8} />
                                                                    Terminado
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[8px] font-bold uppercase tracking-wider border border-gray-200 dark:border-gray-600">
                                                                    <Clock size={8} />
                                                                    Pendiente
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Total Box - Native Style */}
                            <div className="flex flex-col items-end mt-4 gap-2">
                                {proforma.descuento > 0 && (
                                    <>
                                        <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-2 rounded-xl flex items-center justify-between gap-4 w-64 border border-gray-100 dark:border-gray-600">
                                            <span className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[9px]">Subtotal:</span>
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{formatNumber(proforma.sub_total / (proforma.tipoCambio || 1))} <span className="text-[10px]">{proforma.moneda === 'USD' ? '$' : 'Bs.'}</span></span>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-2 rounded-xl flex items-center justify-between gap-4 w-64 border border-gray-100 dark:border-gray-600">
                                            <span className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[9px]">Descuento ({proforma.descuento}%):</span>
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">-{formatNumber(((proforma.sub_total * proforma.descuento) / 100) / (proforma.tipoCambio || 1))} <span className="text-[10px]">{proforma.moneda === 'USD' ? '$' : 'Bs.'}</span></span>
                                        </div>
                                    </>
                                )}
                                <div className="bg-gray-100 dark:bg-gray-700 px-6 py-3 rounded-xl flex items-center justify-between gap-4 w-72 border border-gray-200 dark:border-gray-600">
                                    <span className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[9px]">Total del Plan:</span>
                                    <span className="text-xl font-bold text-gray-800 dark:text-white">{formatNumber(proforma.total / (proforma.tipoCambio || 1))} <span className="text-xs">{proforma.moneda === 'USD' ? '$' : 'Bs.'}</span></span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
                            <button
                                onClick={onClose}
                                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 active:scale-95 text-xs flex items-center gap-2"
                            >
                                <X size={14} />
                                Cerrar
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="p-10 text-center">
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Sin datos disponibles.</p>
                    </div>
                )}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(156, 163, 175, 0.3);
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
};

export default PresupuestoViewModal;
