import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import SingleTooth, { type FigureDef } from './SingleTooth';
import { getDynamicFigures, getFigureUrlByKey, type DynamicFigure } from '../utils/figureRegistry';
import { mergeOdontogramaWithTratamientos } from '../utils/odontogramMerger';
import ManualModal, { type ManualSection } from './ManualModal';
import { Shield, Save, X, AlertTriangle, FileText, Sparkles, HelpCircle, Printer } from 'lucide-react';
import type { Arancel } from '../types';
import { printOdontogramaPDF } from '../utils/odontogramaPdfGenerator';

interface OdontogramaInicialModalProps {
    isOpen: boolean;
    onClose: () => void;
    pacienteId: number;
    pacienteNombre: string;
}

const adultToothNumbers = {
    upper: [
        [18, 17, 16, 15, 14, 13, 12, 11],
        [21, 22, 23, 24, 25, 26, 27, 28]
    ],
    lower: [
        [48, 47, 46, 45, 44, 43, 42, 41],
        [31, 32, 33, 34, 35, 36, 37, 38]
    ]
};

const childToothNumbers = {
    upper: [
        [55, 54, 53, 52, 51],
        [61, 62, 63, 64, 65]
    ],
    lower: [
        [85, 84, 83, 82, 81],
        [71, 72, 73, 74, 75]
    ]
};

const DEFAULT_SYMBOLS = [
    { value: 'caries', label: 'Caries (Relleno de cara)', defaultColor: '#ef4444' },
    { value: 'cara_rellena', label: 'Obturación (Relleno completo)', defaultColor: '#3b82f6' },
    { value: 'tachar_ausente', label: 'Diente Ausente (X azul)', defaultColor: '#3b82f6' },
    { value: 'tachar_extraccion', label: 'A Extracción (X roja)', defaultColor: '#ef4444' },
    { value: 'circulo_corona', label: 'Corona Definitiva (Círculo)', defaultColor: '#f59e0b' },
    { value: 'corona_provisoria', label: 'Corona Provisoria (Línea punteada)', defaultColor: '#f59e0b' },
    { value: 'perno', label: 'Perno Muñón (Poste)', defaultColor: '#6b7280' },
    { value: 'puente', label: 'Puente Fijo (Enlace)', defaultColor: '#8b5cf6' },
    { value: 'protesis_removible', label: 'Prótesis Removible (Bases)', defaultColor: '#a855f7' },
    { value: 'sellante', label: 'Sellante (Marca SFF)', defaultColor: '#10b981' },
    { value: 'fractura', label: 'Fractura (Rayo)', defaultColor: '#f97316' },
    { value: 'conducto', label: 'Endodoncia / Conducto (Raíz)', defaultColor: '#10b981' },
    { value: 'ortodoncia', label: 'Ortodoncia (Bracket + Alambre)', defaultColor: '#6366f1' },
    { value: 'implante', label: 'Implante (Tornillo + Corona)', defaultColor: '#14b8a6' },
];

