import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinter = require('pdfmake');

@Injectable()
export class TrabajosLaboratoriosPdfService {
    private printer: any;

    constructor(private readonly dataSource: DataSource) {
        const fonts = {
            Helvetica: {
                normal: 'Helvetica',
                bold: 'Helvetica-Bold',
                italics: 'Helvetica-Oblique',
                bolditalics: 'Helvetica-BoldOblique'
            }
        };
        this.printer = new PdfPrinter(fonts);
    }

    async generateTrabajoLaboratorioPdf(trabajo: any): Promise<Buffer> {
        let centroDental: any = null;
        try {
            const result = await this.dataSource.query('SELECT * FROM "datos_centro_dental" LIMIT 1');
            if (result && result.length > 0) {
                centroDental = result[0];
            }
        } catch (e) {
            console.error('Error fetching datos_centro_dental in PDF generation:', e);
        }

        return new Promise((resolve, reject) => {
            const d = trabajo.detalle_json || {};

            const formatFullName = (person: any) => {
                if (!person) return '-';
                return [person.nombre, person.paterno, person.materno].filter(Boolean).join(' ') || '-';
            };

            const pacienteNombre = formatFullName(trabajo.paciente);
            const doctorNombre = formatFullName(trabajo.doctor);
            const labNombre = trabajo.laboratorio?.laboratorio || '-';
            const ordenNo = `A&A-${String(trabajo.id).padStart(7, '0')}`;

            const check = (val: boolean) => (val ? '[X]' : '[  ]');
            const fmtDate = (dateStr: string) => {
                if (!dateStr) return '-';
                const parts = dateStr.split('T')[0].split('-');
                if (parts.length === 3) {
                    return `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
                return dateStr;
            };

            const content: any[] = [];

            // ─── HEADER ───
            content.push({
                table: {
                    widths: ['*', 'auto'],
                    body: [
                        [
                            {
                                stack: [
                                    { text: 'ORDEN DE TRABAJO LABORATORIO DENTAL', fontSize: 13, bold: true, color: '#102a6b' },
                                    { text: 'REHABILITACIÓN ORAL - IMPLANTOLOGÍA - ODONTOLOGÍA DIGITAL', fontSize: 7.5, bold: true, color: '#1e40af', margin: [0, 2, 0, 0] }
                                ]
                            },
                            {
                                table: {
                                    widths: ['auto'],
                                    body: [
                                        [{ text: 'N° ORDEN', fontSize: 6.5, bold: true, color: '#102a6b', alignment: 'center' }],
                                        [{ text: ordenNo, fontSize: 11, bold: true, color: '#dc2626', alignment: 'center' }]
                                    ]
                                },
                                layout: {
                                    fillColor: '#f0f3ff'
                                }
                            }
                        ]
                    ]
                },
                layout: 'noBorders',
                margin: [0, 0, 0, 8]
            });

            // ─── 1. DATOS GENERALES ───
            content.push({
                text: '1. DATOS GENERALES DE LA ORDEN',
                fontSize: 8.5,
                bold: true,
                color: 'white',
                fillColor: '#102a6b',
                margin: [0, 4, 0, 4],
                padding: [4, 2]
            });

            content.push({
                table: {
                    widths: ['*', '*'],
                    body: [
                        [
                            { text: [{ text: 'Fecha: ', bold: true }, `${fmtDate(trabajo.fecha)} ${trabajo.hora || ''}`], fontSize: 8 },
                            { text: [{ text: 'Doctor Tratante: ', bold: true }, `Dr. ${doctorNombre}`], fontSize: 8 }
                        ],
                        [
                            { text: [{ text: 'Paciente: ', bold: true }, pacienteNombre], fontSize: 8 },
                            { text: [{ text: 'Laboratorio: ', bold: true }, labNombre], fontSize: 8 }
                        ],
                        [
                            { text: [{ text: 'Trabajo Solicitado: ', bold: true }, trabajo.precioLaboratorio?.detalle || trabajo.detalle || '-'], fontSize: 8 },
                            { text: [{ text: 'Cantidad: ', bold: true }, `${trabajo.cantidad || 1} Unid.   |   `, { text: 'Monto Total: ', bold: true }, `Bs. ${Number(trabajo.total || 0).toFixed(2)}`], fontSize: 8 }
                        ]
                    ]
                },
                margin: [0, 0, 0, 8]
            });

            // ─── 2. RESTAURACIÓN & 3. DIENTES INVOLUCRADOS & PREPARACIÓN ───
            content.push({
                columns: [
                    {
                        width: '60%',
                        stack: [
                            { text: '2. TIPO DE RESTAURACIÓN', fontSize: 7.5, bold: true, color: 'white', fillColor: '#102a6b', alignment: 'center' },
                            {
                                columns: [
                                    {
                                        width: '50%',
                                        text: [
                                            `${check(Boolean(d?.tipo_restauracion?.corona))} Corona\n`,
                                            `${check(Boolean(d?.tipo_restauracion?.puente))} Puente\n`,
                                            `${check(Boolean(d?.tipo_restauracion?.carilla))} Carilla\n`,
                                            `${check(Boolean(d?.tipo_restauracion?.inlay))} Inlay\n`,
                                            `${check(Boolean(d?.tipo_restauracion?.onlay))} Onlay\n`,
                                            `${check(Boolean(d?.tipo_restauracion?.protesis_parcial || d?.tipo_restauracion?.protesis_removible))} Prótesis Parcial Rem.\n`,
                                            `${check(Boolean(d?.tipo_restauracion?.protesis_total))} Prótesis Total\n`,
                                            `${check(Boolean(d?.tipo_restauracion?.sobredentadura))} Sobredentadura`
                                        ],
                                        fontSize: 7
                                    },
                                    {
                                        width: '50%',
                                        text: [
                                            `${check(Boolean(d?.tipo_restauracion?.barra_implantes))} Barra sobre Implantes\n`,
                                            `${check(Boolean(d?.tipo_restauracion?.hibrida_fija))} Híbrida Fija\n`,
                                            `${check(Boolean(d?.tipo_restauracion?.provisional))} Provisional\n`,
                                            `${check(Boolean(d?.tipo_restauracion?.ferula))} Férula\n`,
                                            `${check(Boolean(d?.tipo_restauracion?.guarda_oclusal))} Guarda Oclusal\n`,
                                            `${check(Boolean(d?.tipo_restauracion?.mock_up))} Mock-up\n`,
                                            `${check(Boolean(d?.tipo_restauracion?.encerado_diagnostico))} Encerado Diagnóstico\n`,
                                            `${check(Boolean(d?.tipo_restauracion?.guia_quirurgica))} Guía Quirúrgica`
                                        ],
                                        fontSize: 7
                                    }
                                ],
                                margin: [2, 3, 0, 2]
                            },
                            {
                                text: [{ text: 'Otro: ', bold: true }, d?.tipo_restauracion?.otro || '____________________'],
                                fontSize: 7,
                                margin: [2, 2, 0, 0]
                            }
                        ]
                    },
                    {
                        width: '40%',
                        stack: [
                            { text: '3. DIENTES INVOLUCRADOS & PREPARACIÓN', fontSize: 7.5, bold: true, color: 'white', fillColor: '#102a6b', alignment: 'center' },
                            { text: `Dientes / Piezas: ${trabajo.pieza || 'Ninguna'}`, fontSize: 8.5, bold: true, color: '#dc2626', margin: [0, 4, 0, 4], alignment: 'center' },
                            (d?.preparacion || d?.lado) ? {
                                text: [
                                    d.preparacion ? { text: `Preparación: ${typeof d.preparacion === 'string' ? d.preparacion : Object.keys(d.preparacion).filter(k => d.preparacion[k]).join(', ')}\n`, fontSize: 7 } : '',
                                    d.lado ? { text: `Lado: ${typeof d.lado === 'string' ? d.lado : Object.keys(d.lado).filter(k => d.lado[k]).join(', ')}`, fontSize: 7 } : ''
                                ],
                                margin: [4, 2, 0, 0]
                            } : { text: '' }
                        ]
                    }
                ],
                columnGap: 6,
                margin: [0, 0, 0, 8]
            });

            // ─── 4. COLOR | 5. INFO DIGITAL | 6. IMPLANTOLOGÍA ───
            content.push({
                columns: [
                    {
                        width: '34%',
                        stack: [
                            { text: '4. COLOR Y CARACTERIZACIONES', fontSize: 7.5, bold: true, color: 'white', fillColor: '#102a6b', alignment: 'center' },
                            {
                                text: [
                                    { text: 'Color Principal: ', bold: true }, `${trabajo.color || '-'}\n`,
                                    { text: 'Caracterizaciones: ', bold: true }, `${d?.caracterizaciones?.detalle || (typeof d?.caracterizaciones === 'string' ? d.caracterizaciones : '') || '-'}`
                                ],
                                fontSize: 7,
                                margin: [2, 3, 0, 0]
                            }
                        ]
                    },
                    {
                        width: '33%',
                        stack: [
                            { text: '5. INFORMACIÓN DIGITAL', fontSize: 7.5, bold: true, color: 'white', fillColor: '#102a6b', alignment: 'center' },
                            {
                                text: [
                                    `${check(Boolean(d?.digital?.escaneo_intraoral))} Escaneo Intraoral\n`,
                                    { text: 'Marca: ', bold: true }, `${d?.digital?.marca || '-'}`
                                ],
                                fontSize: 7,
                                margin: [2, 3, 0, 0]
                            }
                        ]
                    },
                    {
                        width: '33%',
                        stack: [
                            { text: '6. IMPLANTOLOGÍA', fontSize: 7.5, bold: true, color: 'white', fillColor: '#102a6b', alignment: 'center' },
                            {
                                text: [
                                    { text: 'Detalle: ', bold: true }, `${d?.implantologia?.detalle || (typeof d?.implantologia === 'string' ? d.implantologia : '') || '-'}`
                                ],
                                fontSize: 7,
                                margin: [2, 3, 0, 0]
                            }
                        ]
                    }
                ],
                columnGap: 6,
                margin: [0, 0, 0, 8]
            });

            // ─── 7. PRUEBAS | 8. URGENCIA ───
            const urg = d?.urgencia || 'Normal';
            content.push({
                columns: [
                    {
                        width: '50%',
                        stack: [
                            { text: '7. PRUEBAS', fontSize: 7.5, bold: true, color: 'white', fillColor: '#102a6b', alignment: 'center' },
                            {
                                text: [
                                    `${check(Boolean(d?.pruebas?.cera))} Cera  ${check(Boolean(d?.pruebas?.metal))} Metal  ${check(Boolean(d?.pruebas?.bizcocho))} Bizcocho\n`,
                                    `${check(Boolean(d?.pruebas?.oclusion))} Oclusión  ${check(Boolean(d?.pruebas?.aprobado))} Aprobado\n`,
                                    { text: 'Detalle: ', bold: true }, `${d?.pruebas?.detalle || '-'}`
                                ],
                                fontSize: 7,
                                margin: [2, 3, 0, 0]
                            }
                        ]
                    },
                    {
                        width: '50%',
                        stack: [
                            { text: '8. URGENCIA', fontSize: 7.5, bold: true, color: 'white', fillColor: '#102a6b', alignment: 'center' },
                            {
                                text: [
                                    `${check(urg === 'Normal')} Normal   ${check(urg === 'Prioritario')} Prioritario\n`,
                                    `${check(urg === 'Urgente 24 h')} Urgente 24 h   ${check(urg === 'Express')} Express`
                                ],
                                fontSize: 7.5,
                                margin: [2, 3, 0, 0]
                            }
                        ]
                    }
                ],
                columnGap: 6,
                margin: [0, 0, 0, 8]
            });

            // ─── 9. CONTROL DE TIEMPOS Y ESTADO DEL TRABAJO ───
            content.push({
                text: '9. CONTROL DE TIEMPOS Y ESTADO DEL TRABAJO',
                fontSize: 8.5,
                bold: true,
                color: 'white',
                fillColor: '#102a6b',
                margin: [0, 4, 0, 4],
                padding: [4, 2]
            });

            content.push({
                table: {
                    widths: ['*', '*', '*', '*', '*'],
                    body: [
                        [
                            { text: [{ text: 'Estado: ', bold: true }, (trabajo.estado || 'no terminado').toUpperCase()], fontSize: 8 },
                            { text: [{ text: 'Fecha de Envío: ', bold: true }, fmtDate(trabajo.fecha)], fontSize: 8 },
                            { text: [{ text: 'Hora de Envío: ', bold: true }, trabajo.hora_envio || d?.control_tiempos?.hora_envio || trabajo.hora || '-'], fontSize: 8 },
                            { text: [{ text: 'Fecha de Entrega: ', bold: true }, fmtDate(trabajo.fecha_pedido)], fontSize: 8 },
                            { text: [{ text: 'Hora de Entrega: ', bold: true }, trabajo.hora_entrega || d?.control_tiempos?.hora_entrega || '-'], fontSize: 8 }
                        ]
                    ]
                },
                margin: [0, 0, 0, 8]
            });

            // ─── 10. OBSERVACIONES CLÍNICAS / INSTRUCCIONES ESPECIALES ───
            content.push({
                text: '10. OBSERVACIONES CLÍNICAS / INSTRUCCIONES ESPECIALES',
                fontSize: 8,
                bold: true,
                color: 'white',
                fillColor: '#102a6b',
                margin: [0, 4, 0, 2],
                padding: [4, 2]
            });
            content.push({
                text: trabajo.observacion || trabajo.observaciones || 'Sin observaciones adicionales.',
                fontSize: 7.5,
                margin: [0, 2, 0, 10]
            });

            // ─── FIRMAS ───
            content.push({
                columns: [
                    {
                        width: '*',
                        stack: [
                            { text: `Dr. ${doctorNombre}`, bold: true, fontSize: 8, alignment: 'center' },
                            { text: '__________________________________', alignment: 'center', margin: [0, 20, 0, 2] },
                            { text: 'Firma Doctor Tratante', fontSize: 7, color: '#64748b', alignment: 'center' }
                        ]
                    },
                    {
                        width: '*',
                        stack: [
                            { text: labNombre, bold: true, fontSize: 8, alignment: 'center' },
                            { text: '__________________________________', alignment: 'center', margin: [0, 20, 0, 2] },
                            { text: 'Firma Laboratorio Dental', fontSize: 7, color: '#64748b', alignment: 'center' }
                        ]
                    }
                ],
                margin: [0, 10, 0, 8]
            });

            // ─── FOOTER INFO ───
            const footerParts: string[] = [];
            if (centroDental) {
                if (centroDental.direccion) footerParts.push(`Dirección: ${centroDental.direccion}`);
                if (centroDental.telefono) footerParts.push(`Teléfono: ${centroDental.telefono}`);
                if (centroDental.celular) footerParts.push(`Celular: ${centroDental.celular}`);
            }

            const docDefinition = {
                pageSize: 'LETTER',
                pageMargins: [35, 35, 35, 45],
                content,
                footer: (currentPage: number, pageCount: number) => {
                    return {
                        stack: [
                            {
                                canvas: [
                                    { type: 'line', x1: 35, y1: 0, x2: 577, y2: 0, lineWidth: 0.5, lineColor: '#cbd5e1' }
                                ],
                                margin: [0, 0, 0, 4]
                            },
                            {
                                text: footerParts.join(' | ') || 'CENTRO DENTAL A&A',
                                fontSize: 7,
                                color: '#64748b',
                                alignment: 'center',
                                margin: [0, 0, 0, 2]
                            },
                            {
                                text: `Orden de Trabajo Dental emitida por CENTRO DENTAL A&A. Página ${currentPage} de ${pageCount}`,
                                fontSize: 6.5,
                                color: '#94a3b8',
                                alignment: 'center'
                            }
                        ]
                    };
                },
                defaultStyle: {
                    font: 'Helvetica'
                }
            };

            const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
            const chunks: any[] = [];
            pdfDoc.on('data', (chunk: any) => chunks.push(chunk));
            pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
            pdfDoc.on('error', (err: any) => reject(err));
            pdfDoc.end();
        });
    }
}
