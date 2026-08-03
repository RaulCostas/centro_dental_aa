import api from '../services/api';
import { formatDate } from './dateUtils';
import { formatFullName, formatNumber } from './formatters';

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

export const generateOrdenTrabajoHTML = (trabajo: any, centroDental: any): string => {
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

    const selectedTeeth = trabajo?.pieza ? String(trabajo.pieza).split(',').map((s: string) => s.trim()).filter(Boolean) : [];

    const getImageUrl = (filename: string) => {
        if (!filename) return '';
        if (filename.startsWith('http')) return filename;
        const baseUrl = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : '';
        return `${baseUrl}/uploads/${filename}`;
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

    const activeList = trabajo.fase_laboratorio ? trabajo.fase_laboratorio.split(',').map((s: string) => s.trim()) : [];

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

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Orden de Trabajo Dental A&A-${String(trabajo.id).padStart(7, '0')}</title>
            <style>
                @page { size: A4 portrait; margin: 0; }
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
                .stg-item {
                    text-align: center;
                    font-size: 6.5pt;
                    font-weight: 800;
                    color: #64748b;
                    flex: 1;
                }
                .stg-item.active { color: #102a6b; font-weight: 900; }
                .stg-circle {
                    width: 12px; height: 12px; border-radius: 50%;
                    border: 1px solid #94a3b8; margin: 0 auto 1px auto;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 7px; background: #ffffff;
                }
                .stg-item.active .stg-circle {
                    background: #102a6b; border-color: #0f172a; color: #ffffff;
                }
                table { width: 100%; border-collapse: collapse; font-size: 7pt; }
                th, td { border: 1px solid #cbd5e1; padding: 1.5px 3px; text-align: left; }
                th { background: #f1f5f9; font-size: 6.5pt; text-transform: uppercase; font-weight: 800; }
                .sig-box {
                    border: 1px stroke #94a3b8; border-radius: 4px; border-style: dashed;
                    padding: 3px; text-align: center; font-size: 6.5pt; background: #ffffff;
                }
                .recipe-footer {
                    margin-top: 10px; text-align: center; font-size: 8pt; color: #555;
                    border-top: 1px solid #ddd; padding-top: 4px; width: 100%; page-break-inside: avoid;
                }
            </style>
        </head>
        <body>
            <div class="main-frame">
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

                <div style="display: grid; grid-template-columns: 1fr 1.1fr 1fr 0.9fr; gap: 3px; margin-bottom: 3px;">
                    <div class="box-border">
                        <div class="sec-banner">2. TIPO DE RESTAURACIÓN</div>
                        <div style="display: grid; grid-template-columns: 1fr; gap: 0.5px;">
                            ${restItems.map(item => chk(Boolean(d?.tipo_restauracion?.[item.key]), item.label)).join('')}
                        </div>
                    </div>

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

                    <div class="box-border">
                        <div class="sec-banner">4. MATERIAL SOLICITADO</div>
                        ${matItems.map(item => chk(Boolean(d?.material?.[item.key]), item.label)).join('')}
                        ${d?.material?.otro ? `<div style="font-size: 7pt; font-weight: bold; margin-top: 1px;">Otro: ${d.material.otro}</div>` : ''}
                    </div>

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

                <div style="display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 3px; margin-bottom: 3px;">
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

                <div style="display: grid; grid-template-columns: 1.3fr 1fr 0.8fr 1.1fr; gap: 3px; margin-bottom: 3px;">
                    <div class="box-border">
                        <div class="sec-banner">9. FASE DE LABORATORIO</div>
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

                    <div class="box-border">
                        <div class="sec-banner">10. PRUEBAS</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5px;">
                            ${pruebasItems.map(item => chk(Boolean(d?.pruebas?.[item.key]), item.label)).join('')}
                        </div>
                    </div>

                    <div class="box-border">
                        <div class="sec-banner">11. URGENCIA</div>
                        ${chk(d?.urgencia === 'Normal' || trabajo.estado === 'normal' || (!d?.urgencia && !trabajo.estado), 'Normal')}
                        ${chk(d?.urgencia === 'Prioritario' || trabajo.estado === 'prioritario', 'Prioritario')}
                        ${chk(d?.urgencia === 'Urgente 24 h' || trabajo.estado === 'urgente_24h', 'Urgente 24 h')}
                        ${chk(d?.urgencia === 'Express' || trabajo.estado === 'express', 'Express')}
                    </div>

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

                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 3px; margin-bottom: 3px;">
                    <div class="box-border">
                        <div class="sec-banner">13. OBSERVACIONES CLÍNICAS / INSTRUCCIONES ESPECIALES</div>
                        <div style="font-size: 7.5pt; min-height: 25px; border-bottom: 1px dashed #cbd5e1; margin-bottom: 2px;">
                            ${trabajo.observaciones || trabajo.observacion || ''}
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 2px; font-size: 6.5pt;">
                            <div>Línea Media: <span class="underline-field">___</span></div>
                            <div>Plano Oclusal: <span class="underline-field">___</span></div>
                            <div>Papilas: <span class="underline-field">___</span></div>
                            <div>Perfil Emergencia: <span class="underline-field">___</span></div>
                        </div>
                    </div>

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

                <div style="display: grid; grid-template-columns: 1.2fr 2fr; gap: 3px;">
                    <div class="box-border">
                        <div class="sec-banner">14. CONTROL DE CALIDAD</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5px;">
                            ${calItems.map(item => chk(Boolean(d?.control_calidad?.[item.key]), item.label)).join('')}
                        </div>
                        <div style="text-align: center; margin-top: 2px; font-weight: 900; color: #102a6b; font-size: 6.5pt;">
                            ★ CALIDAD A&A - EXCELENCIA GARANTIZADA ★
                        </div>
                    </div>

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
};
