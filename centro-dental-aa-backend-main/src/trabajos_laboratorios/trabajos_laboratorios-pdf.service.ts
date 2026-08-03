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

            // ─── 2. RESTAURACIÓN | 3. DIENTES | 4. MATERIAL | 5. COLOR ───
            content.push({
                columns: [
                    {
                        width: '*',
                        stack: [
                            { text: '2. TIPO DE RESTAURACIÓN', fontSize: 7.5, bold: true, color: 'white', fillColor: '#102a6b', alignment: 'center' },
                            {
                                text: [
                                    `${check(Boolean(d?.tipo_restauracion?.corona))} Corona\n`,
                                    `${check(Boolean(d?.tipo_restauracion?.puente))} Puente\n`,
                                    `${check(Boolean(d?.tipo_restauracion?.carilla))} Carilla\n`,
                                    `${check(Boolean(d?.tipo_restauracion?.incrustacion))} Incrustación\n`,
                                    `${check(Boolean(d?.tipo_restauracion?.protesis_total))} Prótesis Total\n`,
                                    `${check(Boolean(d?.tipo_restauracion?.protesis_removible))} Prótesis Removible\n`,
                                    `${check(Boolean(d?.tipo_restauracion?.protesis_hibrida))} Prótesis Híbrida\n`,
                                    `${check(Boolean(d?.tipo_restauracion?.placa_miorrelajante))} Placa Miorrelajante`
                                ],
                                fontSize: 7.5,
                                margin: [2, 3, 0, 0]
                            }
                        ]
                    },
                    {
                        width: '*',
                        stack: [
                            { text: '3. DIENTES INVOLUCRADOS', fontSize: 7.5, bold: true, color: 'white', fillColor: '#102a6b', alignment: 'center' },
                            { text: `Dientes: ${trabajo.pieza || '____'}`, fontSize: 8.5, bold: true, color: '#dc2626', margin: [0, 2, 0, 2] },
                            {
                                text: [
                                    { text: 'Preparación:\n', bold: true },
                                    `${check(Boolean(d?.preparacion?.hombro))} Hombro\n`,
                                    `${check(Boolean(d?.preparacion?.chaflan))} Chaflán\n`,
                                    `${check(Boolean(d?.preparacion?.vertical))} Vertical\n`,
                                    `${check(Boolean(d?.preparacion?.bopt))} BOPT\n`,
                                    { text: 'Lado:\n', bold: true },
                                    `${check(Boolean(d?.lado?.derecho))} Der  ${check(Boolean(d?.lado?.izquierdo))} Izq\n`,
                                    `${check(Boolean(d?.lado?.anterior))} Ant  ${check(Boolean(d?.lado?.posterior))} Post`
                                ],
                                fontSize: 7.5,
                                margin: [2, 0, 0, 0]
                            }
                        ]
                    },
                    {
                        width: '*',
                        stack: [
                            { text: '4. MATERIAL SOLICITADO', fontSize: 7.5, bold: true, color: 'white', fillColor: '#102a6b', alignment: 'center' },
                            {
                                text: [
                                    `${check(Boolean(d?.material?.zirconio))} Zirconio\n`,
                                    `${check(Boolean(d?.material?.disilicato))} Disilicato de Litio\n`,
                                    `${check(Boolean(d?.material?.metal_ceramica))} Metal Cerámica\n`,
                                    `${check(Boolean(d?.material?.acrilico))} Acrílico\n`,
                                    `${check(Boolean(d?.material?.pmma))} PMMA\n`,
                                    `${check(Boolean(d?.material?.composite))} Composite\n`,
                                    `${check(Boolean(d?.material?.peek))} PEEK\n`,
                                    d?.material?.otro ? `Otro: ${d.material.otro}` : ''
                                ],
                                fontSize: 7.5,
                                margin: [2, 3, 0, 0]
                            }
                        ]
                    },
                    {
                        width: '*',
                        stack: [
                            { text: '5. COLOR & CARACTERÍSTICAS', fontSize: 7.5, bold: true, color: 'white', fillColor: '#102a6b', alignment: 'center' },
                            {
                                text: [
                                    { text: 'Color Principal: ', bold: true }, `${trabajo.color || '____'}\n`,
                                    { text: 'Color Muñón: ', bold: true }, `${d?.caracterizaciones?.color_munon || '____'}\n`,
                                    `${check(Boolean(d?.caracterizaciones?.cervical))} Cervical\n`,
                                    `${check(Boolean(d?.caracterizaciones?.incisal))} Incisal\n`,
                                    `${check(Boolean(d?.caracterizaciones?.halo))} Halo\n`,
                                    `${check(Boolean(d?.caracterizaciones?.opalescencia))} Opalescencia\n`,
                                    `${check(Boolean(d?.caracterizaciones?.fotografias_adjuntas))} Fotos adjuntas`
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

            // ─── 6. OCLUSIÓN | 7. INFORMACIÓN DIGITAL | 8. IMPLANTOLOGÍA ───
            content.push({
                columns: [
                    {
                        width: '*',
                        stack: [
                            { text: '6. OCLUSIÓN', fontSize: 7.5, bold: true, color: 'white', fillColor: '#102a6b', alignment: 'center' },
                            {
                                text: [
                                    `${check(Boolean(d?.oclusion?.mi))} MI (Máx. Intercuspidación)\n`,
                                    `${check(Boolean(d?.oclusion?.rc))} RC (Relación Céntrica)\n`,
                                    `${check(Boolean(d?.oclusion?.guia_canina))} Guía Canina\n`,
                                    `${check(Boolean(d?.oclusion?.funcion_grupo))} Función de Grupo\n`,
                                    `Sobremordida: ${d?.oclusion?.sobremordida_mm || '___'} mm\n`,
                                    `Resalte: ${d?.oclusion?.resalte_mm || '___'} mm`
                                ],
                                fontSize: 7.5,
                                margin: [2, 3, 0, 0]
                            }
                        ]
                    },
                    {
                        width: '*',
                        stack: [
                            { text: '7. INFORMACIÓN DIGITAL', fontSize: 7.5, bold: true, color: 'white', fillColor: '#102a6b', alignment: 'center' },
                            {
                                text: [
                                    `${check(Boolean(d?.digital?.escaneo_intraoral))} Escaneo Intraoral\n`,
                                    `${check(Boolean(d?.digital?.stl || d?.digital?.ply || d?.digital?.dcm))} STL / PLY / DCM\n`,
                                    `${check(Boolean(d?.digital?.cbct))} CBCT\n`,
                                    `${check(Boolean(d?.digital?.fotografias))} Fotografías\n`,
                                    `${check(Boolean(d?.digital?.diseno_exocad))} Diseño Exocad\n`,
                                    `${check(Boolean(d?.digital?.smile_design))} Smile Design`
                                ],
                                fontSize: 7.5,
                                margin: [2, 3, 0, 0]
                            }
                        ]
                    },
                    {
                        width: '*',
                        stack: [
                            { text: '8. IMPLANTOLOGÍA', fontSize: 7.5, bold: true, color: 'white', fillColor: '#102a6b', alignment: 'center' },
                            {
                                text: [
                                    `Sistema: ${d?.implantologia?.sistema || '____'}\n`,
                                    `Torque: ${d?.implantologia?.torque_ncm || '____'} Ncm\n`,
                                    `Marca: ${d?.implantologia?.marca || '____'}\n`,
                                    `Diámetro: ${d?.implantologia?.diametro_mm || '____'} mm\n`,
                                    `Longitud: ${d?.implantologia?.longitud_mm || '____'} mm\n`,
                                    `Plataforma: ${d?.implantologia?.plataforma || '____'}`
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

            // ─── OBSERVACIONES Y CONTROL ───
            if (trabajo.observaciones) {
                content.push({
                    text: 'OBSERVACIONES / DETALLES ADICIONALES:',
                    fontSize: 8,
                    bold: true,
                    color: '#102a6b',
                    margin: [0, 4, 0, 2]
                });
                content.push({
                    text: trabajo.observaciones,
                    fontSize: 7.5,
                    margin: [0, 0, 0, 8]
                });
            }

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