const OdontogramaInicialModal: React.FC<OdontogramaInicialModalProps> = ({
    isOpen,
    onClose,
    pacienteId,
    pacienteNombre,
}) => {
    const [selectedFigure, setSelectedFigure] = useState<string>('');
    const [dentitionType, setDentitionType] = useState<'adult' | 'child'>('adult');
    const [mapaDientes, setMapaDientes] = useState<Record<string, any>>({});
    const [notas, setNotas] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isExistingRecord, setIsExistingRecord] = useState(false);
    const [aranceles, setAranceles] = useState<Arancel[]>([]);
    const [showManual, setShowManual] = useState(false);

    const manualSections: ManualSection[] = [
        {
            title: 'Odontograma Inicial (Diagnóstico de Entrada)',
            content: 'Este módulo permite registrar y actualizar el estado bucodental inicial con el que ingresa el paciente antes de realizar cualquier tratamiento clínico.'
        },
        {
            title: 'Selección de Figuras y Tratamientos',
            content: '1. Despliegue el selector "Figura de Odontograma a Aplicar".\n2. Escoja entre Símbolos Predeterminados (Caries, Diente Ausente, Corona, Conducto, etc.), Figuras Personalizadas por Especialidad o Aranceles Registrados.\n3. Haga clic sobre la pieza dental o cara deseada para marcarla o desmarcarla.'
        },
        {
            title: 'Alternar Dentición (Adultos / Niños)',
            content: 'Utilice los botones en la parte superior derecha para alternar entre Dentición Adulta (32 piezas permanentes) o Dentición Infantil (20 piezas deciduas).'
        },
        {
            title: 'Fusión de Odontogramas y Regla de Prioridad',
            content: 'Las marcas registradas en este Odontograma Inicial permanecen como línea de base y se posicionan siempre en la parte superior/primera posición de la pieza. Los tratamientos terminados en el seguimiento clínico se integrarán automáticamente debajo.'
        }
    ];

    const dynamicFigures = getDynamicFigures();
    const groupedFigures = dynamicFigures.reduce((acc, fig) => {
        if (!acc[fig.specialty]) acc[fig.specialty] = [];
        acc[fig.specialty].push(fig);
        return acc;
    }, {} as Record<string, DynamicFigure[]>);

    useEffect(() => {
        if (isOpen && pacienteId) {
            setSelectedFigure('');
            fetchOdontogramaInicial();
            fetchAranceles();
        }
    }, [isOpen, pacienteId]);

    const fetchAranceles = async () => {
        try {
            const response = await api.get('/arancel?limit=200');
            const data = Array.isArray(response.data) ? response.data : response.data.data || [];
            const withFigure = data.filter((a: Arancel) => a.odontogramaFigura);
            setAranceles(withFigure);
        } catch (error) {
            console.error('Error fetching aranceles:', error);
        }
    };

    const fetchOdontogramaInicial = async () => {
        setLoading(true);
        try {
            const [odontoRes, historiaRes, arancelRes] = await Promise.all([
                api.get(`/odontogramas/inicial/${pacienteId}`),
                api.get(`/historia-clinica/paciente/${pacienteId}`).catch(() => ({ data: [] })),
                api.get('/arancel?limit=200').catch(() => ({ data: [] }))
            ]);

            const allAranceles = Array.isArray(arancelRes.data) 
                ? arancelRes.data 
                : arancelRes.data?.data || [];
            setAranceles(allAranceles.filter((a: Arancel) => a.odontogramaFigura));

            const rawMapa = odontoRes.data?.mapa_dientes || {};
            const historiaList = Array.isArray(historiaRes.data) ? historiaRes.data : [];

            // Fuse initial baseline with finished treatments
            const fusedMap = mergeOdontogramaWithTratamientos(rawMapa, historiaList, allAranceles);

            setMapaDientes(fusedMap);
            setNotas(odontoRes.data?.notas || '');
            
            if (odontoRes.data && (odontoRes.data.id || Object.keys(rawMapa).length > 0)) {
                setIsExistingRecord(true);
            } else {
                setIsExistingRecord(false);
            }
        } catch (error) {
            console.error('Error fetching odontograma inicial:', error);
            setMapaDientes({});
            setNotas('');
            setIsExistingRecord(false);
        } finally {
            setLoading(false);
        }
    };

    const getFigureDetails = (figValue: string) => {
        if (!figValue) {
            return { figType: '', color: '#9ca3af', label: 'Ninguna (Seleccione una figura)', url: null };
        }

        if (figValue === 'limpiar') {
            return { figType: 'limpiar', color: '#9ca3af', label: 'Restablecer / Limpiar Pieza', url: null };
        }

        if (figValue.startsWith('arancel:')) {
            const arancelId = parseInt(figValue.replace('arancel:', ''), 10);
            const arancel = aranceles.find(a => a.id === arancelId);
            if (arancel) {
                return {
                    figType: arancel.odontogramaFigura || 'caries',
                    color: arancel.odontogramaColor || '#ef4444',
                    label: arancel.detalle,
                    url: arancel.odontogramaFigura?.startsWith('dynamic:') 
                        ? getFigureUrlByKey(arancel.odontogramaFigura.replace('dynamic:', '')) 
                        : null
                };
            }
        }

        if (figValue.startsWith('dynamic:')) {
            const pathKey = figValue.replace('dynamic:', '');
            const url = getFigureUrlByKey(pathKey);
            const figName = pathKey.split('/').pop()?.split('.')[0]?.replace(/[-_]/g, ' ') || 'Figura Personalizada';
            return {
                figType: figValue,
                color: '#3b82f6',
                label: figName.toUpperCase(),
                url
            };
        }

        const foundSymbol = DEFAULT_SYMBOLS.find(s => s.value === figValue);
        return {
            figType: figValue,
            color: foundSymbol?.defaultColor || '#ef4444',
            label: foundSymbol?.label || figValue,
            url: null
        };
    };

    const handleToothClick = (tooth: number) => {
        if (!selectedFigure) {
            Swal.fire({
                icon: 'info',
                title: 'Selección requerida',
                text: 'Por favor seleccione una figura de odontograma antes de hacer clic en la pieza dental.',
                timer: 2000,
                showConfirmButton: false,
            });
            return;
        }

        const toothKey = String(tooth);
        const currentData = mapaDientes[toothKey] || { activeFigures: [], surfaceColors: {} };

        const { figType, color } = getFigureDetails(selectedFigure);

        if (figType === 'limpiar') {
            const updatedMap = { ...mapaDientes };
            delete updatedMap[toothKey];
            setMapaDientes(updatedMap);
            return;
        }

        // Toggle figure on tooth
        let updatedFigures = currentData.activeFigures || [];
        const hasFig = updatedFigures.some((f: any) => f.type === figType);

        if (hasFig) {
            updatedFigures = updatedFigures.filter((f: any) => f.type !== figType);
        } else {
            updatedFigures = [...updatedFigures, { type: figType, color }];
        }

        setMapaDientes({
            ...mapaDientes,
            [toothKey]: {
                ...currentData,
                activeFigures: updatedFigures,
            }
        });
    };

    const handleSurfaceClick = (tooth: number, surface: string) => {
        if (!selectedFigure) {
            Swal.fire({
                icon: 'info',
                title: 'Selección requerida',
                text: 'Por favor seleccione una figura de odontograma antes de hacer clic en la pieza dental.',
                timer: 2000,
                showConfirmButton: false,
            });
            return;
        }

        const toothKey = String(tooth);
        const currentData = mapaDientes[toothKey] || { activeFigures: [], surfaceColors: {} };

        const { figType, color } = getFigureDetails(selectedFigure);

        if (figType === 'limpiar') {
            const updatedSurfaces = { ...(currentData.surfaceColors || {}) };
            delete updatedSurfaces[surface];
            setMapaDientes({
                ...mapaDientes,
                [toothKey]: {
                    ...currentData,
                    surfaceColors: updatedSurfaces
                }
            });
            return;
        }

        if (figType === 'caries' || figType === 'cara_rellena') {
            const currentColor = currentData.surfaceColors?.[surface];
            const nextColor = currentColor === color ? '' : color;
            setMapaDientes({
                ...mapaDientes,
                [toothKey]: {
                    ...currentData,
                    surfaceColors: {
                        ...(currentData.surfaceColors || {}),
                        [surface]: nextColor
                    }
                }
            });
            return;
        }

        // Default: toggle tooth figure
        handleToothClick(tooth);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;

            const payload = {
                pacienteId,
                mapa_dientes: mapaDientes,
                notas,
                tipo: 'inicial',
                usuarioId: user?.id || null,
            };

            await api.post('/odontogramas', payload);
            setIsExistingRecord(true);
            await Swal.fire({
                icon: 'success',
                title: isExistingRecord ? '¡Odontograma Inicial Actualizado!' : '¡Odontograma Inicial Guardado!',
                text: 'El estado inicial de la cavidad bucal ha sido procesado exitosamente.',
                timer: 1800,
                showConfirmButton: false,
            });
            onClose();
        } catch (error: any) {
            console.error('Error saving Odontograma Inicial:', error);
            Swal.fire('Error', error.response?.data?.message || 'No se pudo guardar el odontograma inicial', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const activeToothNumbers = dentitionType === 'child' ? childToothNumbers : adultToothNumbers;
    const currentDetails = getFigureDetails(selectedFigure);

    const renderToothColumnUpper = (num: number) => {
        const data = mapaDientes[String(num)] || {};
        const activeFigures: FigureDef[] = data.activeFigures || [];
        const surfaceColors = data.surfaceColors || {};

        return (
            <div key={num} className="flex flex-col items-center gap-1 group/tooth p-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all w-8 sm:w-10 relative hover:z-[60]">
                <span className="text-[9px] sm:text-[10px] font-black text-gray-600 dark:text-gray-300 group-hover/tooth:text-blue-500 transition-colors mb-1">{num}</span>
                <SingleTooth
                    tooth={num}
                    activeFigures={activeFigures}
                    surfaceColors={surfaceColors}
                    onClickTooth={handleToothClick}
                    onClickSurface={handleSurfaceClick}
                    readOnly={false}
                    mode="anatomical"
                    className="w-8 h-16 sm:w-10 sm:h-20"
                />
                <SingleTooth
                    tooth={num}
                    activeFigures={activeFigures}
                    surfaceColors={surfaceColors}
                    onClickTooth={handleToothClick}
                    onClickSurface={handleSurfaceClick}
                    readOnly={false}
                    mode="surfaces"
                    className="w-8 h-8 sm:w-10 sm:h-10 -mt-1"
                />
            </div>
        );
    };

    const renderToothColumnLower = (num: number) => {
        const data = mapaDientes[String(num)] || {};
        const activeFigures: FigureDef[] = data.activeFigures || [];
        const surfaceColors = data.surfaceColors || {};

        return (
            <div key={num} className="flex flex-col items-center gap-1 group/tooth p-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all w-8 sm:w-10 relative hover:z-[60]">
                <SingleTooth
                    tooth={num}
                    activeFigures={activeFigures}
                    surfaceColors={surfaceColors}
                    onClickTooth={handleToothClick}
                    onClickSurface={handleSurfaceClick}
                    readOnly={false}
                    mode="surfaces"
                    className="w-8 h-8 sm:w-10 sm:h-10 -mb-1"
                />
                <SingleTooth
                    tooth={num}
                    activeFigures={activeFigures}
                    surfaceColors={surfaceColors}
                    onClickTooth={handleToothClick}
                    onClickSurface={handleSurfaceClick}
                    readOnly={false}
                    mode="anatomical"
                    className="w-8 h-16 sm:w-10 sm:h-20"
                />
                <span className="text-[9px] sm:text-[10px] font-black text-gray-600 dark:text-gray-300 group-hover/tooth:text-blue-500 transition-colors mt-1">{num}</span>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm transition-opacity">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[95vh] border border-gray-100 dark:border-gray-700">
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                        <span className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600 dark:text-blue-300">
                            <Shield className="h-6 w-6" />
                        </span>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                Odontograma Inicial (Diagnóstico de Entrada)
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Paciente: <strong className="text-blue-600 dark:text-blue-400">{pacienteNombre}</strong>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowManual(true)}
                            className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm"
                            title="Ayuda / Manual"
                        >
                            ?
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="p-16 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        Cargando odontograma inicial...
                    </div>
                ) : (
                    <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
                        {/* Selector de Dentición y Leyenda explicativa */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-blue-50/60 dark:bg-blue-950/30 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/40">
                            <div className="flex items-center gap-2 text-xs text-blue-900 dark:text-blue-200">
                                <AlertTriangle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                <span>
                                    Seleccione la **Figura de Odontograma** deseada y luego haga clic en la pieza dental para aplicarla.
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 self-end sm:self-auto">
                                <button
                                    type="button"
                                    onClick={() => setDentitionType('adult')}
                                    className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                        dentitionType === 'adult'
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                                    }`}
                                >
                                    Dentición Adulta (Permanente)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDentitionType('child')}
                                    className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                        dentitionType === 'child'
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                                    }`}
                                >
                                    Dentición Infantil (Decidua)
                                </button>
                            </div>
                        </div>

                        {/* SELECTOR DE FIGURA EN ODONTOGRAMA */}
                        <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                <label className="text-xs font-extrabold text-gray-700 dark:text-gray-200 uppercase tracking-wider flex items-center gap-2">
                                    <Sparkles size={16} className="text-blue-500" />
                                    Figura de Odontograma a Aplicar:
                                </label>

                                {/* Insignia de vista previa de figura seleccionada */}
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm">
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Seleccionado:</span>
                                    {currentDetails.url ? (
                                        <img src={currentDetails.url} alt="" className="w-5 h-5 object-contain" />
                                    ) : (
                                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: currentDetails.color }} />
                                    )}
                                    <span className={`text-xs font-bold ${selectedFigure ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                        {currentDetails.label}
                                    </span>
                                </div>
                            </div>

                            <div className="relative">
                                <select
                                    value={selectedFigure}
                                    onChange={(e) => setSelectedFigure(e.target.value)}
                                    className="w-full px-4 py-2.5 text-xs font-bold border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 transition-all appearance-none shadow-sm cursor-pointer"
                                >
                                    <option value="">-- Seleccionar Figura de Odontograma --</option>
                                    <option value="limpiar">Restablecer / Limpiar Pieza (🧹)</option>
                                    
                                    <optgroup label="Símbolos Predeterminados">
                                        {DEFAULT_SYMBOLS.map(sym => (
                                            <option key={sym.value} value={sym.value}>
                                                {sym.label}
                                            </option>
                                        ))}
                                    </optgroup>

                                    {Object.entries(groupedFigures).map(([specialty, figures]) => (
                                        <optgroup key={specialty} label={`Personalizado: ${specialty}`}>
                                            {figures.map(fig => (
                                                <option key={fig.pathKey} value={`dynamic:${fig.pathKey}`}>
                                                    {fig.name}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}

                                    {aranceles.length > 0 && (
                                        <optgroup label="Aranceles / Tratamientos Registrados">
                                            {aranceles.map(arancel => (
                                                <option key={arancel.id} value={`arancel:${arancel.id}`}>
                                                    {arancel.detalle}
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Odontograma GRID */}
                        <div className="bg-gray-50/70 dark:bg-gray-900/40 p-3 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
                            <div className="min-w-max flex flex-col items-center mx-auto">
                                {/* Header Quadrants */}
                                <div className="flex w-full px-4 mb-2">
                                    <div className="flex-1 flex justify-end pr-4">
                                        <span className="text-[10px] font-black text-gray-400 dark:text-gray-500">CUADRANTE SUPERIOR DERECHO</span>
                                    </div>
                                    <div className="flex-1 flex justify-start pl-4">
                                        <span className="text-[10px] font-black text-gray-400 dark:text-gray-500">CUADRANTE SUPERIOR IZQUIERDO</span>
                                    </div>
                                </div>

                                <div className="flex flex-col relative bg-white dark:bg-gray-800/80 p-3 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                    {/* Eje central */}
                                    <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-gray-300 dark:bg-gray-600 transform -translate-y-1/2 z-0"></div>
                                    <div className="absolute top-4 bottom-4 left-1/2 w-0.5 bg-gray-300 dark:bg-gray-600 transform -translate-x-1/2 z-0"></div>

                                    {/* ARCADA SUPERIOR */}
                                    <div className="flex z-10 mb-4 sm:mb-6">
                                        <div className="flex justify-end gap-1 pr-3 sm:pr-6">
                                            {activeToothNumbers.upper[0].map(renderToothColumnUpper)}
                                        </div>
                                        <div className="flex justify-start gap-1 pl-3 sm:pl-6">
                                            {activeToothNumbers.upper[1].map(renderToothColumnUpper)}
                                        </div>
                                    </div>

                                    {/* ARCADA INFERIOR */}
                                    <div className="flex z-10">
                                        <div className="flex justify-end gap-1 pr-3 sm:pr-6">
                                            {activeToothNumbers.lower[0].map(renderToothColumnLower)}
                                        </div>
                                        <div className="flex justify-start gap-1 pl-3 sm:pl-6">
                                            {activeToothNumbers.lower[1].map(renderToothColumnLower)}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex w-full px-4 mt-2">
                                    <div className="flex-1 flex justify-end pr-4">
                                        <span className="text-[10px] font-black text-gray-400 dark:text-gray-500">CUADRANTE INFERIOR DERECHO</span>
                                    </div>
                                    <div className="flex-1 flex justify-start pl-4">
                                        <span className="text-[10px] font-black text-gray-400 dark:text-gray-500">CUADRANTE INFERIOR IZQUIERDO</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Observaciones del Odontograma Inicial */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                                <FileText size={15} className="text-blue-500" />
                                Observaciones Diagnósticas Iniciales del Odontólogo:
                            </label>
                            <div className="relative">
                                <div className="absolute top-3 left-3 pointer-events-none text-gray-400">
                                    <FileText size={18} />
                                </div>
                                <textarea
                                    value={notas}
                                    onChange={(e) => setNotas(e.target.value)}
                                    rows={3}
                                    placeholder="Ej: Paciente presenta ausencia previa de piezas 18 y 28 por extracciones antiguas. Caries oclusal en pieza 16 y amalgama previa en 46 en buen estado."
                                    className="w-full pl-10 pr-3 py-2.5 text-xs border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Buttons */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex justify-start gap-3 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md disabled:opacity-50 text-sm"
                    >
                        <Save size={18} />
                        {saving ? 'Guardando...' : (isExistingRecord ? 'Actualizar Odontograma Inicial' : 'Guardar Odontograma Inicial')}
                    </button>
                    <button
                        type="button"
                        onClick={async () => {
                            Swal.fire({
                                title: 'Generando Odontograma...',
                                text: 'Preparando documento para impresión...',
                                allowOutsideClick: false,
                                didOpen: () => { Swal.showLoading(); }
                            });

                            try {
                                const resCentro = await api.get('/datos-centro-dental').catch(() => ({ data: [] }));
                                const centroDentalData = resCentro.data && resCentro.data.length > 0 ? resCentro.data[0] : null;

                                let pacienteData: any = null;
                                try {
                                    const resPac = await api.get(`/pacientes/${pacienteId}`);
                                    pacienteData = resPac.data;
                                } catch (err) {}

                                await printOdontogramaPDF({
                                    paciente: pacienteData || { nombre: pacienteNombre, paterno: '' },
                                    centroDental: centroDentalData,
                                    odontogramaMapa: mapaDientes,
                                    aranceles,
                                    action: 'print'
                                });

                                Swal.close();
                            } catch (err: any) {
                                console.error('Error al imprimir odontograma inicial:', err);
                                Swal.fire('Error', 'No se pudo generar la impresión del odontograma inicial', 'error');
                            }
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md text-sm"
                    >
                        <Printer size={18} />
                        Imprimir Odontograma
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2.5 px-5 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2 text-sm"
                    >
                        <X size={18} />
                        Cancelar
                    </button>
                </div>
            </div>

            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Odontograma Inicial"
                sections={manualSections}
            />
        </div>
    );
};

export default OdontogramaInicialModal;
