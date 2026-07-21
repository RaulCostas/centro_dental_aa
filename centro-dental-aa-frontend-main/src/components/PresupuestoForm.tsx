import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';
import type { Paciente, Arancel, HistoriaClinica } from '../types';
import ManualModal, { type ManualSection } from './ManualModal';
import ArancelForm from './ArancelForm';
import Odontogram from './Odontogram';
import SearchableSelect from './SearchableSelect';
import { formatDate } from '../utils/dateUtils';
import { formatFullName, formatNumber, formatCurrency } from '../utils/formatters';


interface DetalleItem {
    id?: number;
    arancelId: number;
    codigo: string;
    tratamiento: string;
    precioUnitario: number;
    piezas: string;
    cantidad: number;
    descuento: number;
    total: number;
    posible: boolean;
}

const SURFACE_CONDITIONS = [
    { code: 1, label: 'Caries (Rojo)', type: 'col2' },
    { code: 14, label: 'Obturación (B)', type: 'col1' },
    { code: 15, label: 'Obturación (M)', type: 'col2' },
    { code: 16, label: 'Sellante (B)', type: 'col1' },
    { code: 17, label: 'Sellante (M)', type: 'col2' },
    { code: 23, label: 'Lesión Cervical (B)', type: 'col1' },
    { code: 24, label: 'Lesión Cervical (M)', type: 'col2' },
    { code: 40, label: 'Restauración', type: 'col1' },
];

const TOOTH_CONDITIONS = [
    { code: 10, label: 'Ausente', type: 'col1' },
    { code: 11, label: 'Extracción', type: 'col2' },
    { code: 12, label: 'Corona (B)', type: 'col1' },
    { code: 13, label: 'Corona (M)', type: 'col2' },
    { code: 33, label: 'Corona Prov.', type: 'col1' },
    { code: 18, label: 'Fractura', type: 'col2' },
    { code: 20, label: 'Prótesis Fija (B)', type: 'col1' },
    { code: 21, label: 'Prótesis Fija (M)', type: 'col2' },
    { code: 34, label: 'Prótesis Remov.', type: 'col1' },
    { code: 22, label: 'Ortodoncia', type: 'col1' },
    { code: 30, label: 'Implante', type: 'col1' },
    { code: 31, label: 'Perno Muñón', type: 'col1' },
    { code: 32, label: 'Endodoncia', type: 'col1' }
];

interface PresupuestoFormProps {
    id?: string;
    proformaId?: string;
    isReadOnly?: boolean;
    onClose?: () => void;
}

