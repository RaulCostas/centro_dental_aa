import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';
import Odontogram from './Odontogram';
import { Shield, Edit, Save, X, History, Clock, Printer, HelpCircle, RotateCcw, ClipboardList, ArrowLeft } from 'lucide-react';
import { formatDate, formatDateTime } from '../utils/dateUtils';
import ManualModal from './ManualModal';
import type { ManualSection } from './ManualModal';
import SingleTooth from './SingleTooth';
import { getFigureForConditionCode, getColorForSurfaceCode } from '../utils/odontogramMappings';

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

const getConditionLabel = (code: number) => {
    switch (code) {
        case 1: return 'Caries Dental';
        case 10: return 'Diente Ausente';
        case 11: return 'Indicado a Extracción';
        case 12: return 'Corona (B)';
        case 13: return 'Corona (M)';
        case 14: return 'Obturación (B)';
        case 15: return 'Obturación (M)';
        case 16: return 'Sellante (B)';
        case 17: return 'Sellante (M)';
        case 18: return 'Fractura';
        case 20: return 'Prótesis Fija (B)';
        case 21: return 'Prótesis Fija (M)';
        case 22: return 'Ortodoncia';
        case 23: return 'Lesión Cervical (B)';
        case 24: return 'Lesión Cervical (M)';
        default: return 'Tratamiento';
    }
};

