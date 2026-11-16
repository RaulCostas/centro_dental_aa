import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { formatDate } from '../utils/dateUtils';
import { formatNumber, formatCurrency, formatFullName } from '../utils/formatters';
import { X, FileText, Calendar, DollarSign, Printer } from 'lucide-react';
import Swal from 'sweetalert2';
import type { Propuesta, HistoriaClinica } from '../types';
import { openPaymentPlanModal } from '../utils/paymentPlanModal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    id: string; // patientId
    propuestaId: number | null;
    initialLetra?: string;
    onUpdate?: () => void;
    onPrint?: (propuesta: Propuesta, letra: string) => void;
    onConvertToBudget?: (propuestaId: number, letra: string) => void;
}

const PropuestaViewModal: React.FC<Props> = ({
    isOpen,
    onClose,
    id,
    propuestaId,
    initialLetra = 'A',
    onUpdate,
    onPrint,
    onConvertToBudget,
}) => {
    const [propuesta, setPropuesta] = useState<Propuesta | null>(null);
    const [historiaClinica, setHistoriaClinica] = useState<HistoriaClinica[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<string>(initialLetra);

    const availableTabs = ['A', 'B', 'C', 'D', 'E', 'F'];

    useEffect(() => {
        if (isOpen && propuestaId) {
            if (initialLetra) setActiveTab(initialLetra);
            fetchData();
        } else {
            setPropuesta(null);
        }
    }, [isOpen, propuestaId, initialLetra]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [propuestaRes, historiaRes] = await Promise.all([
                api.get(`/propuestas/${propuestaId}`),
                api.get(`/historia-clinica/paciente/${id}`).catch(() => ({ data: [] })),
            ]);
            const data: Propuesta = propuestaRes.data;
            setPropuesta(data);
            setHistoriaClinica(historiaRes.data || []);

            // Pick initialTab that actually has items if possible
            const lettersWithItems = availableTabs.filter(letter =>
                data.detalles?.some((d: any) => d.letra === letter)
            );
            if (lettersWithItems.length > 0 && !lettersWithItems.includes(activeTab)) {
                setActiveTab(lettersWithItems[0]);
            }
        } catch (error) {
            console.error('Error fetching propuesta details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const currentDetalles = propuesta?.detalles?.filter((d: any) => d.letra === activeTab) || [];
    const isUSD = propuesta?.monedas?.[activeTab] === 'USD';
    const tc = isUSD ? Number(propuesta?.tiposCambio?.[activeTab] || 6.96) : 1;
    const currentDiscountPct = propuesta?.descuentos?.[activeTab] ? Number(propuesta.descuentos[activeTab]) : 0;

    const subTotalRaw = currentDetalles.reduce((acc, curr) => acc + Number(curr.total || 0), 0);
    const discountAmountRaw = subTotalRaw * (currentDiscountPct / 100);
    const totalRaw = subTotalRaw - discountAmountRaw;

    const subTotalConverted = subTotalRaw / tc;
    const discountConverted = discountAmountRaw / tc;
    const totalConverted = totalRaw / tc;

    const handleToggleCurrency = async () => {
        if (!propuesta) return;

        if (isUSD) {
            // Revert to Bs
            try {
                const updatedMonedas = { ...(propuesta.monedas || {}), [activeTab]: 'Bs' };
                const updatedTiposCambio = { ...(propuesta.tiposCambio || {}), [activeTab]: 1 };
                await api.patch(`/propuestas/${propuestaId}`, {
                    monedas: updatedMonedas,
                    tiposCambio: updatedTiposCambio,
                });
                fetchData();
                if (onUpdate) onUpdate();
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'No se pudo cambiar la moneda', 'error');
            }
        } else {
            // Switch to USD
            Swal.fire({
                title: `Cambiar Propuesta ${activeTab} a Dólares (USD)`,
                text: 'Ingrese el tipo de cambio actual (Ej. 6.96):',
                input: 'number',
                inputAttributes: {
                    min: '0.01',
                    step: '0.01',
                },
                inputValue: '6.96',
                showCancelButton: true,
                confirmButtonText: 'Cambiar a USD',
                cancelButtonText: 'Cancelar',
            }).then(async (result) => {
                if (result.isConfirmed && result.value) {
                    const tipoCambio = parseFloat(result.value);
                    if (tipoCambio > 0) {
                        try {
                            const updatedMonedas = { ...(propuesta.monedas || {}), [activeTab]: 'USD' };
                            const updatedTiposCambio = { ...(propuesta.tiposCambio || {}), [activeTab]: tipoCambio };
                            await api.patch(`/propuestas/${propuestaId}`, {
                                monedas: updatedMonedas,
                                tiposCambio: updatedTiposCambio,
                            });
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

    const handleTogglePaymentPlan = async () => {
        if (!propuesta) return;

        const currentPlan = propuesta.plan_pagos?.[activeTab] || null;

        const result = await openPaymentPlanModal({
            currentPlan,
            titleSuffix: ` (Propuesta ${activeTab})`,
            descriptionSubject: `de la Propuesta ${activeTab}`,
        });

        if (result.action === 'save') {
            const updatedPlanPagos = { ...(propuesta.plan_pagos || {}), [activeTab]: result.plan };
            try {
                await api.patch(`/propuestas/${propuestaId}`, { plan_pagos: updatedPlanPagos });
                fetchData();
                if (onUpdate) onUpdate();
                Swal.fire({
                    title: 'Guardado',
                    text: `Plan de pagos configurado para Propuesta ${activeTab}`,
                    icon: 'success',
                    showConfirmButton: false,
                    timer: 1500,
                });
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'No se pudo guardar el plan', 'error');
            }
        } else if (result.action === 'delete') {
            const updatedPlanPagos = { ...(propuesta.plan_pagos || {}) };
            delete updatedPlanPagos[activeTab];
            try {
                await api.patch(`/propuestas/${propuestaId}`, { plan_pagos: updatedPlanPagos });
                fetchData();
                if (onUpdate) onUpdate();
                Swal.fire({
                    title: 'Eliminado',
                    text: `El plan de pagos de la Propuesta ${activeTab} fue eliminado`,
                    icon: 'success',
                    showConfirmButton: false,
                    timer: 1500,
                });
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'No se pudo eliminar el plan', 'error');
            }
        }
    };

    const isItemCompleted = (item: any) => {
        const tratName = item.arancel?.detalle || item.tratamiento;
        const matchingHistory = historiaClinica.filter(h => {
            if (h.estadoTratamiento !== 'terminado' && h.estadoTratamiento !== 'realizado') return false;
            if (h.tratamiento && tratName) {
                return h.tratamiento.trim().toLowerCase() === tratName.trim().toLowerCase();
            }
            return false;
        });
        const totalCompleted = matchingHistory.reduce((sum, h) => sum + (h.cantidad || 0), 0);
        return totalCompleted >= (item.cantidad || 1);
    };

    const activePlan = propuesta?.plan_pagos?.[activeTab];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-gray-100 dark:border-gray-700 overflow-hidden transform transition-all">
                {loading ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-500 font-medium text-sm">Cargando detalles de la propuesta...</p>
                    </div>
                ) : propuesta ? (
                    <>
                        {/* Header */}
                        <div className="p-4 px-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-xl border border-purple-100 dark:border-purple-800">
                                    <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        Propuesta #{propuesta.numero}
                                        <span className="text-xs font-normal text-gray-400 dark:text-gray-500">|</span>
                                        <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                                            Opción {activeTab}
                                        </span>
                                    </h2>
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        {propuesta.paciente ? formatFullName(propuesta.paciente) : 'Paciente'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {!activePlan?.activo && (
                                    <button
                                        onClick={handleTogglePaymentPlan}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-all transform hover:-translate-y-0.5 active:scale-95 shadow-sm border bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                                        title={`Crear Plan de Pagos para Propuesta ${activeTab}`}
                                    >
                                        <Calendar size={14} />
                                        Crear Plan de Pagos
                                    </button>
                                )}
                                <button
                                    onClick={handleToggleCurrency}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-all transform hover:-translate-y-0.5 active:scale-95 shadow-sm border ${
                                        isUSD
                                            ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                                            : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                                    }`}
                                    title={isUSD ? `Opción ${activeTab}: Volver a Bolivianos` : `Opción ${activeTab}: Cambiar a Dólares (USD)`}
                                >
                                    <DollarSign size={14} />
                                    {isUSD ? 'Volver a Bs.' : 'Cambiar a USD'}
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    title="Cerrar"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Tabs Bar for Options A..F */}
                        <div className="px-6 pt-3 bg-gray-100/70 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700 flex gap-2 overflow-x-auto">
                            {availableTabs.map((tab) => {
                                const count = propuesta.detalles?.filter((d: any) => d.letra === tab).length || 0;
                                const tabIsUSD = propuesta.monedas?.[tab] === 'USD';
                                const hasPlan = propuesta.plan_pagos?.[tab]?.activo;
                                const isSelected = activeTab === tab;

                                return (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-t border-x ${
                                            isSelected
                                                ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-300 border-gray-200 dark:border-gray-700 shadow-sm -mb-px z-10'
                                                : 'bg-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 border-transparent hover:bg-white/40'
                                        }`}
                                    >
                                        <span>Propuesta {tab}</span>
                                        {count > 0 && (
                                            <span
                                                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                                    isSelected
                                                        ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold'
                                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                                }`}
                                            >
                                                {count}
                                            </span>
                                        )}
                                        {tabIsUSD && (
                                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                                                USD
                                            </span>
                                        )}
                                        {hasPlan && (
                                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                                                Plan
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Content */}
                        <div className="p-5 overflow-y-auto custom-scrollbar bg-gray-50/50 dark:bg-gray-900/20">
                            {/* Info Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-xl flex flex-col gap-0.5 shadow-sm">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Propuesta #</span>
                                    <span className="text-lg font-bold text-gray-800 dark:text-white">
                                        {propuesta.numero.toString().padStart(2, '0')}
                                    </span>
                                </div>
                                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-xl flex flex-col gap-0.5 shadow-sm">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Fecha</span>
                                    <span className="text-sm font-bold text-gray-800 dark:text-white">{formatDate(propuesta.fecha)}</span>
                                </div>
                                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-xl flex flex-col gap-0.5 shadow-sm">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Registrado</span>
                                    <span className="text-sm font-bold text-gray-800 dark:text-white truncate">
                                        {propuesta.usuario?.name?.split(' ')[0] || 'Sistema'}
                                    </span>
                                </div>
                                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-xl flex flex-col gap-0.5 shadow-sm">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Moneda</span>
                                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                        {isUSD ? `USD (TC: ${tc})` : 'Bolivianos (Bs.)'}
                                    </span>
                                </div>
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 p-3 rounded-xl flex flex-col gap-0.5 shadow-sm col-span-2 md:col-span-1">
                                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                        Total {activeTab}
                                    </span>
                                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                        {formatNumber(totalConverted)} <span className="text-[9px]">{isUSD ? '$' : 'Bs.'}</span>
                                    </span>
                                </div>
                            </div>

                            {/* Section: Listado de Tratamientos */}
                            <div className="space-y-3">
                                <h3 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">
                                    Listado de Tratamientos — Opción {activeTab}
                                </h3>
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
                                            {currentDetalles.map((item: any, index: number) => {
                                                const completed = isItemCompleted(item);
                                                const unitPriceConverted = Number(item.precioUnitario || 0) / tc;
                                                const totalItemConverted = Number(item.total || 0) / tc;

                                                return (
                                                    <tr key={item.id || index} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                                                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{index + 1}</td>
                                                        <td className="px-4 py-3">
                                                            <div className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                                                {item.arancel?.detalle || item.tratamiento || '-'}
                                                            </div>
                                                            {item.posible && (
                                                                <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold italic">
                                                                    (Tratamiento Posible)
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                                                {item.piezas || '-'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 text-center font-bold">
                                                            {item.cantidad}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 text-center">
                                                            {item.descuento > 0 ? `${item.descuento}%` : '0.00%'}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 text-right">
                                                            {formatNumber(unitPriceConverted)}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-gray-800 dark:text-white text-right font-bold">
                                                            {formatNumber(totalItemConverted)}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span
                                                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                    completed
                                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                                                }`}
                                                            >
                                                                {completed ? 'REALIZADO' : 'PENDIENTE'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {currentDetalles.length === 0 && (
                                                <tr>
                                                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-xs">
                                                        No hay tratamientos registrados en la Propuesta {activeTab}.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Plan de Pagos Section if Active */}
                            {activePlan?.activo && (() => {
                                const cuotaInicialConverted = Number(activePlan.cuotaInicial || 0) / tc;
                                const meses = Number(activePlan.meses || 1);
                                const dia = Number(activePlan.diaPago || 15);
                                const montoParaCuotas = Math.max(0, totalConverted - cuotaInicialConverted);
                                const cuotaMensual = meses > 0 ? montoParaCuotas / meses : 0;
                                const baseDateStr = (activePlan.fechaInicio || propuesta.fecha || new Date().toISOString()).split('T')[0];
                                const [baseYear, baseMonth, baseDay] = baseDateStr.split('-').map(Number);
                                const fechaInicialDate = new Date(baseYear || new Date().getFullYear(), (baseMonth || 1) - 1, baseDay || 1);

                                const cuotasRows: { detalle: string; monto: number; vencimiento: string }[] = [];
                                if (cuotaInicialConverted > 0) {
                                    cuotasRows.push({
                                        detalle: 'Pago / Cuota Inicial',
                                        monto: cuotaInicialConverted,
                                        vencimiento: fechaInicialDate.toLocaleDateString('es-BO'),
                                    });
                                }
                                for (let i = 1; i <= meses; i++) {
                                    let nextMonth = new Date(fechaInicialDate.getFullYear(), fechaInicialDate.getMonth() + i, dia);
                                    if (nextMonth.getMonth() !== (fechaInicialDate.getMonth() + i) % 12) {
                                        nextMonth = new Date(fechaInicialDate.getFullYear(), fechaInicialDate.getMonth() + i + 1, 0);
                                    }
                                    cuotasRows.push({
                                        detalle: `Cuota ${i}`,
                                        monto: cuotaMensual,
                                        vencimiento: nextMonth.toLocaleDateString('es-BO'),
                                    });
                                }

                                return (
                                    <div className="mt-4 bg-indigo-50/40 dark:bg-indigo-900/10 rounded-xl border border-indigo-200 dark:border-indigo-800/50 p-4 shadow-sm">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 border-b border-indigo-100 dark:border-indigo-800/50 pb-2">
                                            <div className="flex items-center gap-2.5">
                                                <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                                                    <Calendar size={14} className="text-indigo-600 dark:text-indigo-400" />
                                                    Plan de Pagos Configurado — Opción {activeTab}
                                                </h4>
                                                <button
                                                    type="button"
                                                    onClick={handleTogglePaymentPlan}
                                                    className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] shadow-sm transition-all"
                                                >
                                                    Editar
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2 text-[10px] font-semibold">
                                                <span className="px-2 py-0.5 rounded bg-white dark:bg-gray-800 border border-indigo-100 dark:border-indigo-700 text-gray-700 dark:text-gray-200">
                                                    Inicial: <strong className="text-indigo-600 dark:text-indigo-400">{formatCurrency(cuotaInicialConverted, isUSD ? 'USD' : 'Bs')}</strong>
                                                </span>
                                                <span className="px-2 py-0.5 rounded bg-white dark:bg-gray-800 border border-indigo-100 dark:border-indigo-700 text-gray-700 dark:text-gray-200">
                                                    Plazo: <strong className="text-indigo-600 dark:text-indigo-400">{meses} meses</strong> (Día {dia})
                                                </span>
                                                <span className="px-2 py-0.5 rounded bg-white dark:bg-gray-800 border border-indigo-100 dark:border-indigo-700 text-gray-700 dark:text-gray-200">
                                                    Cuota: <strong className="text-indigo-600 dark:text-indigo-400">{formatCurrency(cuotaMensual, isUSD ? 'USD' : 'Bs')}</strong>
                                                </span>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto rounded-lg border border-indigo-100 dark:border-indigo-800/50 bg-white dark:bg-gray-800">
                                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                <thead className="bg-indigo-50/50 dark:bg-gray-700/50">
                                                    <tr>
                                                        <th className="px-3 py-1.5 text-center text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase">Detalle</th>
                                                        <th className="px-3 py-1.5 text-center text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase">Monto</th>
                                                        <th className="px-3 py-1.5 text-center text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase">Vencimiento</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-xs">
                                                    {cuotasRows.map((row, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                                                            <td className="px-3 py-1 text-center font-medium text-gray-800 dark:text-gray-200">{row.detalle}</td>
                                                            <td className="px-3 py-1 text-center font-bold text-indigo-600 dark:text-indigo-400">
                                                                {formatCurrency(row.monto, isUSD ? 'USD' : 'Bs')}
                                                            </td>
                                                            <td className="px-3 py-1 text-center text-gray-600 dark:text-gray-400">{row.vencimiento}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Total Box */}
                            <div className="flex flex-col items-end mt-4 gap-2">
                                {currentDiscountPct > 0 && (
                                    <>
                                        <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-2 rounded-xl flex items-center justify-between gap-4 w-64 border border-gray-100 dark:border-gray-600">
                                            <span className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[9px]">Subtotal:</span>
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                                {formatNumber(subTotalConverted)} <span className="text-[10px]">{isUSD ? '$' : 'Bs.'}</span>
                                            </span>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-2 rounded-xl flex items-center justify-between gap-4 w-64 border border-gray-100 dark:border-gray-600">
                                            <span className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[9px]">
                                                Descuento ({currentDiscountPct}%):
                                            </span>
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                                -{formatNumber(discountConverted)} <span className="text-[10px]">{isUSD ? '$' : 'Bs.'}</span>
                                            </span>
                                        </div>
                                    </>
                                )}
                                <div className="bg-gray-100 dark:bg-gray-700 px-6 py-3 rounded-xl flex items-center justify-between gap-4 w-72 border border-gray-200 dark:border-gray-600">
                                    <span className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[9px]">
                                        Total Opción {activeTab}:
                                    </span>
                                    <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                                        {formatNumber(totalConverted)} <span className="text-xs">{isUSD ? '$' : 'Bs.'}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-wrap justify-between items-center gap-2">
                            <div className="flex gap-2">
                                {onPrint && (
                                    <button
                                        onClick={() => onPrint(propuesta, activeTab)}
                                        className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-xl shadow-md transition-all text-xs flex items-center gap-1.5"
                                        title={`Imprimir Opción ${activeTab}`}
                                    >
                                        <Printer size={14} />
                                        Imprimir Opción {activeTab}
                                    </button>
                                )}
                                {onConvertToBudget && totalRaw > 0 && (
                                    <button
                                        onClick={() => onConvertToBudget(propuesta.id, activeTab)}
                                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-xl shadow-md transition-all text-xs flex items-center gap-1.5"
                                        title={`Pasar Opción ${activeTab} a Plan de Tratamiento`}
                                    >
                                        Pasar a Plan de Tratamiento
                                    </button>
                                )}
                            </div>
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

export default PropuestaViewModal;