const PresupuestoForm: React.FC<PresupuestoFormProps> = ({ 
    id: propId, 
    proformaId: propProformaId, 
    isReadOnly: propIsReadOnly,
    onClose
}) => {
    const { id: paramId, proformaId: paramProformaId } = useParams<{ id: string; proformaId?: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const id = propId || paramId;
    const proformaId = propProformaId || paramProformaId;
    const isReadOnly = propIsReadOnly ?? location.pathname.includes('/view/');
    
    const [paciente, setPaciente] = useState<Paciente | null>(null);
    const [aranceles, setAranceles] = useState<Arancel[]>([]);
    const [detalles, setDetalles] = useState<DetalleItem[]>([]);
    const [nota, setNota] = useState('');
    const [fecha, setFecha] = useState(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    const [numero, setNumero] = useState<number | null>(null);
    const [historiaClinica, setHistoriaClinica] = useState<HistoriaClinica[]>([]);

    // Form state for new item
    const [selectedArancelId, setSelectedArancelId] = useState<number>(0);
    const [piezas, setPiezas] = useState('');
    const [cantidad, setCantidad] = useState(1);
    const [descuentoItem, setDescuentoItem] = useState(0);
    const [descuentoGlobal, setDescuentoGlobal] = useState<number | string>(0);
    const [posible, setPosible] = useState(false);
    const [showManual, setShowManual] = useState(false);
    const [isArancelModalOpen, setIsArancelModalOpen] = useState(false);

    const arancelOptions = React.useMemo(() => {
        return aranceles.map(a => ({
            id: a.id,
            label: a.detalle,
            subLabel: formatCurrency(a.precio, a.moneda === 'Dólares' ? 'USD' : 'Bs')
        }));
    }, [aranceles]);

    // State for editing an item
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    // Odontograma Integration States
    const [showOdontograma, setShowOdontograma] = useState(false);
    const [dentitionType, setDentitionType] = useState<'adult' | 'child'>('adult');
    const [odontogramaPreexistente, setOdontogramaPreexistente] = useState<any>({});
    
    // Toolbox state
    const [activeTool, setActiveTool] = useState<{ code: number, isSurface: boolean } | null>(null);

    const manualSections: ManualSection[] = [
        {
            title: 'Crear Plan de Tratamiento',
            content: 'Agregue tratamientos del arancel al plan de tratamiento. Puede especificar piezas dentales, cantidad, descuentos y marcar tratamientos como "posibles".'
        },
        {
            title: 'Bloqueo Automático',
            content: 'Una vez que guarde el plan de tratamiento y este comience a ser utilizado en la sección Clínica (tratamientos iniciados) su edición se bloqueará parcialmente por seguridad.'
        },
        {
            title: 'Tratamientos Posibles',
            content: 'Marque tratamientos como "posibles" si aún no están confirmados. Estos aparecerán diferenciados en el plan de tratamiento final.'
        }];

    // Move fetch functions above useEffect to resolve 'cannot access before initialization'
    const fetchHistoriaClinica = async (pacienteId: number) => {
        try {
            const response = await api.get(`/historia-clinica/paciente/${pacienteId}`);
            setHistoriaClinica(response.data || []);
        } catch (error) {
            console.error('Error fetching historia clinica:', error);
        }
    };

    const fetchProforma = async (proformaId: number) => {
        try {
            const response = await api.get(`/proformas/${proformaId}`);
            const data = response.data;
            setNota(data.nota);
            setFecha(data.fecha.split('T')[0]);
            setNumero(data.numero);

            const discountValue = data.descuento ?? 0;
            setDescuentoGlobal(discountValue);
            if (data.odontograma_mapa) {
                setOdontogramaPreexistente(data.odontograma_mapa);
            } else {
                setOdontogramaPreexistente({});
            }

            if (data.detalles) {
                const mappedDetalles = data.detalles.map((d: {
                    id: number;
                    arancel: Arancel;
                    precioUnitario: number | string;
                    piezas: string;
                    cantidad: number | string;
                    descuento?: number | string;
                    total: number | string;
                    posible: boolean
                }) => ({
                    id: d.id,
                    arancelId: d.arancel.id,
                    codigo: d.arancel.id.toString(),
                    tratamiento: d.arancel.detalle,
                    precioUnitario: Number(d.precioUnitario),
                    piezas: d.piezas,
                    cantidad: Number(d.cantidad),
                    descuento: Number(d.descuento || 0),
                    total: Number(d.total),
                    posible: d.posible
                }));
                setDetalles(mappedDetalles);
            }
        } catch (error) {
            console.error('Error fetching proforma:', error);
            Swal.fire('Error', 'Error al cargar el plan de tratamiento para editar', 'error');
        }
    };

    const fetchPaciente = async (pacienteId: number) => {
        try {
            const response = await api.get(`/pacientes/${pacienteId}`);
            setPaciente(response.data);
        } catch (error) {
            console.error('Error fetching paciente:', error);
        }
    };

    const fetchAranceles = async () => {
        try {
            const url = '/arancel?limit=1000';
            const response = await api.get(url);
            setAranceles(response.data.data || []);
        } catch (error) {
            console.error('Error fetching aranceles:', error);
        }
    };


    useEffect(() => {
        if (id) {
            fetchPaciente(Number(id));
            fetchHistoriaClinica(Number(id));
        }
        if (proformaId) {
            fetchProforma(Number(proformaId));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, proformaId]);

    useEffect(() => {
        if (id) {
            fetchAranceles();
            setSelectedArancelId(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        if (!proformaId) {
            // New Plan de Tratamiento - Start with clean odontogram
            setOdontogramaPreexistente({});
        }
    }, [proformaId]);

    const parsedPlanItems = React.useMemo(() => {
        const items: any[] = [];
        detalles.forEach(detail => {
            if (!detail.piezas) return;
            // Clean spaces: "14 (O)" -> "14(O)"
            const cleanedPiezas = detail.piezas.replace(/\s*\(\s*([^)]+)\s*\)/g, '($1)');
            const parts = cleanedPiezas.split(/[\s,\/-]+/).filter(p => p.trim() !== '');
            parts.forEach(part => {
                const match = part.match(/^(\d+)(?:\(([^)]+)\))?$/);
                if (match) {
                    const tooth = Number(match[1]);
                    const surface = match[2] ? match[2].trim().toUpperCase() : undefined;
                    items.push({
                        tooth,
                        surface,
                        arancelId: detail.arancelId
                    });
                } else {
                    const toothNum = parseInt(part, 10);
                    if (!isNaN(toothNum)) {
                        items.push({
                            tooth: toothNum,
                            arancelId: detail.arancelId
                        });
                    }
                }
            });
        });
        return items;
    }, [detalles]);

    const addPieceToSelectedArancel = (arancelId: number, pieceStr: string) => {
        const arancel = aranceles.find(a => a.id === arancelId);
        if (!arancel) return;

        const existingIndex = detalles.findIndex(d => d.arancelId === arancelId);
        
        if (existingIndex !== -1) {
            // Arancel already in plan, append piece if not present
            const detail = detalles[existingIndex];
            const currentPieces = detail.piezas 
                ? detail.piezas.split(/[\s,\/-]+/).map(p => p.trim().replace(/\s*\(\s*([^)]+)\s*\)/g, '($1)'))
                : [];
            
            const normalizedNewPiece = pieceStr.replace(/\s*\(\s*([^)]+)\s*\)/g, '($1)');
            if (currentPieces.includes(normalizedNewPiece)) {
                // If it's already in the pieces list, remove it (toggle off!)
                const updatedPieces = currentPieces.filter(p => p !== normalizedNewPiece);
                const updatedDetalles = [...detalles];
                
                if (updatedPieces.length === 0) {
                    // Remove row if no pieces left
                    updatedDetalles.splice(existingIndex, 1);
                } else {
                    const newQty = updatedPieces.length;
                    updatedDetalles[existingIndex] = {
                        ...detail,
                        piezas: updatedPieces.join(', '),
                        cantidad: newQty,
                        total: (detail.precioUnitario * newQty) * (1 - detail.descuento / 100)
                    };
                }
                setDetalles(updatedDetalles);
                return;
            }

            // Otherwise, append it
            const updatedPieces = [...currentPieces, normalizedNewPiece];
            const newQty = updatedPieces.length;
            const updatedDetalles = [...detalles];
            updatedDetalles[existingIndex] = {
                ...detail,
                piezas: updatedPieces.join(', '),
                cantidad: newQty,
                total: (detail.precioUnitario * newQty) * (1 - detail.descuento / 100)
            };
            setDetalles(updatedDetalles);
        } else {
            // Create new row
            const newItem: DetalleItem = {
                arancelId: arancel.id,
                codigo: arancel.id.toString(),
                tratamiento: arancel.detalle,
                precioUnitario: Number(arancel.precio),
                piezas: pieceStr,
                cantidad: 1,
                descuento: 0,
                total: Number(arancel.precio),
                posible: false
            };
            setDetalles([...detalles, newItem]);
        }
    };

    const applyToolboxTreatment = (tooth: number, surface?: string) => {
        if (!activeTool) return;
        const newMap = JSON.parse(JSON.stringify(odontogramaPreexistente));
        
        if (activeTool.code === 0) {
            // Eraser
            if (surface) {
                if (newMap[tooth] && newMap[tooth].surfaces) {
                    delete newMap[tooth].surfaces[surface];
                }
            } else {
                if (newMap[tooth]) {
                    delete newMap[tooth].connectionType;
                    newMap[tooth].state = 0;
                }
            }
        } else {
            // Apply condition
            if (surface) {
                if (!activeTool.isSurface) return; // Cannot apply tooth condition to surface
                if (!newMap[tooth]) newMap[tooth] = { state: 0, surfaces: {} };
                newMap[tooth].surfaces[surface] = activeTool.code;
            } else {
                if (activeTool.isSurface) return; // Cannot apply surface condition to tooth
                if (!newMap[tooth]) newMap[tooth] = { state: 0, surfaces: {} };
                
                if ([20, 21, 22].includes(activeTool.code)) {
                    newMap[tooth].connectionType = activeTool.code;
                } else {
                    newMap[tooth].state = activeTool.code;
                }
            }
        }
        setOdontogramaPreexistente(newMap);
    };

    const handleSelectSurface = (tooth: number, surface: string) => {
        if (isReadOnly) return;
        
        if (activeTool) {
            applyToolboxTreatment(tooth, surface);
            return;
        }

        const pieceStr = `${tooth}(${surface})`;
        
        // If an arancel is selected, add it immediately
        if (selectedArancelId && selectedArancelId !== 0) {
            addPieceToSelectedArancel(selectedArancelId, pieceStr);
        } else {
            // Set input fields for manual addition
            setPiezas(prev => {
                const current = prev.split(/[\s,\/-]+/).filter(p => p.trim() !== '');
                if (current.includes(pieceStr)) return prev;
                return prev ? `${prev}, ${pieceStr}` : pieceStr;
            });
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: `Pieza ${pieceStr} seleccionada. Elige un tratamiento.`,
                showConfirmButton: false,
                timer: 2000,
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
        }
    };

    const handleSelectTooth = (tooth: number) => {
        if (isReadOnly) return;

        if (activeTool) {
            applyToolboxTreatment(tooth, undefined);
            return;
        }

        const pieceStr = `${tooth}`;
        
        // If an arancel is selected, add it immediately
        if (selectedArancelId && selectedArancelId !== 0) {
            addPieceToSelectedArancel(selectedArancelId, pieceStr);
        } else {
            // Set input fields for manual addition
            setPiezas(prev => {
                const current = prev.split(/[\s,\/-]+/).filter(p => p.trim() !== '');
                if (current.includes(pieceStr)) return prev;
                return prev ? `${prev}, ${pieceStr}` : pieceStr;
            });
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: `Pieza ${pieceStr} seleccionada. Elige un tratamiento.`,
                showConfirmButton: false,
                timer: 2000,
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
        }
    };


    // Empty replacement content, moving these functions up

    const handleAddItem = () => {
        if (!selectedArancelId) return;

        const arancel = aranceles.find(a => a.id === Number(selectedArancelId));
        if (!arancel) return;

        const precioUsar = Number(arancel.precio);
            
        const total = (precioUsar * cantidad) * (1 - descuentoItem / 100);

        const newItem: DetalleItem = {
            id: editingIndex !== null ? detalles[editingIndex].id : undefined,
            arancelId: arancel.id,
            codigo: arancel.id.toString(),
            tratamiento: arancel.detalle,
            precioUnitario: precioUsar,
            piezas,
            cantidad,
            descuento: descuentoItem,
            total,
            posible
        };

        if (editingIndex !== null) {
            const updatedDetalles = [...detalles];
            updatedDetalles[editingIndex] = newItem;
            setDetalles(updatedDetalles);
            setEditingIndex(null);
        } else {
            setDetalles([...detalles, newItem]);
        }

        setSelectedArancelId(0);
        setPiezas('');
        setCantidad(1);
        setDescuentoItem(0);
        setPosible(false);
    };

    const handleRemoveItem = (index: number) => {
        const newDetalles = [...detalles];
        newDetalles.splice(index, 1);
        setDetalles(newDetalles);

        if (editingIndex === index) {
            cancelEdit();
        } else if (editingIndex !== null && index < editingIndex) {
            setEditingIndex(editingIndex - 1);
        }
    };

    const handleEditItem = (index: number) => {
        const item = detalles[index];
        setEditingIndex(index);

        setSelectedArancelId(item.arancelId);
        setPiezas(item.piezas || '');
        setCantidad(item.cantidad);
        setDescuentoItem(item.descuento || 0);
        setPosible(item.posible);
    };

    const cancelEdit = () => {
        setEditingIndex(null);
        setSelectedArancelId(0);
        setPiezas('');
        setCantidad(1);
        setDescuentoItem(0);
        setPosible(false);
    };

    const isItemCompleted = (item: DetalleItem) => {
        const matchingHistory = historiaClinica.filter(h => {
            if (h.estadoTratamiento !== 'terminado') return false;
            if (h.proformaDetalleId) {
                return item.id && h.proformaDetalleId === item.id;
            }
            if (proformaId && h.proformaId === Number(proformaId)) {
                return h.tratamiento === item.tratamiento;
            }
            return false;
        });
        const totalCompleted = matchingHistory.reduce((sum, h) => sum + (h.cantidad || 0), 0);
        return totalCompleted >= item.cantidad;
    };

    const calculateTotalBruto = () => {
        return detalles.reduce((sum, item) => item.posible ? sum : sum + item.total, 0);
    };

    const calculateTotal = () => {
        const subtotal = calculateTotalBruto();
        const discountPercentage = Number(descuentoGlobal || 0);
        const total = subtotal * (1 - discountPercentage / 100);
        return total;
    };

    const handleSubmit = async () => {
        if (!paciente) return;

        try {
            const subtotal_bruto = calculateTotalBruto();
            const total_neto = calculateTotal();
            const payload = {
                pacienteId: paciente.id,
                usuarioId: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).id : 1,
                nota,
                fecha: new Date(fecha).toISOString(),
                sub_total: subtotal_bruto,
                descuento: Number(descuentoGlobal || 0),
                total: total_neto,
                odontograma_mapa: odontogramaPreexistente,
                detalles: detalles.map(d => ({
                    id: d.id,
                    arancelId: d.arancelId,
                    precioUnitario: d.precioUnitario,
                    piezas: d.piezas,
                    cantidad: d.cantidad,
                    descuento: d.descuento,
                    total: d.total,
                    posible: d.posible
                }))
            };

            console.log('Sending Payload:', payload);

            if (proformaId) {
                await api.patch(`/proformas/${proformaId}`, payload);
                Swal.fire({
                    icon: 'success',
                    title: 'Plan de Tratamiento Actualizado',
                    text: 'Plan de Tratamiento actualizado exitosamente',
                    timer: 1500,
                    showConfirmButton: false,
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });
            } else {
                await api.post('/proformas', payload);
                Swal.fire({
                    icon: 'success',
                    title: 'Plan de Tratamiento Guardado',
                    text: 'Plan de Tratamiento guardado exitosamente',
                    timer: 1500,
                    showConfirmButton: false,
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });
            }
            setTimeout(() => {
                navigate(`/pacientes/${id}/presupuestos`);
            }, 1500);
        } catch (error: unknown) {
            console.error('Error saving proforma:', error);
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            const errorMessage = err.response?.data?.message || err.message || 'Error desconocido';
            Swal.fire({
                icon: 'error',
                title: 'Error al Guardar',
                text: errorMessage,
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
        }
    };

    return (
        <>
            <div className="content-card max-w-[1400px] mx-auto text-gray-800 dark:text-white bg-white dark:bg-gray-800">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <span className="p-2 bg-blue-100 dark:bg-blue-900 rounded-xl text-blue-600 dark:text-blue-300">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </span>
                            {proformaId ? (isReadOnly ? `Ver Plan #${numero}` : `Editar Plan #${numero}`) : 'Nuevo Plan'}
                        </h2>
                        <div className="relative w-48">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            {isReadOnly ? (
                                <div className="w-full pl-9 pr-3 py-1.5 border border-transparent bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-800 dark:text-white font-medium text-sm flex items-center h-[34px]">
                                    {formatDate(fecha)}
                                </div>
                            ) : (
                                <input
                                    type="date"
                                    value={fecha}
                                    onChange={(e) => setFecha(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-white transition-all text-sm h-[34px]"
                                />
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 items-center">
                        <button
                            type="button"
                            onClick={() => setShowOdontograma(!showOdontograma)}
                            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-1.5 px-3 rounded-lg text-xs shadow-md transition-all transform hover:-translate-y-0.5 active:scale-95 h-[34px]"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 4h-8a4 4 0 0 0-4 4v3a7 7 0 0 0 7 7h2a7 7 0 0 0 7-7v-3a4 4 0 0 0-4-4z" />
                                <path d="M8 12a4 4 0 0 0 8 0" />
                            </svg>
                            {showOdontograma ? 'Ocultar Odontograma' : 'Ver Odontograma'}
                        </button>
                        <button
                            onClick={() => setShowManual(true)}
                            className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm"
                            title="Ayuda / Manual"
                        >
                            ?
                        </button>
                    </div>
                </div>

                {/* Collapsible Odontograma Panel */}
                {showOdontograma && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 shadow-sm no-print animate-fade-in">
                        <div className="mt-2">

                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    {selectedArancelId === 0 && !isReadOnly && !activeTool && (
                                        <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg font-semibold flex items-center gap-2">
                                            <span>💡</span>
                                            <span>Para agregar tratamientos haciendo clic: selecciona primero un tratamiento en el formulario de abajo y luego haz clic en las caras o piezas del odontograma.</span>
                                        </div>
                                    )}
                                    {selectedArancelId > 0 && !isReadOnly && !activeTool && (
                                        <div className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-lg font-semibold flex items-center gap-2">
                                            <span>🦷</span>
                                            <span>Haciendo clic en las piezas/caras agregarás o quitarás el tratamiento: <strong>{aranceles.find(a => a.id === selectedArancelId)?.detalle}</strong></span>
                                        </div>
                                    )}
                                    {activeTool && activeTool.code === 0 && !isReadOnly && (
                                        <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 p-3 rounded-lg font-semibold flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" /><path d="M22 21H7" /><path d="m5 11 9 9" /></svg>
                                            <span>Modo Borrador Activo: Haz clic en las caras o piezas que desees limpiar.</span>
                                        </div>
                                    )}
                                </div>
                                {!isReadOnly && (
                                    <button
                                        type="button"
                                        onClick={() => setActiveTool(activeTool?.code === 0 ? null : { code: 0, isSurface: false })}
                                        className={`ml-4 flex items-center gap-2 font-bold py-2 px-4 rounded-xl text-xs shadow-sm transition-all border ${activeTool?.code === 0 ? 'bg-red-500 text-white border-red-600 hover:bg-red-600 shadow-red-500/20' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" /><path d="M22 21H7" /><path d="m5 11 9 9" /></svg>
                                        {activeTool?.code === 0 ? 'Desactivar Borrador' : 'Borrar / Limpiar'}
                                    </button>
                                )}
                            </div>

                            <div className={`${activeTool ? 'cursor-crosshair ring-2 ring-blue-500/20 rounded-2xl p-1' : ''}`}>
                                <Odontogram
                                    initialData={odontogramaPreexistente}
                                    readOnly={isReadOnly}
                                    dentitionType={dentitionType}
                                    treatmentPlanItems={parsedPlanItems}
                                    aranceles={aranceles}
                                    onSelectSurface={handleSelectSurface}
                                    onSelectTooth={handleSelectTooth}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Item Entry Form - Hide in Read Only */}
                {!isReadOnly && (
                    <div className={`border border-gray-200 dark:border-gray-700 p-6 rounded-xl mb-6 transition-all ${editingIndex !== null ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'}`}>
                        <h4 className="text-lg font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
                            {editingIndex !== null ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                    Editar Tratamiento:
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                                    Nuevo Tratamiento:
                                </>
                            )}
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tratamiento</label>
                                <div className="flex gap-2 w-full">
                                    <SearchableSelect
                                        options={arancelOptions}
                                        value={selectedArancelId || ''}
                                        onChange={(val) => setSelectedArancelId(Number(val))}
                                        disabled={editingIndex !== null && detalles[editingIndex] && isItemCompleted(detalles[editingIndex])}
                                        placeholder="Buscar y seleccionar tratamiento..."
                                        className="flex-grow"
                                        icon={
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.172a4 4 0 005.656 0L13.293 3.707a1 1 0 00-1.414-1.414L11 3.172a2 2 0 01-2.828 0L7.707 2.707A1 1 0 007 2zm10 2a1 1 0 011 1v11.586l-2-2a2 2 0 00-2.828 0l-2 2V6a1 1 0 00-2 0v12.586l-2-2a2 2 0 00-2.828 0l-2 2V5a1 1 0 011-1h12z" clipRule="evenodd" />
                                            </svg>
                                        }
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsArancelModalOpen(true)}
                                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-3 py-2 rounded-xl flex items-center justify-center transform hover:-translate-y-0.5 transition-all active:scale-95 shadow-md self-start h-[38px]"
                                        title="Crear Nuevo Arancel"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            


                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nº Pieza(s)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 00-1.219-1.343L8.88 4.5c-.832-.086-1.55.534-1.611 1.343l-.128 1.7a1 1 0 001.218 1.343l5.109-.432c.831-.087 1.55-.534 1.611-1.343l.132-1.7z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        value={piezas}
                                        onChange={(e) => setPiezas(e.target.value)}
                                        placeholder="Ej. 11, 12..."
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-400 font-bold">#</span>
                                    </div>
                                    <input
                                        type="number"
                                        min="1"
                                        value={cantidad}
                                        onChange={(e) => setCantidad(Number(e.target.value))}
                                        placeholder="1"
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Desc. (%)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-400 font-bold">%</span>
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={descuentoItem}
                                        onChange={(e) => setDescuentoItem(Number(e.target.value))}
                                        placeholder="0"
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center mt-6">
                                <label className="flex items-center cursor-pointer text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-all">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={posible}
                                            onChange={(e) => setPosible(e.target.checked)}
                                            className="sr-only"
                                        />
                                        <div className={`w-10 h-5 bg-gray-300 rounded-full shadow-inner transition-all ${posible ? 'bg-orange-400' : ''}`}></div>
                                        <div className={`dot absolute w-5 h-5 bg-white rounded-full shadow -left-1 -top-0 transition-transform ${posible ? 'transform translate-x-full bg-blue-500' : ''}`}></div>
                                    </div>
                                    <span className="ml-3 font-semibold select-none text-xs">POSIBLE TRATAMIENTO</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleAddItem}
                                className={`w-full md:w-auto min-w-[200px] py-2 px-4 rounded-xl font-bold text-white text-sm shadow-md transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 ${editingIndex !== null ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-500 hover:bg-orange-600'}`}
                            >
                                {editingIndex !== null ? (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v3.257a1 1 0 11-2 0V13.099a6.992 6.992 0 01-8.526-2.146 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                                        Actualizar Tratamiento
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
                                        Agregar Tratamiento
                                    </>
                                )}
                            </button>
                            {editingIndex !== null && (
                                <button
                                    onClick={cancelEdit}
                                    className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-xl transition-all flex items-center gap-2">

                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg> Cancelar Edición
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Items Table */}
                <div className="mb-8">
                    <h4 className="text-xl font-bold mb-4 text-gray-800 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Tratamientos del Paciente</h4>
                    <div className="overflow-x-auto rounded-xl shadow border border-gray-200 dark:border-gray-700">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nº</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tratamiento</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pieza(s)</th>
                                    <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Costo Uni.</th>
                                    <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cant.</th>
                                    <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Desc. %</th>
                                    <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Bs.</th>
                                    {!isReadOnly && <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acción</th>}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {detalles.map((item, index) => {
                                    // Get completed pieces for this treatment
                                    const matchingHistory = historiaClinica.filter(h => {
                                        if (h.estadoTratamiento !== 'terminado') return false;
                                        if (h.proformaDetalleId) {
                                            return item.id && h.proformaDetalleId === item.id;
                                        }
                                        if (proformaId && h.proformaId === Number(proformaId)) {
                                            return h.tratamiento === item.tratamiento;
                                        }
                                        return false;
                                    });

                                    // Check if this specific treatment has estadoPresupuesto = 'terminado'
                                    const presupuestoTerminado = historiaClinica.some(h => {
                                        if (h.estadoPresupuesto !== 'terminado') return false;
                                        // Match by proformaDetalleId (most specific)
                                        if (h.proformaDetalleId && item.id) {
                                            return h.proformaDetalleId === item.id;
                                        }
                                        // Match by tratamiento name
                                        if (proformaId && h.proformaId === Number(proformaId)) {
                                            return h.tratamiento === item.tratamiento;
                                        }
                                        return false;
                                    });

                                    // Extract completed pieces from historia clinica
                                    const completedPieces: string[] = [];
                                    matchingHistory.forEach(h => {
                                        if (h.pieza) {
                                            const pieces = h.pieza.split(/[\/\s,\-]+/).filter((p: string) => p.trim() !== '');
                                            completedPieces.push(...pieces);
                                        }
                                    });

                                    // Parse pieces from presupuesto
                                    const allPiezas = item.piezas ? item.piezas.split(/[\/\s,\-]+/).filter((p: string) => p.trim() !== '') : [];
                                    const allPiecesCompleted = allPiezas.length > 0 && allPiezas.every((p: string) => completedPieces.includes(p));

                                    // For treatments without specific pieces, use quantity-based completion
                                    const totalCompleted = matchingHistory.reduce((sum, h) => sum + (h.cantidad || 0), 0);
                                    const isTreatmentCompleted = allPiezas.length > 0 ? allPiecesCompleted : totalCompleted >= item.cantidad;

                                    // Treatment is completed if:
                                    // 1. This specific treatment has estadoPresupuesto='terminado' in HC, OR
                                    // 2. The treatment itself is completed (all pieces or quantity)
                                    const isCompleted = presupuestoTerminado || isTreatmentCompleted;

                                    // Render pieces with completion status
                                    const renderPiezasWithCompletion = () => {
                                        if (!item.piezas) return <span className="text-gray-400">-</span>;

                                        if (allPiezas.length === 0) return <span className="text-gray-400">-</span>;

                                        return (
                                            <span className="inline-flex flex-wrap gap-1">
                                                {allPiezas.map((pieza, idx) => {
                                                    const isPiezaCompleted = completedPieces.includes(pieza);
                                                    return (
                                                        <React.Fragment key={idx}>
                                                            <span
                                                                className={`px-2 py-0.5 rounded-xl text-xs border ${isPiezaCompleted
                                                                    ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                                                                    : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
                                                                    }`}
                                                            >
                                                                {pieza} {isPiezaCompleted && '✓'}
                                                            </span>
                                                            {idx < allPiezas.length - 1 && <span className="text-gray-400">/</span>}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </span>
                                        );
                                    };

                                    return (
                                        <tr key={index} className={`transition-all duration-150 ${editingIndex === index ? 'bg-blue-50 dark:bg-blue-900/40 border-l-4 border-blue-500' : (item.posible ? 'bg-amber-50 dark:bg-amber-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50')}`}>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 text-center font-medium">{index + 1}</td>
                                            <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-200'}`}>
                                                <div className="flex flex-col">
                                                    <span>{item.tratamiento} {isCompleted && '✓'}</span>
                                                </div>
                                                {isCompleted && <span className="ml-2 text-xs bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-300 px-2 py-0.5 rounded-full">COMPLETADO</span>}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">{renderPiezasWithCompletion()}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 text-right">{formatNumber(item.precioUnitario)}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 text-center">{item.cantidad}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 text-center">{item.descuento || 0}%</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 text-right">
                                                {formatCurrency(item.total, 'Bs')}
                                            </td>
                                            {!isReadOnly && (
                                                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            onClick={() => handleEditItem(index)}
                                                            className="p-1.5 bg-transparent text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                                            title="Editar"
                                                            disabled={editingIndex !== null && editingIndex !== index}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleRemoveItem(index)}
                                                            disabled={isCompleted}
                                                            className="p-1.5 bg-transparent text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                                            title={isCompleted ? "No se puede eliminar un tratamiento completado" : "Eliminar"}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                                {detalles.length === 0 && (
                                    <tr>
                                        <td colSpan={isReadOnly ? 8 : 9} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 italic">
                                            No se han agregado tratamientos a este plan de tratamiento.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer: Total and Note */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 overflow-hidden shadow-sm">
                    <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-200 dark:divide-gray-600">
                        <div className="flex-1 p-6">
                            <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Nota / Observaciones</label>
                            <textarea
                                value={nota}
                                onChange={(e) => setNota(e.target.value)}
                                disabled={isReadOnly}
                                placeholder="Ingrese notas adicionales de este plan de tratamiento..."
                                className="w-full h-32 p-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800/50 disabled:cursor-not-allowed resize-none transition-all shadow-inner"
                            />
                        </div>

                        <div className="w-full lg:w-1/3 p-6 bg-gray-100/50 dark:bg-gray-800/20">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 dark:text-gray-400 font-bold uppercase text-xs tracking-wider">Subtotal</span>
                                    <span className="text-lg font-semibold text-gray-800 dark:text-white">
                                        {formatCurrency(calculateTotalBruto(), 'Bs')}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-gray-500 dark:text-gray-400 font-bold uppercase text-xs tracking-wider">Descuento (%)</span>
                                    <div className="w-24 relative">
                                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                            <span className="text-gray-400 font-bold text-xs">%</span>
                                        </div>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={descuentoGlobal}
                                            onChange={(e) => setDescuentoGlobal(e.target.value)}
                                            disabled={isReadOnly}
                                            className="w-full text-right pl-6 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                                    <div className="flex flex-col items-end">
                                        <span className="text-gray-500 dark:text-gray-400 font-bold uppercase text-xs tracking-wider mb-1">Total Tratamiento Neto</span>
                                        <div className="text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight mb-6">
                                            {formatCurrency(calculateTotal(), 'Bs')}
                                        </div>

                                        {(() => {
                                            const historiaWithSignature = historiaClinica.slice().reverse().find(h => 
                                                h.firmaPaciente && 
                                                h.estadoPresupuesto === 'terminado' &&
                                                (proformaId && h.proformaId === Number(proformaId))
                                            );
                                            if (historiaWithSignature && historiaWithSignature.firmaPaciente) {
                                                return (
                                                    <div className="w-full mt-2 mb-6 flex flex-col items-center animate-fade-in-up">
                                                        <div className="bg-white dark:bg-gray-800/80 p-5 rounded-xl border-2 border-dashed border-green-400/50 dark:border-green-500/30 w-full flex flex-col items-center shadow-sm relative overflow-hidden group hover:border-green-500 transition-all">
                                                            <div className="absolute top-0 right-0 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-[10px] font-bold px-2 py-1 rounded-bl-lg flex items-center gap-1">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                                VERIFICADO
                                                            </div>
                                                            <span className="text-gray-800 dark:text-gray-200 font-black uppercase text-sm tracking-widest mb-4 flex items-center gap-2 text-center">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                PLAN DE TRATAMIENTO CUMPLIDO
                                                            </span>
                                                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-2 w-full flex justify-center border border-gray-100 dark:border-gray-700/50">
                                                                <img 
                                                                    src={historiaWithSignature.firmaPaciente} 
                                                                    alt="Firma del Paciente" 
                                                                    className="max-h-24 w-auto object-contain signature-image invert dark:invert-0" 
                                                                    style={{ filter: 'var(--signature-filter, none)' }}
                                                                />
                                                            </div>
                                                            <div className="w-full border-t border-gray-200 dark:border-gray-700 mt-4 pt-3 text-center flex flex-col gap-0.5">
                                                                <span className="text-gray-600 dark:text-gray-400 text-xs font-semibold">Firma de Conformidad del Paciente</span>
                                                                <span className="text-gray-400 dark:text-gray-500 text-[10px] uppercase font-medium">Registrado el {formatDate(historiaWithSignature.fecha)}</span>
                                                            </div>
                                                        </div>
                                                        <style>{`
                                                            html.dark .signature-image { --signature-filter: invert(1) hue-rotate(180deg) brightness(1.5); }
                                                            html:not(.dark) .signature-image { --signature-filter: none; }
                                                        `}</style>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}

                                        <div className="flex gap-3 w-full justify-end">
                                            {!isReadOnly && (
                                                <button
                                                    onClick={handleSubmit}
                                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-xl flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md text-sm"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                                        <polyline points="7 3 7 8 15 8"></polyline>
                                                    </svg>
                                                    {proformaId ? 'Actualizar' : 'Guardar'}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onClose ? onClose() : navigate(`/pacientes/${id}/presupuestos`)}
                                                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2 text-sm"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                                {isReadOnly ? 'Volver' : 'Cancelar'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div >

            <ArancelForm
                isOpen={isArancelModalOpen}
                onClose={() => setIsArancelModalOpen(false)}
                onSaveSuccess={() => {
                    fetchAranceles();
                    setIsArancelModalOpen(false);
                }}
            />

            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual - Planes de Tratamiento"
                sections={manualSections}
            />
        </>
    );
};
export default PresupuestoForm;