const PacienteTabOdontograma: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [odontogramas, setOdontogramas] = useState<any[]>([]);
    const [selectedOdontoId, setSelectedOdontoId] = useState<number | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [odontogramData, setOdontogramData] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [showManual, setShowManual] = useState(false);
    const [pacienteData, setPacienteData] = useState<any>(null);

    // New states for interactive treatment plan creation
    const [aranceles, setAranceles] = useState<any[]>([]);
    const [treatmentPlanItems, setTreatmentPlanItems] = useState<any[]>([]);
    const [activeClickDetail, setActiveClickDetail] = useState<{ tooth: number, surface?: string } | null>(null);
    const [selectedCondition, setSelectedCondition] = useState<number>(0);
    const [selectedArancelId, setSelectedArancelId] = useState<number>(0);
    const [arancelSearch, setArancelSearch] = useState('');
    
    // Toolbox state
    const [activeTool, setActiveTool] = useState<{ code: number, isSurface: boolean } | null>(null);

    // Child dentition and Quick Add states
    const [dentitionType, setDentitionType] = useState<'adult' | 'child' | 'mixed'>('mixed');
    const [quickArancelId, setQuickArancelId] = useState<number>(0);
    const [quickTooth, setQuickTooth] = useState<number>(0);
    const [quickSurface, setQuickSurface] = useState<string>('');


    const fetchOdontogramas = async (forceLatest = false) => {
        if (!id) return;
        setLoading(true);
        try {
            const endpoint = `/odontogramas/paciente/${id}`;
            const response = await api.get(endpoint);
            const data = response.data;
            setOdontogramas(data);
            
            if (data.length > 0) {
                // If forceLatest or no selection yet, pick the newest one
                if (forceLatest || !selectedOdontoId) {
                    setSelectedOdontoId(data[0].id);
                    setOdontogramData(data[0].mapa_dientes || {});
                }
            }
        } catch (error) {
            console.error('Error fetching odontogramas:', error);
        } finally {
            setLoading(false);
        }
    };

    const manualOdontograma: ManualSection[] = [
        {
            title: 'Estados Dentales',
            content: 'Seleccione un estado clínico (ej. Caries, Diente Ausente) y luego haga clic en la pieza dental deseada para aplicarlo. Para superficies (O, M, D, V, L, P), haga clic en la zona específica del diente.'
        },
        {
            title: 'Prótesis y Ortodoncia',
            content: 'Estas opciones se marcan pieza por pieza. Si marca piezas contiguas, el sistema dibujará automáticamente una barra de conexión indicando el rango.'
        },
        {
            title: 'Evoluciones (Versiones)',
            content: 'Cada vez que guarda, se crea una nueva versión. Puede navegar por el historial usando el selector de versiones arriba a la derecha.'
        },
        {
            title: 'Impresión',
            content: 'Use el botón de la impresora para generar el reporte oficial para el seguro con los datos del paciente.'
        }
    ];



    const fetchPaciente = async () => {
        try {
            const endpoint = `/pacientes/${id}`;
            const res = await api.get(endpoint);
            setPacienteData(res.data);
        } catch (e) {
            console.error('Error fetching paciente data', e);
        }
    };

    const fetchAranceles = async () => {
        try {
            const response = await api.get('/arancel?limit=1000');
            setAranceles(response.data.data || []);
        } catch (error) {
            console.error('Error fetching aranceles:', error);
        }
    };

    const handlePrint = () => {
        const odontogramContainer = document.getElementById('odontogram-print-container');
        if (!odontogramContainer) {
            Swal.fire('Error', 'No se encontró el contenido del odontograma para imprimir', 'error');
            return;
        }

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (!doc) return;

        const getAge = () => {
            if (!pacienteData?.fecha_nacimiento) return '';
            const birthDate = new Date(pacienteData.fecha_nacimiento);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age;
        };
        const age = getAge();

        // Capture all styles from the current document
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map(style => style.outerHTML)
            .join('\n');

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Registro Odontograma - ${pacienteData?.nombre || ''}</title>
                ${styles}
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
                    @page { size: letter; margin: 0.5cm; }
                    body { font-family: 'Inter', sans-serif; margin: 0; padding: 10px; color: #333; font-size: 9px; background: white !important; line-height: 1.2; }
                    
                    .header-container { display: flex; align-items: start; justify-content: space-between; margin-bottom: 15px; }
                    .logo { width: 160px; height: auto; }
                    .header-text { text-align: center; flex-grow: 1; margin-right: 160px; padding-top: 40px; }
                    h1 { color: #1e40af; font-size: 18px; margin: 0 0 5px 0; text-transform: uppercase; font-weight: 800; }
                    h3 { font-size: 11px; margin: 0; color: #4b5563; font-weight: 600; }

                    .print-meta-header { display: flex; justify-content: flex-end; gap: 15px; margin-bottom: 10px; }
                    .print-box-group { display: flex; align-items: center; gap: 5px; }
                    .print-box-label { font-weight: 800; font-size: 7px; color: #64748b; }
                    .print-grid { display: flex; border: 1px solid #cbd5e1; height: 16px; border-radius: 2px; overflow: hidden; }
                    .print-cell { width: 14px; border-right: 1px solid #cbd5e1; height: 100%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 9px; background: #f8fafc; }
                    .print-cell:last-child { border-right: none; }
                    
                    .patient-info-banner { background: #f8fafc; border: 1.5px solid #e2e8f0; padding: 12px; border-radius: 10px; margin-bottom: 15px; position: relative; overflow: hidden; }
                    .patient-info-banner::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: #3b82f6; }
                    
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr 1.5fr 70px 60px; gap: 12px; }
                    .info-field { display: flex; flex-direction: column; }
                    .info-label { font-size: 7px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
                    .info-value { font-weight: 800; font-size: 11px; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; min-height: 14px; }
                    
                    .age-boxes { display: flex; gap: 1px; margin-top: 2px; }
                    .age-box { width: 18px; height: 20px; border: 1px solid #94a3b8; display: flex; align-items: center; justify-content: center; font-weight: 800; background: white; border-radius: 3px; font-size: 11px; }

                    .check-row { display: flex; justify-content: center; gap: 40px; margin-top: 12px; padding-top: 10px; border-top: 1px dashed #e2e8f0; }
                    .check-item { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 9px; color: #334155; }
                    .check-square { width: 16px; height: 16px; border: 1.5px solid #3b82f6; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: white; color: #3b82f6; font-size: 11px; }
                    
                    .odontogram-section { margin-top: 10px; padding: 10px; border: 1px solid #f1f5f9; border-radius: 12px; display: flex; flex-direction: column; align-items: center; zoom: 0.75; }
                    
                    .legend-section { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 15px; padding: 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; }
                    .legend-column { display: flex; flex-direction: column; gap: 6px; }
                    .legend-item { display: flex; align-items: center; gap: 8px; font-size: 8.5px; font-weight: 600; color: #475569; }
                    .legend-symbol { width: 16px; height: 16px; border: 1px solid #94a3b8; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 10px; flex-shrink: 0; background: #f8fafc; }
                    
                    .print-footer { margin-top: 100px; display: flex; justify-content: space-between; align-items: flex-end; padding: 0 20px; }
                    .signature-box { text-align: center; width: 220px; }
                    .signature-line { border-top: 1.5px solid #0f172a; margin-bottom: 5px; }
                    .signature-label { font-weight: 800; font-size: 9px; color: #0f172a; text-transform: uppercase; }
                    .date-place { font-weight: 700; font-size: 9px; color: #475569; }
                    
                    svg { display: block !important; max-width: 100% !important; height: auto !important; }
                    .dark { background: white !important; color: #333 !important; }
                    button, .no-print, select, .lucide, .mt-6.p-4 { display: none !important; }
                </style>
            </head>
            <body>
                <div class="header-container">
                    <img src="/logo-clinica-dental.jpg" class="logo" />
                    <div class="header-text">
                        <h1>REGISTRO DE ODONTOGRAMA CLÍNICO</h1>
                        <h3>Dr. Ivan Alvaro Lima Huanca</h3>
                    </div>
                </div>

                <div class="print-meta-header">
                    <div class="print-box-group">
                        <span class="print-box-label">C.I.</span>
                        <div class="print-grid">
                            ${(pacienteData?.ci || '').split('').map((char: string) => `<div class="print-cell">${char}</div>`).join('')}
                        </div>
                    </div>
                </div>

                <div class="patient-info-banner">
                    <div class="info-grid">
                        <div class="info-field">
                            <span class="info-label">Apellido Paterno</span>
                            <div class="info-value">${pacienteData?.paterno?.toUpperCase() || ''}</div>
                        </div>
                        <div class="info-field">
                            <span class="info-label">Apellido Materno</span>
                            <div class="info-value">${pacienteData?.materno?.toUpperCase() || ''}</div>
                        </div>
                        <div class="info-field">
                            <span class="info-label">Nombres del Paciente</span>
                            <div class="info-value">${pacienteData?.nombre?.toUpperCase() || ''}</div>
                        </div>
                        <div class="info-field" style="align-items: center;">
                            <span class="info-label">Edad</span>
                            <div class="age-boxes">
                                <div class="age-box">${String(age).padStart(2, '0')[0] || ''}</div>
                                <div class="age-box">${String(age).padStart(2, '0')[1] || ''}</div>
                            </div>
                        </div>
                        <div class="info-field">
                            <span class="info-label" style="text-align: center;">Sexo</span>
                            <div class="info-value" style="text-align: center;">
                                ${(() => {
                                    const g = pacienteData?.genero?.toUpperCase() || '';
                                    if (g.startsWith('MASC') || g === 'M' || g === 'HOMBRE') return 'M';
                                    if (g.startsWith('FEME') || g === 'F' || g === 'MUJER') return 'F';
                                    return g.charAt(0);
                                })()}
                            </div>
                        </div>
                    </div>

                    <!-- No check-row for insurance -->
                </div>

                <div class="odontogram-section">
                    ${odontogramContainer.innerHTML}
                </div>

                <div class="legend-section">
                    <div class="legend-column">
                        <div class="legend-item"><div class="legend-symbol" style="border-color: #3b82f6; color: #3b82f6;">✕</div> <span>DIENTE AUSENTE</span></div>
                        <div class="legend-item"><div class="legend-symbol" style="border-color: #2563eb; color: #2563eb;">◯</div> <span>CORONA BUEN ESTADO</span></div>
                        <div class="legend-item"><div class="legend-symbol" style="border-color: #2563eb; background: #2563eb; color: white;">●</div> <span>OBTURACIÓN BUEN ESTADO</span></div>
                        <div class="legend-item"><div class="legend-symbol" style="border-color: #1e40af; background: #dbeafe; color: #1e40af;">▭</div> <span>PRÓTESIS FIJA (B)</span></div>
                        <div class="legend-item"><div class="legend-symbol" style="border-color: #2563eb; color: #2563eb; font-size: 7px;">SFF</div> <span>SELLANTE (B)</span></div>
                        <div class="legend-item"><div class="legend-symbol" style="border-color: #4f46e5; background: #eef2ff; color: #4f46e5;">⬓</div> <span>ORTODONCIA</span></div>
                        <div class="legend-item"><div class="legend-symbol" style="border-color: #2563eb; background: #dbeafe; color: #2563eb;">▬</div> <span>LESIÓN CERVICAL NO CARIOSA (B)</span></div>
                    </div>
                    
                    <div class="legend-column">
                        <div class="legend-item"><div class="legend-symbol" style="border-color: #ef4444; color: #ef4444;">✕</div> <span>INDICADO A EXTRACCIÓN</span></div>
                        <div class="legend-item"><div class="legend-symbol" style="border-color: #dc2626; color: #dc2626;">◯</div> <span>CORONA MAL ESTADO</span></div>
                        <div class="legend-item"><div class="legend-symbol" style="border-color: #dc2626; background: #dc2626; color: white;">●</div> <span>OBTURACIÓN MAL ESTADO</span></div>
                        <div class="legend-item"><div class="legend-symbol" style="border-color: #991b1b; background: #fee2e2; color: #991b1b;">▭</div> <span>PRÓTESIS FIJA (M)</span></div>
                        <div class="legend-item"><div class="legend-symbol" style="border-color: #dc2626; color: #dc2626; font-size: 7px;">SFF</div> <span>SELLANTE (M)</span></div>
                        <div class="legend-item"><div class="legend-symbol" style="border-color: #dc2626; color: #dc2626;">⚡</div> <span>FRACTURA CORONARIA</span></div>
                        <div class="legend-item"><div class="legend-symbol" style="border-color: #dc2626; background: #fee2e2; color: #dc2626;">▬</div> <span>LESIÓN CERVICAL NO CARIOSA (M)</span></div>
                        <div class="legend-item"><div class="legend-symbol" style="border-color: #dc2626; background: #dc2626; color: white;">●</div> <span>CARIES DENTAL (SE MARCA LA SUPERFICIE AFECTADA)</span></div>
                    </div>
                </div>
                
                <div class="print-footer">
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div class="signature-label">Sello y firma del médico tratante</div>
                    </div>
                    <div class="date-place">
                        Lugar y fecha: ............................................................ / .......... / .......... / .................
                    </div>
                </div>
            </body>
            </html>
        `;

        doc.open();
        doc.write(printContent);
        doc.close();

        // Wait for styles and images to load in the iframe
        setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 500);
        }, 1200);
    };
    useEffect(() => {
        fetchOdontogramas();
        fetchPaciente();
        fetchAranceles();
    }, [id]);

    const handleSelectSurface = (tooth: number, surface: string) => {
        if (!isEditing) return;
        if (activeTool) {
            applyDirectTreatment(tooth, surface);
            return;
        }
        setActiveClickDetail({ tooth, surface });
        setSelectedCondition(0);
        setSelectedArancelId(0);
        setArancelSearch('');
    };

    const handleSelectTooth = (tooth: number) => {
        if (!isEditing) return;
        if (activeTool) {
            applyDirectTreatment(tooth, undefined);
            return;
        }
        setActiveClickDetail({ tooth });
        setSelectedCondition(0);
        setSelectedArancelId(0);
        setArancelSearch('');
    };

    const applyDirectTreatment = (tooth: number, surface?: string) => {
        if (!activeTool) return;
        const newMap = JSON.parse(JSON.stringify(odontogramData));
        
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
            // We could also try removing from treatmentPlanItems, but let's keep it simple
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
        setOdontogramData(newMap);
    };

    const handleApplyTreatment = () => {
        if (!activeClickDetail) return;
        const { tooth, surface } = activeClickDetail;
        
        // If condition is chosen, update odontogram local data
        const newMap = JSON.parse(JSON.stringify(odontogramData));
        
        if (selectedCondition !== 0) {
            if (surface) {
                if (!newMap[tooth]) newMap[tooth] = { state: 0, surfaces: {} };
                newMap[tooth].surfaces[surface] = selectedCondition;
            } else {
                if (!newMap[tooth]) newMap[tooth] = { state: 0, surfaces: {} };
                
                if ([20, 21, 22].includes(selectedCondition)) {
                    newMap[tooth].connectionType = selectedCondition;
                } else {
                    newMap[tooth].state = selectedCondition;
                }
            }
        }

        // If arancel is selected, append to treatment plan items list
        if (selectedArancelId !== 0) {
            const arancel = aranceles.find(a => a.id === selectedArancelId);
            if (arancel) {
                const piecesStr = surface ? `${tooth} (${surface})` : `${tooth}`;
                
                const exists = treatmentPlanItems.some(item => Number(item.tooth) === tooth && item.surface === surface && item.arancelId === arancel.id);
                if (exists) {
                    Swal.fire({
                        icon: 'info',
                        title: 'Ya existe',
                        text: 'Este tratamiento ya se encuentra en el plan para esta pieza/superficie.',
                        background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                        color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                    });
                } else {
                    const newPlanItem = {
                        arancelId: arancel.id,
                        codigo: arancel.id.toString(),
                        tratamiento: arancel.detalle,
                        precioUnitario: Number(arancel.precio),
                        piezas: piecesStr,
                        cantidad: 1,
                        total: Number(arancel.precio),
                        posible: false,
                        // Track source tooth/surface to clean up if item is removed
                        tooth,
                        surface
                    };
                    setTreatmentPlanItems([...treatmentPlanItems, newPlanItem]);
                }
            }
        }

        setOdontogramData(newMap);
        setActiveClickDetail(null);
    };

    const handleClearTreatment = () => {
        if (!activeClickDetail) return;
        const { tooth, surface } = activeClickDetail;
        const newMap = JSON.parse(JSON.stringify(odontogramData));

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

        // Remove from plan table as well
        const filteredItems = treatmentPlanItems.filter(item => !(item.tooth === tooth && item.surface === surface));
        setTreatmentPlanItems(filteredItems);

        setOdontogramData(newMap);
        setActiveClickDetail(null);
    };

    const handleRemovePlanItem = (index: number) => {
        const item = treatmentPlanItems[index];
        const newMap = JSON.parse(JSON.stringify(odontogramData));
        
        // Clean matching mark from odontogram
        if (item.surface) {
            if (newMap[item.tooth] && newMap[item.tooth].surfaces) {
                delete newMap[item.tooth].surfaces[item.surface];
            }
        } else {
            if (newMap[item.tooth]) {
                delete newMap[item.tooth].connectionType;
                newMap[item.tooth].state = 0;
            }
        }

        const updated = [...treatmentPlanItems];
        updated.splice(index, 1);
        setTreatmentPlanItems(updated);
        setOdontogramData(newMap);
    };

    const handleQuickAddPlanItem = () => {
        if (quickArancelId === 0) {
            Swal.fire({
                icon: 'error',
                title: 'Tratamiento Requerido',
                text: 'Por favor seleccione un tratamiento.',
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
            return;
        }
        if (quickTooth === 0) {
            Swal.fire({
                icon: 'error',
                title: 'Pieza Dental Requerida',
                text: 'Por favor seleccione una pieza dental.',
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
            return;
        }

        const arancel = aranceles.find(a => a.id === quickArancelId);
        if (arancel) {
            const piecesStr = quickSurface ? `${quickTooth} (${quickSurface})` : `${quickTooth}`;
            
            const exists = treatmentPlanItems.some(item => Number(item.tooth) === quickTooth && item.surface === quickSurface && item.arancelId === quickArancelId);
            if (exists) {
                Swal.fire({
                    icon: 'info',
                    title: 'Ya agregado',
                    text: 'Este tratamiento ya se encuentra en el plan para esta pieza/superficie.',
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });
                return;
            }

            const newPlanItem = {
                arancelId: arancel.id,
                codigo: arancel.id.toString(),
                tratamiento: arancel.detalle,
                precioUnitario: Number(arancel.precio),
                piezas: piecesStr,
                cantidad: 1,
                total: Number(arancel.precio),
                posible: false,
                tooth: quickTooth,
                surface: quickSurface
            };

            setTreatmentPlanItems([...treatmentPlanItems, newPlanItem]);
            
            setQuickArancelId(0);
            setQuickTooth(0);
            setQuickSurface('');
        }
    };

    const handleSave = async () => {
        // Find current version to compare
        const currentVersion = odontogramas.find(o => o.id === selectedOdontoId);
        const currentMapStr = JSON.stringify(currentVersion?.mapa_dientes || {});
        const newMapStr = JSON.stringify(odontogramData || {});

        if (currentMapStr === newMapStr && treatmentPlanItems.length === 0) {
            Swal.fire({
                icon: 'info',
                title: 'Sin cambios',
                text: 'No se detectaron modificaciones en el odontograma.',
                timer: 2000,
                showConfirmButton: false
            });
            setIsEditing(false);
            return;
        }

        const result = await Swal.fire({
            title: '¿Guardar evolución?',
            text: "Se registrará el estado actual del odontograma.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, guardar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                // Get current user ID from local storage
                const userStr = localStorage.getItem('user');
                let usuarioId = null;
                if (userStr) {
                    try {
                        const user = JSON.parse(userStr);
                        usuarioId = user.id;
                    } catch (e) {
                        console.error('Error parsing user data', e);
                    }
                }

                // 1. Save odontograma
                const payloadOdonto = {
                    pacienteId: Number(id),
                    mapa_dientes: odontogramData,
                    notas: 'Evolución registrada interactiva',
                    usuarioId: usuarioId ? Number(usuarioId) : undefined
                };
                await api.post('/odontogramas', payloadOdonto);

                // 2. Ask to save treatment plan if there are items
                if (treatmentPlanItems.length > 0) {
                    const savePlan = await Swal.fire({
                        title: '¿Generar plan de tratamiento?',
                        text: `Se agregaron ${treatmentPlanItems.length} tratamientos en la consulta. ¿Deseas crear el presupuesto/plan de tratamiento automáticamente?`,
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonColor: '#10b981',
                        cancelButtonColor: '#6b7280',
                        confirmButtonText: 'Sí, crear plan',
                        cancelButtonText: 'No, solo guardar odontograma'
                    });

                    if (savePlan.isConfirmed) {
                        const totalPlan = treatmentPlanItems.reduce((sum, item) => sum + item.total, 0);
                        const payloadProforma = {
                            pacienteId: Number(id),
                            usuarioId: usuarioId ? Number(usuarioId) : 1,
                            nota: 'Plan de tratamiento generado automáticamente desde el odontograma',
                            fecha: new Date().toISOString(),
                            sub_total: totalPlan,
                            descuento: 0,
                            total: totalPlan,
                            detalles: treatmentPlanItems.map(item => ({
                                arancelId: item.arancelId,
                                precioUnitario: item.precioUnitario,
                                piezas: item.piezas,
                                cantidad: item.cantidad,
                                total: item.total,
                                posible: item.posible
                            }))
                        };
                        await api.post('/proformas', payloadProforma);
                    }
                }

                setIsEditing(false);
                setTreatmentPlanItems([]);
                await fetchOdontogramas(true);
                Swal.fire({
                    icon: 'success',
                    title: '¡Guardado!',
                    text: 'El odontograma y el historial médico se han actualizado.',
                    timer: 2000,
                    showConfirmButton: false
                });
            } catch (error) {
                console.error('Error saving:', error);
                Swal.fire('Error', 'No se pudo guardar la evolución o el plan de tratamiento.', 'error');
            }
        }
    };

    const handleSelectVersion = (odontoId: number) => {
        const selected = odontogramas.find(o => o.id === odontoId);
        if (selected) {
            setSelectedOdontoId(odontoId);
            setOdontogramData(selected.mapa_dientes || {});
            setIsEditing(false);
        }
    };

    if (loading && odontogramas.length === 0) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="content-card bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6 transition-colors">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex flex-col">
                    <h2 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                        <Shield className="text-blue-500" size={28} />
                        Odontograma Clínico
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión del estado dental del paciente</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        {!isEditing ? (
                            <>
                                <button
                                    onClick={() => setShowManual(true)}
                                    className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[35px] h-[35px] text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all transform hover:-translate-y-0.5 active:scale-90"
                                    title="Ayuda / Manual"
                                >
                                    ?
                                </button>
                                <button
                                    onClick={handlePrint}
                                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-md transform hover:-translate-y-0.5 active:scale-95"
                                >
                                    <Printer size={18} />
                                    <span className="hidden sm:inline">Imprimir</span>
                                </button>

                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-2 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg transform hover:-translate-y-0.5 active:scale-95 bg-blue-600 hover:bg-blue-700"
                                >
                                    <Edit size={18} /> 
                                    {odontogramas.length > 0 ? 'Actualizar Odontograma' : 'Registrar Odontograma'}
                                </button>
                            </>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSave}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center gap-2"
                                >
                                    <Save size={18} /> Guardar Evolución
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        if (selectedOdontoId) handleSelectVersion(selectedOdontoId);
                                    }}
                                    className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center gap-2"
                                >
                                    <X size={18} /> Cancelar
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center mt-3 gap-4 border-t border-gray-100 dark:border-gray-700/50 pt-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                        Historial de evolución dental y tratamientos realizados
                    </p>

                    {odontogramas.length > 0 && !isEditing && (
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 p-1.5 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
                                <Clock size={16} className="text-gray-400 ml-2" />
                                <select
                                    className="bg-transparent border-none text-sm font-bold text-gray-700 dark:text-gray-200 focus:ring-0 cursor-pointer"
                                    value={selectedOdontoId || ''}
                                    onChange={(e) => handleSelectVersion(Number(e.target.value))}
                                >
                                    {odontogramas.map((o, idx) => (
                                        <option key={o.id} value={o.id}>
                                            {idx === 0 ? 'Última Versión' : `Versión ${formatDateTime(o.fecha)}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={() => handleSelectVersion(odontogramas[0].id)}
                                className="p-2.5 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm transition-all transform hover:-translate-y-0.5 active:scale-95 hover:shadow-md"
                                title="Volver a la Última Versión"
                            >
                                <History size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className={`mb-4 p-4 bg-white dark:bg-gray-800 rounded-xl border-2 shadow-sm transition-all ${
                isEditing 
                    ? 'border-blue-100 dark:border-blue-900/50 opacity-100' 
                    : 'border-gray-100 dark:border-gray-800 opacity-50 pointer-events-none'
            }`}>
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Edit size={16} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 dark:text-white text-sm uppercase">Caja de Herramientas</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Selecciona una herramienta y haz clic en los dientes</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setActiveTool({ code: 0, isSurface: false })}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                activeTool?.code === 0 ? 'bg-red-500 text-white shadow-md' : 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400'
                            }`}
                        >
                            <X size={16} /> {activeTool?.code === 0 ? 'Desactivar Borrador' : 'Borrar / Limpiar'}
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">Diente Completo</span>
                            <div className="flex flex-wrap gap-2">
                                {TOOTH_CONDITIONS.map(cond => (
                                    <button
                                        key={cond.code}
                                        onClick={() => setActiveTool({ code: cond.code, isSurface: false })}
                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                                            activeTool?.code === cond.code && !activeTool.isSurface
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-md transform scale-105'
                                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                                        }`}
                                    >
                                        {cond.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">Superficies (Caras)</span>
                            <div className="flex flex-wrap gap-2">
                                {SURFACE_CONDITIONS.map(cond => (
                                    <button
                                        key={cond.code}
                                        onClick={() => setActiveTool({ code: cond.code, isSurface: true })}
                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                                            activeTool?.code === cond.code && activeTool.isSurface
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-md transform scale-105'
                                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                                        }`}
                                    >
                                        {cond.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

            <div className={`transition-all duration-300 ${!isEditing ? 'pointer-events-none opacity-95' : 'ring-2 ring-blue-500/20 rounded-2xl p-1'} ${activeTool ? 'cursor-crosshair' : ''}`}>
                <Odontogram
                    initialData={odontogramData}
                    onChange={(data) => setOdontogramData(data)}
                    readOnly={!isEditing}
                    onSelectSurface={handleSelectSurface}
                    onSelectTooth={handleSelectTooth}
                    dentitionType={dentitionType}
                    treatmentPlanItems={treatmentPlanItems}
                    aranceles={aranceles}
                />
            </div>

            {/* Selection Modal */}
            {activeClickDetail && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 overflow-hidden transform transition-all animate-fade-in-down">
                        {/* Header */}
                        <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center">
                            <h3 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-wide">
                                Pieza {activeClickDetail.tooth} {activeClickDetail.surface ? `- Cara ${{ O: 'Oclusal', V: 'Vestibular', M: 'Mesial', D: 'Distal', L: 'Lingual/Palatino', C: 'Cervical' }[activeClickDetail.surface] || activeClickDetail.surface}` : '- Diente Completo'}
                            </h3>
                            <button 
                                onClick={() => setActiveClickDetail(null)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* 1. Select Condition */}
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-2">1. Diagnóstico / Condición Clínica</label>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                    {(activeClickDetail.surface ? SURFACE_CONDITIONS : TOOTH_CONDITIONS).map((cond) => {
                                        // Mock visual preview
                                        let mockFigures: any[] = [];
                                        let mockSurfaces: Record<string, string> = {};
                                        
                                        if (activeClickDetail.surface) {
                                            mockSurfaces[activeClickDetail.surface] = getColorForSurfaceCode(cond.code);
                                        } else {
                                            const fig = getFigureForConditionCode(cond.code);
                                            if (fig) mockFigures.push(fig);
                                        }

                                        return (
                                            <button
                                                key={cond.code}
                                                type="button"
                                                onClick={() => setSelectedCondition(cond.code)}
                                                className={`flex flex-col items-center gap-2 p-2 rounded-xl border transition-all ${
                                                    selectedCondition === cond.code 
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20' 
                                                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                                }`}
                                            >
                                                <div className="w-10 h-16 relative pointer-events-none flex items-center justify-center">
                                                    <SingleTooth
                                                        tooth={activeClickDetail.tooth}
                                                        activeFigures={mockFigures}
                                                        surfaceColors={mockSurfaces}
                                                        readOnly={true}
                                                        mode={activeClickDetail.surface ? "surfaces" : "anatomical"}
                                                        className={activeClickDetail.surface ? "w-10 h-10" : "w-10 h-16"}
                                                    />
                                                </div>
                                                <span className={`text-[10px] font-bold text-center leading-tight ${
                                                    selectedCondition === cond.code ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                                                }`}>
                                                    {cond.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 2. Select Procedure (Arancel) */}
                            {selectedCondition > 0 && (
                                <div className="pt-2 border-t border-gray-150 dark:border-gray-700/50">
                                    <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-2">2. Vincular Tratamiento (Plan)</label>
                                    
                                    {/* Search input */}
                                    <input
                                        type="text"
                                        placeholder="Buscar procedimiento..."
                                        value={arancelSearch}
                                        onChange={(e) => setArancelSearch(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-850 dark:text-white mb-2"
                                    />

                                    {/* List/Select */}
                                    <div className="relative">
                                        <select
                                            value={selectedArancelId}
                                            onChange={(e) => setSelectedArancelId(Number(e.target.value))}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white appearance-none"
                                        >
                                            <option value={0}>-- Sin Tratamiento Asociado --</option>
                                            {aranceles
                                                .filter(a => a.detalle.toLowerCase().includes(arancelSearch.toLowerCase()))
                                                .slice(0, 50)
                                                .map(a => (
                                                    <option key={a.id} value={a.id}>
                                                        {a.detalle} - Bs. {Number(a.precio).toFixed(0)}
                                                    </option>
                                                ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-450">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>

                                    {selectedArancelId > 0 && (
                                        <div className="mt-2 text-right">
                                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                Precio: Bs. {Number(aranceles.find(a => a.id === selectedArancelId)?.precio || 0).toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={handleClearTreatment}
                                className="bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all"
                            >
                                Limpiar Cara/Pieza
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveClickDetail(null)}
                                className="bg-gray-250 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold px-4 py-2 rounded-xl text-xs transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={selectedCondition === 0}
                                onClick={handleApplyTreatment}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all disabled:cursor-not-allowed"
                            >
                                Aplicar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isEditing && (
                <>
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                            <Edit size={20} />
                        </div>
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                            <span className="font-bold">Modo Edición Activo:</span> Haz clic en las caras de los dientes o en las piezas para diagnosticar y vincular procedimientos clínicos directamente.
                        </p>
                    </div>

                    {/* Quick Add Treatment Form */}
                    <div className="mt-6 bg-gray-50 dark:bg-gray-900/20 p-5 rounded-2xl border border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-wider mb-4">Adición Rápida al Plan de Tratamiento</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                            {/* 1. Select Treatment */}
                            <div className="sm:col-span-2">
                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5">Procedimiento / Tratamiento</label>
                                <div className="relative">
                                    <select
                                        value={quickArancelId}
                                        onChange={(e) => setQuickArancelId(Number(e.target.value))}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white appearance-none"
                                    >
                                        <option value={0}>-- Seleccionar Tratamiento --</option>
                                        {aranceles.map(a => (
                                            <option key={a.id} value={a.id}>
                                                {a.detalle} - Bs. {Number(a.precio).toFixed(0)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* 2. Select Tooth Number */}
                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5">Pieza Dental</label>
                                <select
                                    value={quickTooth}
                                    onChange={(e) => setQuickTooth(Number(e.target.value))}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white appearance-none"
                                >
                                    <option value={0}>-- Seleccionar Pieza --</option>
                                    {[
                                        ...[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28,48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38],
                                        ...[55,54,53,52,51,61,62,63,64,65,85,84,83,82,81,71,72,73,74,75]
                                    ].map(num => (
                                        <option key={num} value={num}>Pieza {num}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 3. Select Surface */}
                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5">Superficie / Cara</label>
                                <select
                                    value={quickSurface}
                                    onChange={(e) => setQuickSurface(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white appearance-none"
                                >
                                    <option value="">Pieza Completa</option>
                                    <option value="V">Vestibular (V)</option>
                                    <option value="O">Oclusal (O)</option>
                                    <option value="L">Lingual / Palatino (L)</option>
                                    <option value="M">Mesial (M)</option>
                                    <option value="D">Distal (D)</option>
                                    <option value="P">Radicular / Periodontal (P)</option>
                                </select>
                            </div>

                            {/* 4. Add Button */}
                            <div className="sm:col-span-4 flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleQuickAddPlanItem}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all shadow-md transform hover:-translate-y-0.5"
                                >
                                    + Agregar al Plan de Tratamiento
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Real-time suggested Treatment Plan Table */}
                    <div className="mt-8 border-t border-gray-200 dark:border-gray-700/50 pt-6">
                        <h3 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                            <ClipboardList size={22} className="text-blue-500" />
                            Plan de Tratamiento Sugerido (Evolución Actual)
                        </h3>

                        {treatmentPlanItems.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/10">
                                <HelpCircle size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-xs font-bold uppercase tracking-wider">No se han registrado tratamientos en esta evolución.</p>
                                <p className="text-[10px] mt-1 text-gray-400">Haz clic sobre las caras o cuerpos de los dientes para agregar diagnósticos y vincular procedimientos.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 dark:text-gray-300 uppercase tracking-widest">Pieza / Cara</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 dark:text-gray-300 uppercase tracking-widest">Procedimiento Recomendado</th>
                                            <th className="px-4 py-3 text-right text-[10px] font-black text-gray-400 dark:text-gray-300 uppercase tracking-widest">Precio</th>
                                            <th className="px-4 py-3 text-center text-[10px] font-black text-gray-400 dark:text-gray-300 uppercase tracking-widest">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700/50">
                                        {treatmentPlanItems.map((item, index) => (
                                            <tr key={index} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/10 transition-colors">
                                                <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">
                                                    <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg text-xs font-black">
                                                        Pieza {item.piezas}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-850 dark:text-gray-200 font-medium">
                                                    {item.tratamiento}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right font-black text-gray-900 dark:text-white whitespace-nowrap">
                                                    Bs. {item.precioUnitario.toFixed(0)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemovePlanItem(index)}
                                                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1 transition-all"
                                                        title="Eliminar Tratamiento"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 dark:bg-gray-700/50 font-black">
                                        <tr>
                                            <td colSpan={2} className="px-4 py-3 text-right text-[10px] font-black text-gray-450 dark:text-gray-300 uppercase tracking-widest">
                                                Total Presupuestado:
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right text-emerald-600 dark:text-emerald-400 whitespace-nowrap font-black">
                                                Bs. {treatmentPlanItems.reduce((sum, item) => sum + item.total, 0).toFixed(0)}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual del Odontograma Clínico"
                sections={manualOdontograma}
            />
        </div>
    );
};

export default PacienteTabOdontograma;
