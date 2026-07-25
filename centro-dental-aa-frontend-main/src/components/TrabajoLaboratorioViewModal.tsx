import React, { useEffect, useState } from 'react';
import api from '../services/api';
import type { TrabajoLaboratorio, SeguimientoTrabajo } from '../types';
import { formatDate } from '../utils/dateUtils';
import { formatFullName, formatNumber } from '../utils/formatters';
import { Printer, X, Clock, User, Tag, Image as ImageIcon, FileText, CheckCircle2 } from 'lucide-react';
import LabToothArchDiagram from './LabToothArchDiagram';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    trabajoId: number | null;
}

const PROCESS_STAGES = [
    { key: 'Recepción', label: 'Recepción' },
    { key: 'Modelo', label: 'Modelo' },
    { key: 'Diseño', label: 'Diseño' },
    { key: 'Fresado', label: 'Fresado' },
    { key: 'Sinterizado', label: 'Sinterizado' },
    { key: 'Estratificación', label: 'Estratificación' },
    { key: 'Pulido', label: 'Pulido' },
    { key: 'Glaseado', label: 'Glaseado' },
    { key: 'Control', label: 'Control' },
    { key: 'Entregado', label: 'Entregado' },
];

const renderStageIcon = (key: string, active: boolean) => {
    const strokeColor = active ? '#ffffff' : '#64748b';
    const fillColor = active ? 'rgba(255,255,255,0.2)' : 'none';

    switch (key) {
        case 'Recepción':
            return (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth="1.8">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
            );
        case 'Modelo':
            return (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth="1.8">
                    <path d="M12 2C8 2 5 4 5 7v10c0 3 3 5 7 5s7-2 7-5V7c0-3-3-5-7-5z" />
                    <path d="M5 12c0 2.5 3 4 7 4s7-1.5 7-4" />
                </svg>
            );
        case 'Diseño':
            return (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth="1.8">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
            );
        case 'Fresado':
            return (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth="1.8">
                    <circle cx="12" cy="12" r="9" />
                    <line x1="12" y1="3" x2="12" y2="21" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                </svg>
            );
        case 'Sinterizado':
            return (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth="1.8">
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                </svg>
            );
        case 'Estratificación':
            return (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth="1.8">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                </svg>
            );
        case 'Pulido':
            return (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth="1.8">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
            );
        case 'Glaseado':
            return (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth="1.8">
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                </svg>
            );
        case 'Control':
            return (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth="1.8">
                    <polyline points="9 11 12 14 22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
            );
        case 'Entregado':
            return (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth="1.8">
                    <rect x="1" y="3" width="15" height="13" rx="2" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
            );
        default:
            return <CheckCircle2 className="w-5 h-5 text-current" />;
    }
};

