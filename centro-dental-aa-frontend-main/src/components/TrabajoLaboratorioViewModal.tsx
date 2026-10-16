import React, { useEffect, useState } from 'react';
import api from '../services/api';
import type { TrabajoLaboratorio } from '../types';
import { formatDate } from '../utils/dateUtils';
import { formatFullName, formatNumber } from '../utils/formatters';
import { Printer, X, Clock, User, Layers, Image as ImageIcon, FileText, Calendar, Stethoscope, Building2, Tag } from 'lucide-react';
import LabToothArchDiagram from './LabToothArchDiagram';
import { generateOrdenTrabajoHTML } from '../utils/ordenTrabajoHtml';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    trabajoId: number | null;
}

const RESTORATION_TYPES = [
    { key: 'corona', label: '👑 Corona' },
    { key: 'puente', label: '🦷 Puente' },
    { key: 'carilla', label: '✨ Carilla' },
    { key: 'inlay', label: '🧩 Inlay' },
    { key: 'onlay', label: '🧩 Onlay' },
    { key: 'protesis_parcial', label: '🦷 Prótesis Parcial Removible', altKey: 'protesis_removible' },
    { key: 'protesis_total', label: '🦷 Prótesis Total' },
    { key: 'sobredentadura', label: '🦷 Sobredentadura' },
    { key: 'barra_implantes', label: '🦴 Barra sobre Implantes' },
    { key: 'hibrida_fija', label: '🦴 Híbrida Fija' },
    { key: 'provisional', label: '🕒 Provisional' },
    { key: 'ferula', label: '🛡️ Férula' },
    { key: 'guarda_oclusal', label: '🛡️ Guarda Oclusal' },
    { key: 'mock_up', label: '✨ Mock-up' },
    { key: 'encerado_diagnostico', label: '📐 Encerado Diagnóstico' },
    { key: 'guia_quirurgica', label: '🎯 Guía Quirúrgica' },
];

const PRUEBAS_ITEMS = [
    { key: 'cera', label: 'Cera' },
    { key: 'metal', label: 'Metal' },
    { key: 'bizcocho', label: 'Bizcocho' },
    { key: 'oclusion', label: 'Oclusión' },
    { key: 'aprobado', label: 'Aprobado' },
];

const URGENCIA_ITEMS = [
    { key: 'Normal', label: '⚪ Normal', colorClass: 'text-gray-700 dark:text-gray-300' },
    { key: 'Prioritario', label: '🟡 Prioritario', colorClass: 'text-yellow-600 dark:text-yellow-400 font-bold' },
    { key: 'Urgente 24 h', label: '🟠 Urgente 24 h', colorClass: 'text-orange-600 dark:text-orange-400 font-bold' },
    { key: 'Express', label: '🔴 Express', colorClass: 'text-red-600 dark:text-red-400 font-black' },
];

