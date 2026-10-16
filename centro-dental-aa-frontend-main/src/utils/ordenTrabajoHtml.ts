import api from '../services/api';
import { formatDate } from './dateUtils';
import { formatFullName, formatNumber } from './formatters';

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
            <svg viewBox="0 0 270 285" width="105" height="110">
                <path d="M 38,130 Q 135,5 232,130" fill="none" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="2,2" />
                <text x="135" y="75" text-anchor="middle" font-size="7.5" font-weight="bold" fill="#64748b" font-family="Arial">SUPERIOR</text>
                <path d="M 38,155 Q 135,280 232,155" fill="none" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="2,2" />
                <text x="135" y="210" text-anchor="middle" font-size="7.5" font-weight="bold" fill="#64748b" font-family="Arial">INFERIOR</text>
                ${elements}
            </svg>
        `;
    };

    const chk = (isCheck: boolean, label: string) => `
        <div style="display: flex; align-items: center; gap: 3px; font-size: 6.8pt; margin-bottom: 1.5px; ${isCheck ? 'font-weight: bold; color: #0f172a;' : 'color: #475569;'}">
            <span style="display: inline-block; width: 8.5px; height: 8.5px; border: 1px solid ${isCheck ? '#102a6b' : '#94a3b8'}; background: ${isCheck ? '#102a6b' : '#ffffff'}; border-radius: 2px; text-align: center; line-height: 8px; font-size: 6.5px; color: #ffffff; flex-shrink: 0;">${isCheck ? '✓' : ''}</span>
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${label}</span>
        </div>
    `;

    // 16 Restoration types exactly matching TrabajosLaboratoriosForm
    const restItems = [
        { key: 'corona', label: 'Corona' },
        { key: 'puente', label: 'Puente' },
        { key: 'carilla', label: 'Carilla' },
        { key: 'inlay', label: 'Inlay' },
        { key: 'onlay', label: 'Onlay' },
        { key: 'protesis_parcial', label: 'Prótesis Parcial Removible', altKey: 'protesis_removible' },
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

    // Pruebas items matching form
    const pruebasList = [
        { key: 'cera', label: 'Cera' },
        { key: 'metal', label: 'Metal' },
        { key: 'bizcocho', label: 'Bizcocho' },
        { key: 'oclusion', label: 'Oclusión' },
        { key: 'aprobado', label: 'Aprobado' },
    ];

    const urgenciaVal = d?.urgencia || 'Normal';

    // Fecha / Hora delivery and shipping
    const fechaEnvio = trabajo.fecha ? formatDate(trabajo.fecha) : '-';
    const horaEnvio = trabajo.hora_envio || d?.control_tiempos?.hora_envio || trabajo.hora || '-';
    const fechaEntrega = trabajo.fecha_pedido ? formatDate(trabajo.fecha_pedido) : '-';
    const horaEntrega = trabajo.hora_entrega || d?.control_tiempos?.hora_entrega || '-';

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8" />
            <title>Orden de Trabajo Dental A&A-${String(trabajo.id).padStart(7, '0')}</title>
            <style>
                @page { size: A4 portrait; margin: 0.4cm; }
                * { box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
                    font-size: 7pt;
                    color: #0f172a;
                    line-height: 1.15;
                    margin: 0;
                    padding: 0.3cm 0.4cm;
                    background: #ffffff;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .main-frame {
                    border: 1.5px solid #102a6b;
                    border-radius: 6px;
                    padding: 6px;
                }
                .hdr-table { width: 100%; border-bottom: 2px solid #102a6b; padding-bottom: 4px; margin-bottom: 4px; border-collapse: collapse; }
                .hdr-table td { border: none; }
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
                .sec-banner {
                    background: #102a6b;
                    color: #ffffff;
                    font-size: 7.2pt;
                    font-weight: 900;
                    padding: 2px 6px;
                    border-radius: 3px;
                    text-transform: uppercase;
                    margin-bottom: 3px;
                    letter-spacing: 0.3px;
                }
                .box-border {
                    border: 1px solid #cbd5e1;
                    border-radius: 4px;
                    padding: 4px 5px;
                    background: #ffffff;
                }
                .field-label { font-weight: 800; color: #475569; font-size: 6.8pt; }
                .field-val { font-weight: 700; color: #0f172a; }
                .underline-field {
                    border-bottom: 1px solid #94a3b8;
                    display: inline-block;
                    min-width: 40px;
                    font-weight: 700;
                    color: #0f172a;
                    padding-left: 2px;
                }
                .sig-box {
                    border: 1px dashed #94a3b8;
                    border-radius: 4px;
                    padding: 5px;
                    text-align: center;
                    font-size: 6.5pt;
                    background: #f8fafc;
                    min-height: 48px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }
                .recipe-footer {
                    margin-top: 6px; text-align: center; font-size: 7pt; color: #64748b;
                    border-top: 1px solid #e2e8f0; padding-top: 3px; width: 100%;
                }
            </style>
        </head>
        <body>
            <div class="main-frame">
                <!-- HEADER -->
                <table class="hdr-table">
                    <tr>
                        <td style="width: 18%; vertical-align: middle;">
                            <img src="/logo-clinica-dental.jpg" style="height: 44px; object-fit: contain;" onerror="this.style.display='none'" />
                        </td>
                        <td style="text-align: center; width: 62%; vertical-align: middle;">
                            <div class="hdr-title">ORDEN DE TRABAJO LABORATORIO DENTAL</div>
                            <div class="hdr-sub">REHABILITACIÓN ORAL - IMPLANTOLOGÍA - ODONTOLOGÍA DIGITAL</div>
                        </td>
                        <td style="text-align: right; width: 20%; vertical-align: middle;">
                            <div class="order-box">
                                <div style="font-size: 6.5pt; font-weight: 800; color: #102a6b;">N° ORDEN</div>
                                <div class="order-no">A&A-${String(trabajo.id).padStart(7, '0')}</div>
                            </div>
                        </td>
                    </tr>
                </table>

                <!-- 1. DATOS GENERALES -->
                <div class="sec-banner">1. DATOS GENERALES</div>
                <div class="box-border" style="margin-bottom: 4px;">
                    <div style="display: grid; grid-template-columns: 1fr 1.3fr 1.3fr 1.2fr; gap: 4px; margin-bottom: 3px;">
                        <div><span class="field-label">Fecha y Hora:</span> <span class="field-val">${formatDate(trabajo.fecha)} ${trabajo.hora || ''}</span></div>
                        <div><span class="field-label">Doctor Tratante:</span> <span class="field-val">Dr. ${formatFullName(trabajo.doctor)}</span></div>
                        <div><span class="field-label">Paciente:</span> <span class="field-val">${formatFullName(trabajo.paciente)}</span></div>
                        <div><span class="field-label">Laboratorio Dental:</span> <span class="field-val">${trabajo.laboratorio?.laboratorio || '-'}</span></div>
                    </div>
                    <div style="display: grid; grid-template-columns: 2.2fr 0.8fr 1fr; gap: 4px; padding-top: 2px; border-top: 1px dashed #e2e8f0;">
                        <div><span class="field-label">Trabajo de Laboratorio:</span> <span class="field-val">${trabajo.precioLaboratorio?.detalle || '-'}</span></div>
                        <div><span class="field-label">Cantidad:</span> <span class="field-val">${trabajo.cantidad || 1} Unid.</span></div>
                        <div><span class="field-label">Total Bs:</span> <span class="field-val" style="color: #102a6b; font-weight: 900; font-size: 8pt;">Bs. ${formatNumber(trabajo.total)}</span></div>
                    </div>
                </div>

                <!-- 2. TIPO DE RESTAURACIÓN & 3. DIENTES INVOLUCRADOS & PREPARACIÓN -->
                <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 4px; margin-bottom: 4px;">
                    <!-- 2. TIPO DE RESTAURACIÓN -->
                    <div class="box-border">
                        <div class="sec-banner">2. TIPO DE RESTAURACIÓN</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1px 6px;">
                            ${restItems.map(item => {
                                const isChecked = Boolean(d?.tipo_restauracion?.[item.key] || (item.altKey && d?.tipo_restauracion?.[item.altKey]));
                                return chk(isChecked, item.label);
                            }).join('')}
                        </div>
                        <div style="margin-top: 3px; padding-top: 2px; border-top: 1px dashed #e2e8f0; font-size: 6.8pt;">
                            <span class="field-label">Otro:</span> <span class="field-val">${d?.tipo_restauracion?.otro || '____________________'}</span>
                        </div>
                    </div>

                    <!-- 3. DIENTES INVOLUCRADOS & PREPARACIÓN -->
                    <div class="box-border" style="text-align: center; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <div class="sec-banner">3. DIENTES INVOLUCRADOS & PREPARACIÓN</div>
                            <div style="font-size: 7.2pt; font-weight: 800; color: #dc2626; margin-bottom: 2px;">
                                Dientes: ${trabajo.pieza || 'Ninguno'}
                            </div>
                            <div style="display: flex; justify-content: center; align-items: center;">
                                ${generatePrintTeethArchSVG(selectedTeeth)}
                            </div>
                        </div>
                        ${(d?.preparacion || d?.lado) ? `
                            <div style="text-align: left; font-size: 6.5pt; border-top: 1px dashed #e2e8f0; padding-top: 2px; margin-top: 2px;">
                                ${d.preparacion ? `<div><b>Preparación:</b> ${typeof d.preparacion === 'string' ? d.preparacion : Object.keys(d.preparacion).filter(k => d.preparacion[k]).join(', ')}</div>` : ''}
                                ${d.lado ? `<div><b>Lado:</b> ${typeof d.lado === 'string' ? d.lado : Object.keys(d.lado).filter(k => d.lado[k]).join(', ')}</div>` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- 4. COLOR Y CARACTERIZACIONES | 5. INFORMACIÓN DIGITAL | 6. IMPLANTOLOGÍA -->
                <div style="display: grid; grid-template-columns: 1.1fr 1fr 1.1fr; gap: 4px; margin-bottom: 4px;">
                    <!-- 4. COLOR Y CARACTERIZACIONES -->
                    <div class="box-border">
                        <div class="sec-banner">4. COLOR Y CARACTERIZACIONES</div>
                        <div style="margin-bottom: 2px;">
                            <span class="field-label">Color Principal:</span>
                            <span class="field-val" style="color: #102a6b; font-weight: 900;">${trabajo.color || '-'}</span>
                        </div>
                        <div>
                            <span class="field-label">Caracterizaciones:</span>
                            <div style="font-size: 6.8pt; min-height: 24px; color: #1e293b; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 3px; padding: 2px 4px; margin-top: 1px;">
                                ${d?.caracterizaciones?.detalle || (typeof d?.caracterizaciones === 'string' ? d.caracterizaciones : '') || '-'}
                            </div>
                        </div>
                    </div>

                    <!-- 5. INFORMACIÓN DIGITAL -->
                    <div class="box-border">
                        <div class="sec-banner">5. INFORMACIÓN DIGITAL</div>
                        ${chk(Boolean(d?.digital?.escaneo_intraoral), 'Escaneo Intraoral')}
                        <div style="margin-top: 4px;">
                            <span class="field-label">Marca:</span>
                            <span class="field-val">${d?.digital?.marca || '-'}</span>
                        </div>
                    </div>

                    <!-- 6. IMPLANTOLOGÍA -->
                    <div class="box-border">
                        <div class="sec-banner">6. IMPLANTOLOGÍA</div>
                        <div>
                            <span class="field-label">Detalle:</span>
                            <div style="font-size: 6.8pt; min-height: 32px; color: #1e293b; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 3px; padding: 2px 4px; margin-top: 1px;">
                                ${d?.implantologia?.detalle || (typeof d?.implantologia === 'string' ? d.implantologia : '') || '-'}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 7. PRUEBAS | 8. URGENCIA | FOTOGRAFÍAS / REFERENCIAS -->
                <div style="display: grid; grid-template-columns: 1.2fr 0.9fr 1.1fr; gap: 4px; margin-bottom: 4px;">
                    <!-- 7. PRUEBAS -->
                    <div class="box-border">
                        <div class="sec-banner">7. PRUEBAS</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1px 4px; margin-bottom: 2px;">
                            ${pruebasList.map(item => chk(Boolean(d?.pruebas?.[item.key]), item.label)).join('')}
                        </div>
                        <div style="margin-top: 2px; padding-top: 2px; border-top: 1px dashed #e2e8f0;">
                            <span class="field-label">Detalle:</span>
                            <span class="field-val" style="font-size: 6.5pt;">${d?.pruebas?.detalle || '-'}</span>
                        </div>
                    </div>

                    <!-- 8. URGENCIA -->
                    <div class="box-border">
                        <div class="sec-banner">8. URGENCIA</div>
                        <div style="display: flex; flex-direction: column; gap: 2px;">
                            ${chk(urgenciaVal === 'Normal', '⚪ Normal')}
                            ${chk(urgenciaVal === 'Prioritario', '🟡 Prioritario')}
                            ${chk(urgenciaVal === 'Urgente 24 h', '🟠 Urgente 24 h')}
                            ${chk(urgenciaVal === 'Express', '🔴 Express')}
                        </div>
                    </div>

                    <!-- FOTOGRAFÍAS / REFERENCIAS -->
                    <div class="box-border">
                        <div class="sec-banner">FOTOGRAFÍAS / REFERENCIAS</div>
                        <div style="display: flex; gap: 4px; justify-content: center; align-items: center; min-height: 38px;">
                            ${photos.length > 0 ? photos.slice(0, 3).map(p => `
                                <img src="${getImageUrl(p)}" style="width: 38px; height: 38px; object-fit: cover; border-radius: 3px; border: 1px solid #cbd5e1;" />
                            `).join('') : `
                                <span style="font-size: 6.5pt; color: #94a3b8; font-style: italic;">Sin fotografías adjuntas</span>
                            `}
                        </div>
                    </div>
                </div>

                <!-- 9. CONTROL DE TIEMPOS Y ESTADO DEL TRABAJO -->
                <div class="sec-banner">9. CONTROL DE TIEMPOS Y ESTADO DEL TRABAJO</div>
                <div class="box-border" style="margin-bottom: 4px;">
                    <div style="display: grid; grid-template-columns: 1.1fr 1fr 1fr 1fr 1fr; gap: 4px; text-align: center;">
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 3px; padding: 2px;">
                            <div class="field-label" style="font-size: 6pt; text-transform: uppercase;">Estado del Trabajo</div>
                            <div class="field-val" style="color: ${trabajo.estado === 'terminado' ? '#16a34a' : '#d97706'}; font-size: 7.2pt; text-transform: uppercase;">
                                ${trabajo.estado || 'no terminado'}
                            </div>
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 3px; padding: 2px;">
                            <div class="field-label" style="font-size: 6pt; text-transform: uppercase;">Fecha de Envío</div>
                            <div class="field-val">${fechaEnvio}</div>
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 3px; padding: 2px;">
                            <div class="field-label" style="font-size: 6pt; text-transform: uppercase;">Hora de Envío</div>
                            <div class="field-val">${horaEnvio}</div>
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 3px; padding: 2px;">
                            <div class="field-label" style="font-size: 6pt; text-transform: uppercase;">Fecha de Entrega</div>
                            <div class="field-val" style="color: #1e40af;">${fechaEntrega}</div>
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 3px; padding: 2px;">
                            <div class="field-label" style="font-size: 6pt; text-transform: uppercase;">Hora de Entrega</div>
                            <div class="field-val" style="color: #b45309;">${horaEntrega}</div>
                        </div>
                    </div>
                </div>

                <!-- 10. OBSERVACIONES CLÍNICAS / INSTRUCCIONES ESPECIALES -->
                <div class="sec-banner">10. OBSERVACIONES CLÍNICAS / INSTRUCCIONES ESPECIALES</div>
                <div class="box-border" style="min-height: 38px; font-size: 7pt; margin-bottom: 5px; color: #1e293b; white-space: pre-line;">
                    ${trabajo.observacion || trabajo.observaciones || 'Sin observaciones adicionales.'}
                </div>

                <!-- FIRMAS -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div class="sig-box">
                        <div style="font-weight: 800; color: #102a6b;">Dr. ${formatFullName(trabajo.doctor)}</div>
                        <div style="border-top: 1px solid #94a3b8; margin: 18px 20px 2px 20px;"></div>
                        <div style="color: #64748b; font-weight: 700;">Firma Doctor Tratante</div>
                    </div>
                    <div class="sig-box">
                        <div style="font-weight: 800; color: #102a6b;">${trabajo.laboratorio?.laboratorio || 'Laboratorio Dental'}</div>
                        <div style="border-top: 1px solid #94a3b8; margin: 18px 20px 2px 20px;"></div>
                        <div style="color: #64748b; font-weight: 700;">Firma Laboratorio Dental</div>
                    </div>
                </div>
            </div>

            <!-- FOOTER -->
            ${centroDental ? `
                <div class="recipe-footer">
                    ${centroDental.direccion ? `<b>Dirección:</b> ${centroDental.direccion} | ` : ''}
                    ${centroDental.telefono ? `<b>Teléfono:</b> ${centroDental.telefono} | ` : ''}
                    ${centroDental.celular ? `<b>Celular:</b> ${centroDental.celular} | ` : ''}
                    ${centroDental.emergencias ? `<b>Emergencias:</b> ${centroDental.emergencias} | ` : ''}
                    ${centroDental.email ? `<b>Email:</b> ${centroDental.email}` : ''}
                </div>
            ` : ''}
        </body>
        </html>
    `;
};