const TrabajoLaboratorioViewModal: React.FC<Props> = ({ isOpen, onClose, trabajoId }) => {
    const [history, setHistory] = useState<SeguimientoTrabajo[]>([]);
    const [trabajo, setTrabajo] = useState<TrabajoLaboratorio | null>(null);
    const [centroDental, setCentroDental] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && trabajoId) {
            fetchData(trabajoId);
        } else {
            setHistory([]);
            setTrabajo(null);
            setCentroDental(null);
        }
    }, [isOpen, trabajoId]);

    const fetchData = async (id: number) => {
        try {
            setLoading(true);
            const [historyRes, workRes, centroRes] = await Promise.all([
                api.get<SeguimientoTrabajo[]>(`/seguimiento-trabajo?trabajoId=${id}`).catch(() => ({ data: [] })),
                api.get<TrabajoLaboratorio>(`/trabajos-laboratorios/${id}`).catch(() => ({ data: null })),
                api.get('/datos-centro-dental').catch(() => ({ data: [] }))
            ]);
            setHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
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

    const getActiveKeys = (obj: any) => {
        if (!obj || typeof obj !== 'object') return [];
        return Object.keys(obj).filter(k => obj[k] === true || (typeof obj[k] === 'string' && obj[k].trim() !== ''));
    };

    const generatePrintTeethArchSVG = (teethList: string[]) => {
        const teeth = [
            { id: '18', x: 38, y: 130 }, { id: '17', x: 40, y: 108 }, { id: '16', x: 44, y: 88 },  { id: '15', x: 52, y: 68 },
            { id: '14', x: 64, y: 50 },  { id: '13', x: 80, y: 36 },  { id: '12', x: 100, y: 24 }, { id: '11', x: 122, y: 18 },
            { id: '21', x: 148, y: 18 }, { id: '22', x: 170, y: 24 }, { id: '23', x: 190, y: 36 }, { id: '24', x: 206, y: 50 },
            { id: '25', x: 218, y: 68 }, { id: '26', x: 226, y: 88 }, { id: '27', x: 230, y: 108 }, { id: '28', x: 232, y: 130 },

            { id: '48', x: 38, y: 155 }, { id: '47', x: 40, y: 178 }, { id: '46', x: 44, y: 198 }, { id: '45', x: 52, y: 218 },
            { id: '44', x: 64, y: 236 }, { id: '43', x: 80, y: 250 }, { id: '42', x: 100, y: 262 }, { id: '41', x: 122, y: 268 },
            { id: '31', x: 148, y: 268 }, { id: '32', x: 170, y: 262 }, { id: '33', x: 190, y: 250 }, { id: '34', x: 206, y: 236 },
            { id: '35', x: 218, y: 218 }, { id: '36', x: 226, y: 198 }, { id: '37', x: 230, y: 178 }, { id: '38', x: 232, y: 155 },
        ];

        const elements = teeth.map(t => {
            const isSelected = teethList.includes(t.id);
            const circleStyle = isSelected ? 'stroke="#dc2626" stroke-width="1.8" fill="#fee2e2"' : 'stroke="#475569" stroke-width="0.8" fill="#ffffff"';
            const textStyle = isSelected ? 'fill="#dc2626" font-weight="bold"' : 'fill="#334155"';

            return `
                <g transform="translate(${t.x}, ${t.y})">
                    <circle cx="0" cy="0" r="7" ${circleStyle} />
                    <text x="0" y="2.5" text-anchor="middle" font-size="6" font-family="Arial" ${textStyle}>${t.id}</text>
                    ${isSelected ? `<line x1="-5.5" y1="-5.5" x2="5.5" y2="5.5" stroke="#dc2626" stroke-width="2" stroke-linecap="round"/><line x1="5.5" y1="-5.5" x2="-5.5" y2="5.5" stroke="#dc2626" stroke-width="2" stroke-linecap="round"/>` : ''}
                </g>
            `;
        }).join('');

        return `
            <svg viewBox="0 0 270 285" width="110" height="115">
                <path d="M 38,130 Q 135,5 232,130" fill="none" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="2,2" />
                <text x="135" y="75" text-anchor="middle" font-size="7.5" font-weight="bold" fill="#64748b" font-family="Arial">SUPERIOR</text>
                <path d="M 38,155 Q 135,280 232,155" fill="none" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="2,2" />
                <text x="135" y="210" text-anchor="middle" font-size="7.5" font-weight="bold" fill="#64748b" font-family="Arial">INFERIOR</text>
                ${elements}
            </svg>
        `;
    };

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

        const doc = iframe.contentWindow?.document;
        if (!doc) {
            document.body.removeChild(iframe);
            return;
        }

        const activeList = trabajo.fase_laboratorio ? trabajo.fase_laboratorio.split(',').map(s => s.trim()) : [];
        
        const chk = (isCheck: boolean, label: string) => `
            <div style="display: flex; align-items: center; gap: 3px; font-size: 7pt; margin-bottom: 1px; ${isCheck ? 'font-weight: bold; color: #0f172a;' : 'color: #475569;'}">
                <span style="display: inline-block; width: 8px; height: 8px; border: 1px solid ${isCheck ? '#102a6b' : '#94a3b8'}; background: ${isCheck ? '#102a6b' : '#ffffff'}; border-radius: 1.5px; text-align: center; line-height: 7px; font-size: 6px; color: #ffffff;">${isCheck ? '✓' : ''}</span>
                <span>${label}</span>
            </div>
        `;

        const restItems = [
            { key: 'corona', label: 'Corona' },
            { key: 'puente', label: 'Puente' },
            { key: 'carilla', label: 'Carilla' },
            { key: 'inlay', label: 'Inlay' },
            { key: 'onlay', label: 'Onlay' },
            { key: 'protesis_removible', label: 'Prótesis Parcial Removible' },
            { key: 'protesis_total', label: 'Prótesis Total' },
            { key: 'sobredentadura', label: 'Sobredentadura' },
            { key: 'barra_implantes', label: 'Barra sobre Implantes' },
            { key: 'hibrida_fija', label: 'Híbrida Fija' },
            { key: 'provisional', label: 'Provisional' },
            { key: 'ferula', label: 'Férula' },
            { key: 'guarda_oclusal', label: 'Guarda Oclusal' },
            { key: 'mock_up', label: 'Mock-up' },
            { key: 'encerado_diagnostico', label: 'Encerado Diagnóstico' },
            { key: 'guia_quirurgica', label: 'Guía Quirúrgica' },
        ];

        const matItems = [
            { key: 'zirconia_monolitica', label: 'Zirconia Monolítica' },
            { key: 'zirconia_estratificada', label: 'Zirconia Estratificada' },
            { key: 'disilicato_litio', label: 'Disilicato de Litio' },
            { key: 'feldespatica', label: 'Feldespática' },
            { key: 'metal_ceramica', label: 'Metal Cerámica' },
            { key: 'metal', label: 'Metal' },
            { key: 'pmma', label: 'PMMA' },
            { key: 'resina_cad_cam', label: 'Resina CAD/CAM' },
            { key: 'titanio', label: 'Titanio' },
            { key: 'cromo_cobalto', label: 'Cromo Cobalto' },
            { key: 'acrilico', label: 'Acrílico' },
        ];

        const pruebasItems = [
            { key: 'cera', label: 'Cera' },
            { key: 'metal', label: 'Metal' },
            { key: 'bizcocho', label: 'Bizcocho' },
            { key: 'pmma', label: 'PMMA' },
            { key: 'impresion', label: 'Impresión' },
            { key: 'escaneo', label: 'Escaneo' },
            { key: 'ajuste', label: 'Ajuste' },
            { key: 'oclusion', label: 'Oclusión' },
            { key: 'estetica', label: 'Estética' },
            { key: 'aprobado', label: 'Aprobado' },
            { key: 'otra', label: 'Otra' },
        ];

        const calItems = [
            { key: 'contactos_revisados', label: 'Contactos revisados' },
            { key: 'oclusion_revisada', label: 'Oclusión revisada' },
            { key: 'pulido', label: 'Pulido' },
            { key: 'ajuste_pasivo', label: 'Ajuste pasivo' },
            { key: 'torque_verificado', label: 'Torque verificado' },
            { key: 'radiografia_comprobada', label: 'Radiografía comprobada' },
            { key: 'esterilizado_desinfectado', label: 'Esterilizado / Desinfectado' },
        ];

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Orden de Trabajo Dental A&A-${String(trabajo.id).padStart(7, '0')}</title>
                <style>
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }
                    body {
                        font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
                        font-size: 7pt;
                        color: #0f172a;
                        line-height: 1.12;
                        margin: 0;
                        padding: 0.4cm 0.6cm;
                        background: #ffffff;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }

                    .main-frame {
                        border: 1.5px solid #102a6b;
                        border-radius: 6px;
                        padding: 5px;
                        box-sizing: border-box;
                    }

                    .hdr-table { width: 100%; border-bottom: 2px solid #102a6b; padding-bottom: 4px; margin-bottom: 3px; }
                    .hdr-title { font-size: 13pt; font-weight: 900; color: #102a6b; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; }
                    .hdr-sub { font-size: 7.5pt; font-weight: 800; color: #1e40af; letter-spacing: 0.3px; }

                    .order-box {
                        border: 1.5px solid #102a6b;
                        border-radius: 5px;
                        background: #f0f3ff;
                        padding: 2px 8px;
                        text-align: center;
                    }
                    .order-no { font-size: 11pt; font-weight: 900; color: #dc2626; }
                    
                    .pill-header {
                        background: #102a6b;
                        color: #ffffff;
                        font-size: 7.5pt;
                        font-weight: 800;
                        padding: 2px 8px;
                        border-radius: 10px;
                        display: inline-block;
                        text-transform: uppercase;
                        letter-spacing: 0.2px;
                        margin-bottom: 3px;
                    }

                    .sec-banner {
                        background: #102a6b;
                        color: #ffffff;
                        font-size: 7.5pt;
                        font-weight: 900;
                        padding: 1.5px 6px;
                        border-radius: 3px;
                        text-transform: uppercase;
                        margin-bottom: 3px;
                    }

                    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; }
                    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3px; }
                    .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 3px; }
                    .grid-5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 3px; }
                    
                    .box-border {
                        border: 1px solid #cbd5e1;
                        border-radius: 3px;
                        padding: 3px 4px;
                        background: #ffffff;
                    }

                    .underline-field {
                        border-bottom: 1px solid #94a3b8;
                        display: inline-block;
                        min-width: 40px;
                        font-weight: 700;
                        color: #0f172a;
                        padding-left: 2px;
                    }

                    .stages-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border: 1px solid #cbd5e1;
                        border-radius: 4px;
                        padding: 3px 5px;
                        background: #f8fafc;
                    }
                    .stg-item {
                        text-align: center;
                        font-size: 6.5pt;
                        font-weight: 800;
                        color: #64748b;
                        flex: 1;
                    }
                    .stg-item.active {
                        color: #102a6b;
                        font-weight: 900;
                    }
                    .stg-circle {
                        width: 12px;
                        height: 12px;
                        border-radius: 50%;
                        border: 1px solid #94a3b8;
                        margin: 0 auto 1px auto;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 7px;
                        background: #ffffff;
                    }
                    .stg-item.active .stg-circle {
                        background: #102a6b;
                        border-color: #0f172a;
                        color: #ffffff;
                    }

                    table { width: 100%; border-collapse: collapse; font-size: 7pt; }
                    th, td { border: 1px solid #cbd5e1; padding: 1.5px 3px; text-align: left; }
                    th { background: #f1f5f9; font-size: 6.5pt; text-transform: uppercase; font-weight: 800; }

                    .sig-box {
                        border: 1px stroke #94a3b8;
                        border-radius: 4px;
                        border-style: dashed;
                        padding: 3px;
                        text-align: center;
                        font-size: 6.5pt;
                        background: #ffffff;
                    }

                    .recipe-footer {
                        margin-top: 10px;
                        text-align: center;
                        font-size: 8pt;
                        color: #555;
                        border-top: 1px solid #ddd;
                        padding-top: 4px;
                        width: 100%;
                        page-break-inside: avoid;
                    }
                </style>
            </head>
            <body>
                <div class="main-frame">
                    <!-- TOP HEADER CON LOGO A LA IZQUIERDA Y TÍTULO AL CENTRO -->
                    <table class="hdr-table">
                        <tr>
                            <td style="border:none; width: 20%;">
                                <img src="/logo-clinica-dental.jpg" style="height: 46px; object-fit: contain;" onerror="this.style.display='none'" />
                            </td>
                            <td style="border:none; text-align: center; width: 60%;">
                                <div class="hdr-title">ORDEN DE TRABAJO LABORATORIO DENTAL</div>
                                <div class="hdr-sub">REHABILITACIÓN ORAL - IMPLANTOLOGÍA - ODONTOLOGÍA DIGITAL</div>
                            </td>
                            <td style="border:none; text-align: right; width: 20%;">
                                <div class="order-box">
                                    <div style="font-size: 6.5pt; font-weight: 800; color: #102a6b;">N° ORDEN</div>
                                    <div class="order-no">A&A-${String(trabajo.id).padStart(7, '0')}</div>
                                </div>
                            </td>
                        </tr>
                    </table>

                    <!-- 1. DATOS GENERALES DE LA ORDEN (COMO EN EL FORMULARIO DE REGISTRO) -->
                    <div class="pill-header">1. DATOS GENERALES DE LA ORDEN</div>
                    <div class="box-border" style="margin-bottom: 3px;">
                        <div style="display: grid; grid-template-columns: 1fr 1.2fr 1.3fr 1.2fr; gap: 4px; margin-bottom: 2px;">
                            <div><b>Fecha y Hora:</b> <span class="underline-field">${formatDate(trabajo.fecha)} ${trabajo.hora || ''}</span></div>
                            <div><b>Doctor Tratante:</b> <span class="underline-field">Dr. ${formatFullName(trabajo.doctor)}</span></div>
                            <div><b>Paciente:</b> <span class="underline-field">${formatFullName(trabajo.paciente)}</span></div>
                            <div><b>Laboratorio:</b> <span class="underline-field">${trabajo.laboratorio?.laboratorio || '-'}</span></div>
                        </div>
                        <div style="display: grid; grid-template-columns: 2fr 0.8fr 1fr; gap: 4px;">
                            <div><b>Trabajo Solicitado:</b> <span class="underline-field" style="width: 75%;">${trabajo.precioLaboratorio?.detalle || '-'}</span></div>
                            <div><b>Cantidad:</b> <span class="underline-field">${trabajo.cantidad} Unid.</span></div>
                            <div><b>Monto Total:</b> <span class="underline-field" style="color: #102a6b; font-weight: 900;">Bs. ${formatNumber(trabajo.total)}</span></div>
                        </div>
                    </div>

                    <!-- RECUADRO 4 COLUMNAS: 2. RESTAURACIÓN | 3. DIENTES | 4. MATERIAL | 5. COLOR -->
                    <div style="display: grid; grid-template-columns: 1fr 1.1fr 1fr 0.9fr; gap: 3px; margin-bottom: 3px;">
                        <!-- 2. TIPO RESTAURACIÓN -->
                        <div class="box-border">
                            <div class="sec-banner">2. TIPO DE RESTAURACIÓN</div>
                            <div style="display: grid; grid-template-columns: 1fr; gap: 0.5px;">
                                ${restItems.map(item => chk(Boolean(d?.tipo_restauracion?.[item.key]), item.label)).join('')}
                            </div>
                        </div>

                        <!-- 3. DIENTES INVOLUCRADOS -->
                        <div class="box-border" style="text-align: center;">
                            <div class="sec-banner">3. DIENTES INVOLUCRADOS</div>
                            <div style="font-size: 7.5pt; font-weight: bold; color: #dc2626; margin-bottom: 1px;">
                                Dientes: ${trabajo.pieza || '____'}
                            </div>
                            <div style="display: flex; justify-content: center; align-items: center;">
                                ${generatePrintTeethArchSVG(selectedTeeth)}
                            </div>
                            <div style="text-align: left; font-size: 6.5pt; border-t: 1px solid #e2e8f0; pt: 1px; margin-top: 1px;">
                                <div><b>Tipo de Preparación:</b></div>
                                ${['hombro', 'chaflan', 'vertical', 'bopt', 'chamfer_modificado', 'sin_preparacion'].map(k => chk(Boolean(d?.preparacion?.[k]), k.replace(/_/g, ' '))).join('')}
                                <div style="margin-top: 1px;"><b>Lado:</b></div>
                                ${['derecho', 'izquierdo', 'anterior', 'posterior'].map(k => chk(Boolean(d?.lado?.[k]), k)).join('')}
                            </div>
                        </div>

                        <!-- 4. MATERIAL SOLICITADO -->
                        <div class="box-border">
                            <div class="sec-banner">4. MATERIAL SOLICITADO</div>
                            ${matItems.map(item => chk(Boolean(d?.material?.[item.key]), item.label)).join('')}
                            ${d?.material?.otro ? `<div style="font-size: 7pt; font-weight: bold; margin-top: 1px;">Otro: ${d.material.otro}</div>` : ''}
                        </div>

                        <!-- 5. COLOR -->
                        <div class="box-border">
                            <div class="sec-banner">5. COLOR</div>
                            <div style="margin-bottom: 2px;">
                                <div><b>Color Principal:</b> <span class="underline-field">${trabajo.color || '____'}</span></div>
                                <div><b>Color Muñón:</b> <span class="underline-field">${d?.caracterizaciones?.color_munon || '____'}</span></div>
                            </div>
                            <div style="font-weight: bold; font-size: 6.5pt; margin-bottom: 1px;">Caracterizaciones:</div>
                            ${['cervical', 'incisal', 'halo', 'craquelado', 'opalescencia', 'fluorescencia'].map(k => chk(Boolean(d?.caracterizaciones?.[k]), k)).join('')}
                            <div style="margin-top: 2px; border-t: 1px dashed #cbd5e1; pt: 1px;">
                                ${chk(Boolean(d?.caracterizaciones?.fotografias_adjuntas), 'Fotografías adjuntas')}
                                ${chk(Boolean(d?.caracterizaciones?.escaneo_facial), 'Escaneo facial')}
                            </div>
                        </div>
                    </div>

                    <!-- RECUADRO 3 COLUMNAS: 6. OCLUSIÓN | 7. INFORMACIÓN DIGITAL | 8. IMPLANTOLOGÍA -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 3px; margin-bottom: 3px;">
                        <!-- 6. OCLUSIÓN -->
                        <div class="box-border">
                            <div class="sec-banner">6. OCLUSIÓN</div>
                            ${chk(Boolean(d?.oclusion?.mi), 'MI (Máxima Intercuspidación)')}
                            ${chk(Boolean(d?.oclusion?.rc), 'RC (Relación Céntrica)')}
                            ${chk(Boolean(d?.oclusion?.guia_canina), 'Guía Canina')}
                            ${chk(Boolean(d?.oclusion?.funcion_grupo), 'Función de Grupo')}
                            ${chk(Boolean(d?.oclusion?.mordida_abierta), 'Mordida Abierta')}
                            ${chk(Boolean(d?.oclusion?.mordida_cruzada), 'Mordida Cruzada')}
                            <div style="margin-top: 2px;">
                                <div>Sobremordida: <span class="underline-field">${d?.oclusion?.sobremordida_mm || '___'}</span> mm</div>
                                <div>Resalte: <span class="underline-field">${d?.oclusion?.resalte_mm || '___'}</span> mm</div>
                            </div>
                        </div>

                        <!-- 7. INFORMACIÓN DIGITAL -->
                        <div class="box-border">
                            <div class="sec-banner">7. INFORMACIÓN DIGITAL</div>
                            ${chk(Boolean(d?.digital?.escaneo_intraoral), 'Escaneo Intraoral')}
                            ${chk(Boolean(d?.digital?.stl || d?.digital?.ply || d?.digital?.dcm), 'STL / PLY / DCM')}
                            ${chk(Boolean(d?.digital?.cbct), 'CBCT')}
                            ${chk(Boolean(d?.digital?.fotografias), 'Fotografías')}
                            ${chk(Boolean(d?.digital?.diseno_exocad), 'Diseño Exocad')}
                            ${chk(Boolean(d?.digital?.diseno_3shape), 'Diseño 3Shape')}
                            ${chk(Boolean(d?.digital?.smile_design), 'Smile Design')}
                        </div>

                        <!-- 8. IMPLANTOLOGÍA -->
                        <div class="box-border">
                            <div class="sec-banner">8. IMPLANTOLOGÍA</div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px;">
                                <div>Sistema: <span class="underline-field">${d?.implantologia?.sistema || '____'}</span></div>
                                <div>Torque: <span class="underline-field">${d?.implantologia?.torque_ncm || '____'}</span> Ncm</div>
                                <div>Marca: <span class="underline-field">${d?.implantologia?.marca || '____'}</span></div>
                                <div>Diámetro: <span class="underline-field">${d?.implantologia?.diametro_mm || '____'}</span> mm</div>
                                <div>Longitud: <span class="underline-field">${d?.implantologia?.longitud_mm || '____'}</span> mm</div>
                                <div>Plataforma: <span class="underline-field">${d?.implantologia?.plataforma || '____'}</span></div>
                            </div>
                        </div>
                    </div>

                    <!-- FASES (2 FILAS), PRUEBAS, URGENCIA Y CONTROL DE TIEMPOS -->
                    <div style="display: grid; grid-template-columns: 1.3fr 1fr 0.8fr 1.1fr; gap: 3px; margin-bottom: 3px;">
                        <!-- 9. FASE DE LABORATORIO (2 FILAS) -->
                        <div class="box-border">
                            <div class="sec-banner">9. FASE DE LABORATORIO</div>
                            <!-- Fila 1: Recepción -> Modelo -> Diseño -> Fresado -> Sinterizado -> Estratificación -->
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                                ${PROCESS_STAGES.slice(0, 6).map(stg => {
                                    const isActive = activeList.includes(stg.key);
                                    return `
                                        <div class="stg-item ${isActive ? 'active' : ''}">
                                            <div class="stg-circle">${isActive ? '✓' : ''}</div>
                                            <div>${stg.label}</div>
                                        </div>
                                    `;
                                }).join('<div style="color: #cbd5e1; font-size: 5pt;">→</div>')}
                            </div>

                            <!-- Fila 2: Pulido -> Glaseado -> Control -> Entregado -->
                            <div style="display: flex; justify-content: space-around; align-items: center; padding-top: 2px; border-top: 1px dashed #cbd5e1;">
                                ${PROCESS_STAGES.slice(6).map(stg => {
                                    const isActive = activeList.includes(stg.key);
                                    return `
                                        <div class="stg-item ${isActive ? 'active' : ''}">
                                            <div class="stg-circle">${isActive ? '✓' : ''}</div>
                                            <div>${stg.label}</div>
                                        </div>
                                    `;
                                }).join('<div style="color: #cbd5e1; font-size: 5pt;">→</div>')}
                            </div>
                        </div>

                        <!-- 10. PRUEBAS -->
                        <div class="box-border">
                            <div class="sec-banner">10. PRUEBAS</div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5px;">
                                ${pruebasItems.map(item => chk(Boolean(d?.pruebas?.[item.key]), item.label)).join('')}
                            </div>
                        </div>

                        <!-- 11. URGENCIA -->
                        <div class="box-border">
                            <div class="sec-banner">11. URGENCIA</div>
                            ${chk(d?.urgencia === 'Normal' || trabajo.estado === 'normal' || (!d?.urgencia && !trabajo.estado), 'Normal')}
                            ${chk(d?.urgencia === 'Prioritario' || trabajo.estado === 'prioritario', 'Prioritario')}
                            ${chk(d?.urgencia === 'Urgente 24 h' || trabajo.estado === 'urgente_24h', 'Urgente 24 h')}
                            ${chk(d?.urgencia === 'Express' || trabajo.estado === 'express', 'Express')}
                        </div>

                        <!-- 12. CONTROL DE TIEMPOS -->
                        <div class="box-border">
                            <div class="sec-banner">12. CONTROL DE TIEMPOS</div>
                            <div style="font-size: 6.5pt;">
                                <div>Recepción: <span class="underline-field">${formatDate(trabajo.fecha)}</span></div>
                                <div>Prueba Est.: <span class="underline-field">${trabajo.fecha_prueba_estimada ? formatDate(trabajo.fecha_prueba_estimada) : '____'}</span></div>
                                <div>Entrega Est.: <span class="underline-field">${trabajo.fecha_pedido ? formatDate(trabajo.fecha_pedido) : '____'}</span></div>
                                <div>Entrega Real: <span class="underline-field">${trabajo.fecha_terminado ? formatDate(trabajo.fecha_terminado) : '____'}</span></div>
                            </div>
                        </div>
                    </div>

                    <!-- 13. OBSERVACIONES CLÍNICAS Y FOTOGRAFÍAS -->
                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 3px; margin-bottom: 3px;">
                        <!-- 13. OBSERVACIONES CLÍNICAS / INSTRUCCIONES ESPECIALES -->
                        <div class="box-border">
                            <div class="sec-banner">13. OBSERVACIONES CLÍNICAS / INSTRUCCIONES ESPECIALES</div>
                            <div style="font-size: 7.5pt; min-height: 25px; border-bottom: 1px dashed #cbd5e1; margin-bottom: 2px;">
                                ${trabajo.observacion || ''}
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 2px; font-size: 6.5pt;">
                                <div>Línea Media: <span class="underline-field">___</span></div>
                                <div>Plano Oclusal: <span class="underline-field">___</span></div>
                                <div>Papilas: <span class="underline-field">___</span></div>
                                <div>Perfil Emergencia: <span class="underline-field">___</span></div>
                            </div>
                        </div>

                        <!-- FOTOGRAFÍAS / REFERENCIAS -->
                        <div class="box-border">
                            <div class="sec-banner">FOTOGRAFÍAS / REFERENCIAS</div>
                            <div style="display: flex; gap: 3px; justify-content: center; align-items: center;">
                                ${photos.length > 0 ? photos.slice(0, 3).map(p => `
                                    <img src="${getImageUrl(p)}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 3px; border: 1px stroke #cbd5e1;" />
                                `).join('') : `
                                    <div style="width: 35px; height: 35px; border: 1px dashed #94a3b8; border-radius: 3px;"></div>
                                    <div style="width: 35px; height: 35px; border: 1px dashed #94a3b8; border-radius: 3px;"></div>
                                    <div style="width: 35px; height: 35px; border: 1px dashed #94a3b8; border-radius: 3px;"></div>
                                `}
                            </div>
                        </div>
                    </div>

                    <!-- 14. CONTROL DE CALIDAD Y 15. FIRMAS -->
                    <div style="display: grid; grid-template-columns: 1.2fr 2fr; gap: 3px;">
                        <!-- 14. CONTROL DE CALIDAD -->
                        <div class="box-border">
                            <div class="sec-banner">14. CONTROL DE CALIDAD</div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5px;">
                                ${calItems.map(item => chk(Boolean(d?.control_calidad?.[item.key]), item.label)).join('')}
                            </div>
                            <div style="text-align: center; margin-top: 2px; font-weight: 900; color: #102a6b; font-size: 6.5pt;">
                                ★ CALIDAD A&A - EXCELENCIA GARANTIZADA ★
                            </div>
                        </div>

                        <!-- 15. FIRMAS -->
                        <div class="box-border">
                            <div class="sec-banner">15. FIRMAS</div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 3px; margin-bottom: 2px;">
                                <div class="sig-box">Doctor<br/><br/>Fecha: __/__/____</div>
                                <div class="sig-box">Laboratorio<br/><br/>Fecha: __/__/____</div>
                                <div class="sig-box">Recepción<br/><br/>Fecha: __/__/____</div>
                                <div class="sig-box">Entrega<br/><br/>Fecha: __/__/____</div>
                            </div>
                            <div style="text-align: center; font-size: 6.5pt;">
                                Paciente (opcional): <span class="underline-field" style="width: 120px;"></span> Fecha: <span class="underline-field" style="width: 60px;"></span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- MISMO PIE DE PÁGINA QUE EL MÓDULO DE RECETAS -->
                ${centroDental ? `
                    <div class="recipe-footer">
                        ${centroDental.direccion ? `Dirección: ${centroDental.direccion} | ` : ''}
                        ${centroDental.telefono ? `Teléfono: ${centroDental.telefono} | ` : ''}
                        ${centroDental.celular ? `Celular: ${centroDental.celular} | ` : ''}
                        ${centroDental.emergencias ? `Emergencias: ${centroDental.emergencias} | ` : ''}
                        ${centroDental.email ? `Email: ${centroDental.email}` : ''}
                    </div>
                ` : ''}
            </body>
            </html>
        `;

        doc.open();
        doc.write(printContent);
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
                    
                    {/* Header sin botón de X */}
                    <div className="bg-gradient-to-r from-blue-900 to-indigo-950 px-6 py-4 flex items-center justify-between text-white">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-600/40 border border-blue-400/30 flex items-center justify-center font-black text-lg">
                                #{trabajoId}
                            </div>
                            <div>
                                <h3 className="text-base font-black tracking-wide uppercase">
                                    Detalle de Orden de Trabajo Dental
                                </h3>
                                <p className="text-xs text-blue-200">
                                    ID Registro: #{trabajoId} | Centro Dental A&A
                                </p>
                            </div>
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
                                    <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700 flex items-center gap-2">
                                        <User className="w-4 h-4 text-blue-600" />
                                        1. DATOS GENERALES DE LA ORDEN
                                    </h4>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-600">
                                            <span className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">N° Orden / ID</span>
                                            <span className="font-black text-blue-600 dark:text-blue-400 text-sm">#{trabajo.id}</span>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-600">
                                            <span className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">Fecha y Hora de Registro</span>
                                            <span className="font-bold text-gray-800 dark:text-white">{formatDate(trabajo.fecha)} {trabajo.hora || ''}</span>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-600">
                                            <span className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">Doctor Tratante</span>
                                            <span className="font-bold text-gray-800 dark:text-white">Dr. {formatFullName(trabajo.doctor)}</span>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-600">
                                            <span className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">Paciente</span>
                                            <span className="font-bold text-gray-800 dark:text-white">{formatFullName(trabajo.paciente)}</span>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-600">
                                            <span className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">Laboratorio Dental</span>
                                            <span className="font-bold text-gray-800 dark:text-white">{trabajo.laboratorio?.laboratorio || '-'}</span>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-600 sm:col-span-2">
                                            <span className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">Trabajo de Laboratorio</span>
                                            <span className="font-bold text-gray-800 dark:text-white">{trabajo.precioLaboratorio?.detalle || '-'}</span>
                                        </div>
                                        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                                            <div>
                                                <span className="block text-[10px] font-bold uppercase text-blue-600 dark:text-blue-300">Cantidad / Total</span>
                                                <span className="font-black text-blue-900 dark:text-blue-100 text-sm">{trabajo.cantidad} Unid. — Bs. {formatNumber(trabajo.total)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 2 & 3. TIPO RESTAURACIÓN Y DIENTES INVOLUCRADOS */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* 2. TIPO RESTAURACIÓN */}
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                                        <div>
                                            <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700 flex items-center gap-2">
                                                <Tag className="w-4 h-4 text-blue-600" />
                                                2. TIPO DE RESTAURACIÓN
                                            </h4>
                                            
                                            <div className="flex flex-wrap gap-1.5 mb-4">
                                                {getActiveKeys(d?.tipo_restauracion).length > 0 ? (
                                                    getActiveKeys(d?.tipo_restauracion).map(k => (
                                                        <span key={k} className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-xs font-bold rounded-lg border border-blue-200 dark:border-blue-800 capitalize">
                                                            {k.replace(/_/g, ' ')}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">No especificado</span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-gray-100 dark:border-gray-700">
                                                <div>
                                                    <span className="block font-bold text-gray-500 mb-0.5">Preparación:</span>
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200 capitalize">
                                                        {getActiveKeys(d?.preparacion).join(', ') || 'No especificada'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="block font-bold text-gray-500 mb-0.5">Lado:</span>
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200 capitalize">
                                                        {getActiveKeys(d?.lado).join(', ') || 'Ambos'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. DIENTES INVOLUCRADOS */}
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                                        <div>
                                            <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-2 border-b pb-1.5 border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                                <span>3. DIENTES INVOLUCRADOS</span>
                                                <span className="text-red-600 font-black text-xs bg-red-50 dark:bg-red-950 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-800">
                                                    Piezas: {selectedTeeth.join(', ') || 'Ninguna'}
                                                </span>
                                            </h4>
                                            
                                            <div className="transform scale-90 -my-4 flex justify-center pointer-events-none">
                                                <LabToothArchDiagram
                                                    selectedTeeth={selectedTeeth}
                                                    onToothToggle={() => {}}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 4 & 5 & 6. MATERIAL + COLOR + OCLUSIÓN */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* 4. MATERIAL SOLICITADO */}
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700">
                                            4. MATERIAL SOLICITADO
                                        </h4>
                                        <div className="flex flex-wrap gap-1.5 text-xs">
                                            {getActiveKeys(d?.material).length > 0 ? (
                                                getActiveKeys(d?.material).map(k => (
                                                    <span key={k} className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-bold rounded-lg border border-emerald-200 dark:border-emerald-800 capitalize">
                                                        {k === 'otro' ? `Otro: ${d?.material?.otro || ''}` : k.replace(/_/g, ' ')}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-gray-400 italic">No especificado</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* 5. COLOR Y CARACTERIZACIONES */}
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700">
                                            5. COLOR Y CARACTERIZACIONES
                                        </h4>
                                        <div className="space-y-2 text-xs">
                                            <div className="flex justify-between bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                                                <span className="font-bold text-gray-500">Color Principal:</span>
                                                <span className="font-black text-blue-600 dark:text-blue-400">{trabajo.color || 'No especificado'}</span>
                                            </div>
                                            <div className="flex justify-between bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                                                <span className="font-bold text-gray-500">Color Muñón:</span>
                                                <span className="font-bold text-gray-800 dark:text-white">{d?.caracterizaciones?.color_munon || '-'}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1 pt-1">
                                                {getActiveKeys(d?.caracterizaciones).filter(k => k !== 'color_munon').map(k => (
                                                    <span key={k} className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-[11px] font-semibold rounded border border-amber-200 dark:border-amber-800 capitalize">
                                                        {k.replace(/_/g, ' ')}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 6. OCLUSIÓN */}
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700">
                                            6. OCLUSIÓN
                                        </h4>
                                        <div className="space-y-1.5 text-xs">
                                            <div className="flex flex-wrap gap-1">
                                                {getActiveKeys(d?.oclusion).filter(k => !['sobremordida_mm', 'resalte_mm', 'observaciones'].includes(k)).map(k => (
                                                    <span key={k} className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950 text-purple-800 dark:text-purple-200 font-semibold rounded text-[11px] border border-purple-200 dark:border-purple-800 uppercase">
                                                        {k}
                                                    </span>
                                                ))}
                                            </div>
                                            {(d?.oclusion?.sobremordida_mm || d?.oclusion?.resalte_mm) && (
                                                <div className="text-[11px] text-gray-600 dark:text-gray-300 pt-1">
                                                    Sobremordida: <b>{d?.oclusion?.sobremordida_mm || '-'} mm</b> | Resalte: <b>{d?.oclusion?.resalte_mm || '-'} mm</b>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 7 & 8. INFORMACIÓN DIGITAL Y IMPLANTOLOGÍA */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* 7. INFORMACIÓN DIGITAL */}
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700">
                                            7. INFORMACIÓN DIGITAL
                                        </h4>
                                        <div className="flex flex-wrap gap-1.5 text-xs">
                                            {getActiveKeys(d?.digital).length > 0 ? (
                                                getActiveKeys(d?.digital).map(k => (
                                                    <span key={k} className="px-2.5 py-1 bg-cyan-50 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-200 font-bold rounded-lg border border-cyan-200 dark:border-cyan-800 uppercase">
                                                        {k === 'marca' ? `Marca: ${d?.digital?.marca || ''}` : k.replace(/_/g, ' ')}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-gray-400 italic">No especificado</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* 8. IMPLANTOLOGÍA */}
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700">
                                            8. IMPLANTOLOGÍA
                                        </h4>
                                        {d?.implantologia && (d.implantologia.sistema || d.implantologia.marca) ? (
                                            <div className="grid grid-cols-3 gap-2 text-xs">
                                                <div><span className="text-gray-400 text-[10px] uppercase font-bold block">Sistema</span><span className="font-bold">{d.implantologia.sistema || '-'}</span></div>
                                                <div><span className="text-gray-400 text-[10px] uppercase font-bold block">Marca</span><span className="font-bold">{d.implantologia.marca || '-'}</span></div>
                                                <div><span className="text-gray-400 text-[10px] uppercase font-bold block">Diámetro</span><span className="font-bold">{d.implantologia.diametro_mm || '-'} mm</span></div>
                                                <div><span className="text-gray-400 text-[10px] uppercase font-bold block">Longitud</span><span className="font-bold">{d.implantologia.longitud_mm || '-'} mm</span></div>
                                                <div><span className="text-gray-400 text-[10px] uppercase font-bold block">Plataforma</span><span className="font-bold">{d.implantologia.plataforma || '-'}</span></div>
                                                <div><span className="text-gray-400 text-[10px] uppercase font-bold block">Torque</span><span className="font-bold">{d.implantologia.torque_ncm || '-'} Ncm</span></div>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">No aplica</span>
                                        )}
                                    </div>
                                </div>

                                {/* 9. FASES DE LABORATORIO (PROCESO) */}
                                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-4 border-b pb-1.5 border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                        <span>9. FASES DE LABORATORIO (PROCESO DENTAL)</span>
                                        <span className="text-blue-600 font-bold text-xs bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                                            Fase Actual: {trabajo.fase_laboratorio || 'Registrado'}
                                        </span>
                                    </h4>

                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                        {PROCESS_STAGES.map((stg) => {
                                            const activeList = trabajo.fase_laboratorio ? trabajo.fase_laboratorio.split(',').map(s => s.trim()) : [];
                                            const isActive = activeList.includes(stg.key);
                                            return (
                                                <div
                                                    key={stg.key}
                                                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                                                        isActive
                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md font-bold'
                                                            : 'bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600'
                                                    }`}
                                                >
                                                    <div className={`p-2 rounded-lg ${isActive ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-600'}`}>
                                                        {renderStageIcon(stg.key, isActive)}
                                                    </div>
                                                    <span className="text-xs font-bold">{stg.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 10 & 11. PRUEBAS Y URGENCIA */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* 10. PRUEBAS */}
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700">
                                            10. PRUEBAS SOLICITADAS
                                        </h4>
                                        <div className="flex flex-wrap gap-1.5 text-xs">
                                            {getActiveKeys(d?.pruebas).length > 0 ? (
                                                getActiveKeys(d?.pruebas).map(k => (
                                                    <span key={k} className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 font-bold rounded-lg border border-indigo-200 dark:border-indigo-800 capitalize">
                                                        {k.replace(/_/g, ' ')}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-gray-400 italic">No especificado</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* 11. URGENCIA */}
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700">
                                            11. NIVEL DE URGENCIA
                                        </h4>
                                        <div className="text-xs">
                                            <span className={`px-3 py-1.5 inline-block font-black rounded-lg uppercase border ${
                                                trabajo.estado === 'urgente_24h' || trabajo.estado === 'express'
                                                    ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300'
                                                    : trabajo.estado === 'prioritario'
                                                    ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                                                    : 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300'
                                            }`}>
                                                {d?.urgencia || 'Normal'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* 10. FOTOGRAFÍAS / REFERENCIAS DE TRABAJO */}
                                {photos.length > 0 && (
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700 flex items-center gap-2">
                                            <ImageIcon className="w-4 h-4 text-blue-600" />
                                            10. FOTOGRAFÍAS / REFERENCIAS ADJUNTAS
                                        </h4>
                                        <div className="flex flex-wrap gap-3">
                                            {photos.map((photo, idx) => (
                                                <img
                                                    key={idx}
                                                    src={getImageUrl(photo)}
                                                    alt={`Referencia ${idx + 1}`}
                                                    onClick={() => setPreviewImage(getImageUrl(photo))}
                                                    className="w-24 h-24 object-cover rounded-xl border-2 border-gray-200 dark:border-gray-700 cursor-pointer hover:scale-105 transition-all shadow-sm"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 12. CONTROL DE TIEMPOS Y ESTADO */}
                                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-blue-600" />
                                        12. CONTROL DE TIEMPOS Y ESTADO DEL TRABAJO
                                    </h4>

                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                                        <div className="bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded-xl border">
                                            <span className="block text-[10px] font-bold text-gray-400 uppercase">Estado</span>
                                            <span className={`font-black uppercase text-xs ${trabajo.estado === 'terminado' ? 'text-green-600' : 'text-amber-600'}`}>
                                                {trabajo.estado}
                                            </span>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded-xl border">
                                            <span className="block text-[10px] font-bold text-gray-400 uppercase">Fecha Registro</span>
                                            <span className="font-bold">{formatDate(trabajo.fecha)}</span>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded-xl border">
                                            <span className="block text-[10px] font-bold text-gray-400 uppercase">Prueba Estimada</span>
                                            <span className="font-bold text-amber-600">{trabajo.fecha_prueba_estimada ? formatDate(trabajo.fecha_prueba_estimada) : '-'}</span>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded-xl border">
                                            <span className="block text-[10px] font-bold text-gray-400 uppercase">Entrega Estimada</span>
                                            <span className="font-bold text-blue-600">{trabajo.fecha_pedido ? formatDate(trabajo.fecha_pedido) : '-'}</span>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded-xl border">
                                            <span className="block text-[10px] font-bold text-gray-400 uppercase">Entrega Real</span>
                                            <span className="font-bold text-emerald-600">{trabajo.fecha_terminado ? formatDate(trabajo.fecha_terminado) : '-'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 13. OBSERVACIONES CLÍNICAS */}
                                {trabajo.observacion && (
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-2 border-b pb-1.5 border-gray-100 dark:border-gray-700 flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-blue-600" />
                                            13. OBSERVACIONES CLÍNICAS / INSTRUCCIONES ESPECIALES
                                        </h4>
                                        <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-line bg-gray-50 dark:bg-gray-700/40 p-3 rounded-xl border border-gray-100 dark:border-gray-600">
                                            {trabajo.observacion}
                                        </p>
                                    </div>
                                )}

                                {/* HISTORIAL DE SEGUIMIENTO */}
                                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-3 border-b pb-1.5 border-gray-100 dark:border-gray-700">
                                        HISTORIAL MOVIMIENTO DE SEGUIMIENTO
                                    </h4>
                                    {history.length === 0 ? (
                                        <p className="text-gray-400 italic text-xs text-center py-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                                            No hay movimientos registrados.
                                        </p>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            {history.map((item) => (
                                                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-600 text-xs">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`px-2.5 py-1 rounded-lg font-bold ${
                                                            item.envio_retorno === 'Envio' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' : 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                                                        }`}>
                                                            {item.envio_retorno}
                                                        </span>
                                                        <span className="text-gray-600 dark:text-gray-300">{item.observaciones || 'Sin observaciones'}</span>
                                                    </div>
                                                    <span className="font-bold text-gray-500">{formatDate(item.fecha)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-10 text-gray-500">
                                No se pudo cargar los detalles del trabajo seleccionados.
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