const TrabajoLaboratorioViewModal: React.FC<Props> = ({ isOpen, onClose, trabajoId }) => {
    const [trabajo, setTrabajo] = useState<TrabajoLaboratorio | null>(null);
    const [centroDental, setCentroDental] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && trabajoId) {
            fetchData(trabajoId);
        } else {
            setTrabajo(null);
            setCentroDental(null);
        }
    }, [isOpen, trabajoId]);

    const fetchData = async (id: number) => {
        try {
            setLoading(true);
            const [workRes, centroRes] = await Promise.all([
                api.get<TrabajoLaboratorio>(`/trabajos-laboratorios/${id}`).catch(() => ({ data: null })),
                api.get('/datos-centro-dental').catch(() => ({ data: [] }))
            ]);
            setTrabajo(workRes.data || null);
            
            const centroList = Array.isArray(centroRes.data) ? centroRes.data : (centroRes.data?.data || []);
            setCentroDental(centroList[0] || null);
        } catch (error) {
            console.error('Error fetching details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const getImageUrl = (filename: string) => {
        if (!filename) return '';
        if (filename.startsWith('http')) return filename;
        const baseUrl = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : '';
        return `${baseUrl}/uploads/${filename}`;
    };

    let d: any = {};
    if (trabajo?.detalles_orden) {
        if (typeof trabajo.detalles_orden === 'string') {
            try {
                d = JSON.parse(trabajo.detalles_orden);
            } catch (e) {
                d = {};
            }
        } else if (typeof trabajo.detalles_orden === 'object') {
            d = trabajo.detalles_orden;
        }
    }

    let photos: string[] = [];
    if (Array.isArray(trabajo?.fotografias_referencias)) {
        photos = trabajo.fotografias_referencias;
    } else if (typeof trabajo?.fotografias_referencias === 'string') {
        try {
            const parsed = JSON.parse(trabajo.fotografias_referencias);
            if (Array.isArray(parsed)) photos = parsed;
        } catch (e) {}
    }

    const selectedTeeth = trabajo?.pieza ? String(trabajo.pieza).split(',').map(s => s.trim()).filter(Boolean) : [];
    const tipoRest = d?.tipo_restauracion || {};
    const digital = d?.digital || {};
    const implantologia = d?.implantologia || {};
    const pruebas = d?.pruebas || {};
    const urgenciaVal = d?.urgencia || 'Normal';

    const handlePrint = () => {
        if (!trabajo) return;

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const html = generateOrdenTrabajoHTML(trabajo, centroDental);
        const doc = iframe.contentWindow?.document;
        if (!doc) return;

        doc.open();
        doc.write(html);
        doc.close();

        setTimeout(() => {
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
                }, 1000);
            }
        }, 800);
    };

    return (
        <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} aria-hidden="true"></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full border border-gray-200 dark:border-gray-700">
                    
                    {/* Header estilo Orden de Trabajo */}
                    <div className="bg-white dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-blue-600 dark:bg-blue-700 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">
                                A&A
                            </div>
                            <div>
                                <h3 className="text-lg sm:text-xl font-black uppercase text-blue-900 dark:text-blue-200 tracking-tight">
                                    DETALLE DE ORDEN DE TRABAJO DENTAL
                                </h3>
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                                    REHABILITACIÓN ORAL - IMPLANTOLOGÍA - ODONTOLOGÍA DIGITAL
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="bg-blue-50 dark:bg-blue-950/60 border-2 border-blue-600 dark:border-blue-500 px-5 py-1.5 rounded-xl text-center shadow-sm">
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 block">N° ORDEN</span>
                                <span className="text-base font-black text-blue-950 dark:text-white">
                                    A&A-{trabajo ? String(trabajo.id).padStart(7, '0') : String(trabajoId || 0).padStart(7, '0')}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 p-2 rounded-full transition-colors"
                                title="Cerrar"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="p-6 max-h-[80vh] overflow-y-auto space-y-6">
                        {loading ? (
                            <div className="flex justify-center py-16">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
                            </div>
                        ) : trabajo ? (
                            <>
                                {/* 1. DATOS GENERALES */}
                                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <h3 className="text-sm font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-4 flex items-center gap-2 border-b pb-2 border-gray-100 dark:border-gray-700">
                                        <User className="w-5 h-5 text-blue-600" />
                                        1. DATOS GENERALES
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                        {/* Fecha de Registro */}
                                        <div>
                                            <span className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">Fecha de Registro:</span>
                                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 font-bold text-gray-800 dark:text-white">
                                                <Calendar className="w-4 h-4 text-blue-600" />
                                                <span>{formatDate(trabajo.fecha)}</span>
                                            </div>
                                        </div>

                                        {/* Hora */}
                                        <div>
                                            <span className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">Hora:</span>
                                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 font-bold text-gray-800 dark:text-white">
                                                <Clock className="w-4 h-4 text-blue-600" />
                                                <span>{trabajo.hora || '-'}</span>
                                            </div>
                                        </div>

                                        {/* Doctor Tratante */}
                                        <div>
                                            <span className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">Doctor Tratante:</span>
                                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 font-bold text-gray-800 dark:text-white">
                                                <Stethoscope className="w-4 h-4 text-blue-600" />
                                                <span>Dr. {formatFullName(trabajo.doctor)}</span>
                                            </div>
                                        </div>

                                        {/* Paciente */}
                                        <div className="md:col-span-2">
                                            <span className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">Paciente:</span>
                                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 font-bold text-gray-800 dark:text-white">
                                                <User className="w-4 h-4 text-blue-600" />
                                                <span>{formatFullName(trabajo.paciente)}</span>
                                            </div>
                                        </div>

                                        {/* Laboratorio Dental */}
                                        <div>
                                            <span className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">Laboratorio Dental:</span>
                                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 font-bold text-gray-800 dark:text-white">
                                                <Building2 className="w-4 h-4 text-blue-600" />
                                                <span>{trabajo.laboratorio?.laboratorio || '-'}</span>
                                            </div>
                                        </div>

                                        {/* Trabajo de Laboratorio */}
                                        <div className="md:col-span-2">
                                            <span className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">Trabajo de Laboratorio:</span>
                                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 font-bold text-gray-800 dark:text-white">
                                                <Tag className="w-4 h-4 text-blue-600" />
                                                <span>{trabajo.precioLaboratorio?.detalle || '-'}</span>
                                            </div>
                                        </div>

                                        {/* Cantidad y Total Bs */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-1/2">
                                                <span className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">Cantidad:</span>
                                                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 font-bold text-center text-gray-800 dark:text-white">
                                                    {trabajo.cantidad || 1}
                                                </div>
                                            </div>
                                            <div className="w-1/2">
                                                <span className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">Total Bs:</span>
                                                <div className="p-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-200 font-black text-center">
                                                    Bs. {formatNumber(trabajo.total || 0)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* GRID 2 COLUMNAS: 2. TIPO DE RESTAURACIÓN + 3. DIENTES INVOLUCRADOS & PREPARACIÓN */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                    {/* 2. TIPO DE RESTAURACIÓN */}
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                                        <div>
                                            <h3 className="text-sm font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2 border-b pb-2 border-gray-100 dark:border-gray-700">
                                                <Layers className="w-5 h-5 text-blue-600" />
                                                2. TIPO DE RESTAURACIÓN
                                            </h3>

                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                {RESTORATION_TYPES.map(item => {
                                                    const isChecked = Boolean(tipoRest[item.key] || (item.altKey && tipoRest[item.altKey]));
                                                    return (
                                                        <div
                                                            key={item.key}
                                                            className={`flex items-center gap-2 p-1.5 rounded-md border transition-all ${
                                                                isChecked
                                                                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 font-bold shadow-xs'
                                                                    : 'border-transparent text-gray-400 dark:text-gray-500 opacity-60'
                                                            }`}
                                                        >
                                                            <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-black border ${
                                                                isChecked
                                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                                                            }`}>
                                                                {isChecked ? '✓' : ''}
                                                            </span>
                                                            <span className="truncate">{item.label}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 text-xs">
                                            <span className="block font-bold text-gray-700 dark:text-gray-300 mb-0.5">Otro Tipo de Restauración:</span>
                                            <span className="text-gray-800 dark:text-white font-medium">
                                                {tipoRest.otro || 'Ninguno especificado'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 3. DIENTES INVOLUCRADOS & PREPARACIÓN */}
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                                        <div>
                                            <h3 className="text-sm font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-2 border-b pb-2 border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                                <span>3. DIENTES INVOLUCRADOS & PREPARACIÓN</span>
                                                <span className="text-red-600 font-black text-xs bg-red-50 dark:bg-red-950 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-800">
                                                    Piezas: {selectedTeeth.join(', ') || 'Ninguna'}
                                                </span>
                                            </h3>

                                            <div className="transform scale-90 -my-2 flex justify-center pointer-events-none">
                                                <LabToothArchDiagram
                                                    selectedTeeth={selectedTeeth}
                                                    onToothToggle={() => {}}
                                                />
                                            </div>
                                        </div>

                                        {(d?.preparacion || d?.lado) && (
                                            <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-gray-100 dark:border-gray-700">
                                                <div>
                                                    <span className="block font-bold text-gray-500 mb-0.5">Preparación:</span>
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                                                        {typeof d.preparacion === 'string' ? d.preparacion : Object.keys(d.preparacion || {}).filter(k => d.preparacion[k]).join(', ') || 'No especificada'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="block font-bold text-gray-500 mb-0.5">Lado:</span>
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                                                        {typeof d.lado === 'string' ? d.lado : Object.keys(d.lado || {}).filter(k => d.lado[k]).join(', ') || 'Ambos'}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 4. COLOR Y CARACTERIZACIONES */}
                                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700">
                                        4. COLOR Y CARACTERIZACIONES
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                        <div>
                                            <span className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Color Principal:</span>
                                            <div className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-blue-600 dark:text-blue-400 font-bold">
                                                {trabajo.color || 'No especificado'}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Caracterizaciones:</span>
                                            <div className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200 font-medium min-h-[42px] whitespace-pre-line">
                                                {d?.caracterizaciones?.detalle || (typeof d?.caracterizaciones === 'string' ? d.caracterizaciones : '') || 'Sin caracterizaciones especificadas.'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* GRID 2 COLUMNAS: 5. INFORMACIÓN DIGITAL + 6. IMPLANTOLOGÍA */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                    {/* 5. INFORMACIÓN DIGITAL */}
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                        <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700">
                                            5. INFORMACIÓN DIGITAL
                                        </h3>
                                        <div className="space-y-3 text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-black border ${
                                                    digital.escaneo_intraoral
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                                                }`}>
                                                    {digital.escaneo_intraoral ? '✓' : ''}
                                                </span>
                                                <span className="font-bold text-gray-800 dark:text-gray-200">Escaneo Intraoral</span>
                                            </div>
                                            <div>
                                                <span className="block font-bold text-gray-500 mb-0.5">Marca:</span>
                                                <div className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-800 dark:text-white font-medium">
                                                    {digital.marca || 'No especificada'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 6. IMPLANTOLOGÍA */}
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                        <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700">
                                            6. IMPLANTOLOGÍA
                                        </h3>
                                        <div>
                                            <span className="block font-bold text-gray-500 mb-1">Detalle:</span>
                                            <div className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-800 dark:text-white text-xs min-h-[64px] whitespace-pre-line">
                                                {implantologia.detalle || (typeof implantologia === 'string' ? implantologia : '') || 'Sin detalles de implantología.'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* GRID 3 COLUMNAS: 7. PRUEBAS + 8. URGENCIA + FOTOGRAFÍAS / REFERENCIAS */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                                    {/* 7. PRUEBAS */}
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                        <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700">
                                            7. PRUEBAS
                                        </h3>
                                        <div className="grid grid-cols-2 gap-1.5 text-xs mb-3">
                                            {PRUEBAS_ITEMS.map(pru => {
                                                const isChecked = Boolean(pruebas[pru.key]);
                                                return (
                                                    <div key={pru.key} className="flex items-center gap-1.5">
                                                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] font-black border ${
                                                            isChecked
                                                                ? 'bg-blue-600 text-white border-blue-600'
                                                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-transparent'
                                                        }`}>
                                                            {isChecked ? '✓' : ''}
                                                        </span>
                                                        <span className={isChecked ? 'font-bold text-gray-800 dark:text-white' : 'text-gray-400'}>{pru.label}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div>
                                            <span className="block font-bold text-gray-500 mb-1">Detalle de Pruebas:</span>
                                            <div className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-800 dark:text-white text-xs min-h-[50px] whitespace-pre-line">
                                                {pruebas.detalle || 'Sin detalle de pruebas.'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 8. URGENCIA */}
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                        <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700">
                                            8. URGENCIA
                                        </h3>
                                        <div className="space-y-2 text-xs">
                                            {URGENCIA_ITEMS.map(urg => {
                                                const isSelected = urgenciaVal === urg.key;
                                                return (
                                                    <div
                                                        key={urg.key}
                                                        className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                                                            isSelected
                                                                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-600 font-bold shadow-xs'
                                                                : 'border-transparent text-gray-400 opacity-60'
                                                        }`}
                                                    >
                                                        <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                                            isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                                                        }`}>
                                                            {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                                                        </span>
                                                        <span className={urg.colorClass}>{urg.label}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* FOTOGRAFÍAS / REFERENCIAS */}
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                                        <div>
                                            <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700 flex items-center gap-1.5">
                                                <ImageIcon className="w-4 h-4 text-blue-600" />
                                                FOTOGRAFÍAS / REFERENCIAS
                                            </h3>

                                            {photos.length > 0 ? (
                                                <div className="grid grid-cols-3 gap-2 max-h-[140px] overflow-y-auto">
                                                    {photos.map((photo, idx) => (
                                                        <div
                                                            key={idx}
                                                            onClick={() => setPreviewImage(getImageUrl(photo))}
                                                            className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 aspect-square bg-gray-100 cursor-pointer hover:opacity-90 transition-all"
                                                        >
                                                            <img src={getImageUrl(photo)} alt="Referencia" className="w-full h-full object-cover" />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-6 text-gray-400 text-xs">
                                                    <ImageIcon className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-1" />
                                                    <span>Sin fotografías adjuntas</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 9. CONTROL DE TIEMPOS Y ESTADO DEL TRABAJO */}
                                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-blue-600" />
                                        9. CONTROL DE TIEMPOS Y ESTADO DEL TRABAJO
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                                                Estado del Trabajo:
                                            </label>
                                            <div className={`w-full px-3 py-2 rounded-xl border font-bold text-xs text-center ${
                                                trabajo.estado === 'terminado' || trabajo.estado === 'entregado'
                                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200'
                                                    : 'border-amber-300 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200'
                                            }`}>
                                                {trabajo.estado === 'terminado' ? '✅ Terminado' : trabajo.estado === 'entregado' ? '📦 Entregado' : '⌛ No Terminado'}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                                                Fecha de Envío:
                                            </label>
                                            <div className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-800 dark:text-white font-medium text-center">
                                                {formatDate(trabajo.fecha)}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                                                Hora de Envío:
                                            </label>
                                            <div className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-800 dark:text-white font-medium text-center">
                                                {trabajo.hora_envio || d?.control_tiempos?.hora_envio || trabajo.hora || '-'}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                                                Fecha de Entrega:
                                            </label>
                                            <div className="w-full px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold text-center">
                                                {trabajo.fecha_pedido ? formatDate(trabajo.fecha_pedido) : '-'}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                                                Hora de Entrega:
                                            </label>
                                            <div className="w-full px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold text-center">
                                                {trabajo.hora_entrega || d?.control_tiempos?.hora_entrega || '-'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 10. OBSERVACIONES CLÍNICAS / INSTRUCCIONES ESPECIALES */}
                                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-blue-600" />
                                        10. OBSERVACIONES CLÍNICAS / INSTRUCCIONES ESPECIALES
                                    </h3>
                                    <div className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 text-gray-800 dark:text-white text-xs font-medium whitespace-pre-line min-h-[50px]">
                                        {trabajo.observacion || trabajo.observaciones || 'Sin observaciones o instrucciones especiales registradas.'}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-10 text-gray-500">
                                No se pudo cargar los detalles del trabajo seleccionado.
                            </div>
                        )}
                    </div>

                    {/* Footer Buttons */}
                    <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 flex flex-row-reverse gap-3 border-t border-gray-200 dark:border-gray-700 items-center">
                        <button
                            onClick={handlePrint}
                            disabled={!trabajo}
                            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-2 px-5 rounded-xl flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2 text-xs"
                        >
                            <Printer size={16} />
                            <span>Imprimir Orden Completa</span>
                        </button>
                        <button
                            type="button"
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-5 rounded-xl flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2 text-xs"
                            onClick={onClose}
                        >
                            <X size={16} />
                            <span>Cerrar</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Photo Preview Modal */}
            {previewImage && (
                <div className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
                    <div className="relative max-w-4xl max-h-[90vh]">
                        <img src={previewImage} alt="Vista previa" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
                        <button onClick={() => setPreviewImage(null)} className="absolute -top-4 -right-4 bg-red-600 text-white p-2 rounded-full shadow-lg">
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrabajoLaboratorioViewModal;
