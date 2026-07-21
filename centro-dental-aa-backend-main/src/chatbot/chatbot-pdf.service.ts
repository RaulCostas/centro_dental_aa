import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinter = require('pdfmake');

@Injectable()
export class ChatbotPdfService {
    private printer: any;

    constructor() {
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

    async generateProformasPdf(paciente: any, proformas: any[]): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const content: any[] = [];

            proformas.forEach((p, index) => {
                if (index > 0) {
                    content.push({ text: '', pageBreak: 'before' });
                }

                // 1. Date (Right aligned)
                // Assuming backend runs in system time, but p.fecha is typically ISO.
                // formatDateSpanish handles ISO.
                content.push({
                    text: this.formatDateSpanish(p.fecha),
                    alignment: 'right',
                    fontSize: 10,
                    margin: [0, 0, 0, 15]
                });

                // 2. Salutation
                const patientName = `${paciente.paterno || ''} ${paciente.materno || ''} ${paciente.nombre || ''}`.trim().toUpperCase();

                content.push({ text: 'Señor(a):', fontSize: 11, margin: [0, 0, 0, 2] });
                content.push({ text: patientName, fontSize: 11, bold: true, margin: [0, 0, 0, 10] });

                content.push({ text: 'De mi consideración:', fontSize: 11, margin: [0, 0, 0, 5] });
                content.push({
                    text: 'Según los estudios realizados le presentamos el siguiente presupuesto del tratamiento odontológico que Ud. requiere:',
                    fontSize: 11,
                    margin: [0, 0, 0, 10]
                });

                // 3. Proforma Number
                content.push({
                    text: `Pre. # ${(p.numero || 0).toString().padStart(2, '0')}`,
                    alignment: 'right',
                    bold: true,
                    fontSize: 11,
                    margin: [0, 0, 0, 5]
                });

                // 4. Table
                const hasDiscount = p.detalles?.some((d: any) => Number(d.descuento || 0) > 0);

                const tableHeader = [
                    { text: 'Descripción', style: 'tableHeader', alignment: 'left' },
                    { text: 'Pieza(s)', style: 'tableHeader', alignment: 'center' },
                    { text: 'Cant.', style: 'tableHeader', alignment: 'center' },
                    { text: 'P.U.', style: 'tableHeader', alignment: 'right' },
                    { text: 'Total', style: 'tableHeader', alignment: 'right' }
                ];

                const widths: any[] = ['*', 'auto', 'auto', 'auto', 'auto'];

                if (hasDiscount) {
                    tableHeader.push(
                        { text: 'Descuento %', style: 'tableHeader', alignment: 'center' },
                        { text: 'Total con Dcto %', style: 'tableHeader', alignment: 'right' }
                    );
                    widths.push('auto', 'auto');
                }

                const body: any[] = [tableHeader];

                if (p.detalles) {
                    p.detalles.forEach((d: any) => {
                        const row = [
                            { text: d.arancel?.detalle || d.tratamiento || '', alignment: 'left' },
                            { text: d.piezas || '', alignment: 'center' },
                            { text: (d.cantidad || 0).toString(), alignment: 'center' },
                            { text: Number(d.precioUnitario || 0).toFixed(2), alignment: 'right' },
                            { text: Number(d.subTotal || 0).toFixed(2), alignment: 'right' }
                        ];

                        if (hasDiscount) {
                            row.push(
                                { text: (d.descuento || 0).toString(), alignment: 'center' },
                                { text: Number(d.total || 0).toFixed(2), alignment: 'right' }
                            );
                        }
                        body.push(row);
                    });
                }

                content.push({
                    table: {
                        headerRows: 1,
                        widths: widths,
                        body: body
                    },
                    layout: {
                        hLineWidth: (i: number) => 0.5,
                        vLineWidth: (i: number) => 0.5,
                        hLineColor: (i: number) => '#000',
                        vLineColor: (i: number) => '#000',
                        paddingLeft: (i: number) => 2,
                        paddingRight: (i: number) => 2,
                    },
                    fontSize: 9,
                    margin: [0, 0, 0, 10]
                });

                // Totals
                // To emulate the rect box, we can use a table or canvas. A table is easier.
                content.push({
                    table: {
                        widths: ['*', 'auto', 'auto'],
                        body: [
                            [
                                { text: '', border: [false, false, false, false] },
                                { text: 'TOTAL Bs.', bold: true, alignment: 'right', border: [true, true, true, true], fillColor: '#fff' },
                                { text: Number(p.total || 0).toFixed(2), bold: true, alignment: 'right', border: [true, true, true, true], fillColor: '#fff' }
                            ]
                        ]
                    },
                    margin: [0, 0, 0, 10]
                });

                // 5. Amount in Words
                const totalVal = Number(p.total || 0);
                const decimalPart = (totalVal % 1).toFixed(2).substring(2);
                const words = this.numberToWords(totalVal);
                content.push({
                    text: `SON: ${words} ${decimalPart}/100 BOLIVIANOS`,
                    fontSize: 10,
                    margin: [0, 0, 0, 10]
                });

                // 6. Nomenclature - REMOVED per user request
                // content.push({ text: 'NOMENCLATURA', bold: true, fontSize: 10, margin: [0, 0, 0, 5] });
                // ... (Canvas drawing removed) ...

                // 7. Payment System
                content.push({
                    table: {
                        widths: ['*'],
                        body: [
                            [{ text: 'SISTEMA DE PAGO', bold: true, border: [true, true, true, false] }],
                            [{
                                text: '- Cancelación del 50% al inicio. 30% durante el tratamiento. 20% antes de finalizado el mismo.',
                                border: [true, false, true, true],
                                margin: [0, 5, 0, 5]
                            }]
                        ]
                    },
                    margin: [0, 10, 0, 10],
                    fontSize: 10
                });

                // 8. Note
                content.push({
                    text: [
                        { text: 'NOTA: CENTRO DENTAL A&A ', bold: true },
                        'garantiza los trabajos realizados si el paciente sigue las recomendaciones indicadas y asiste a sus controles periódicos de manera puntual.'
                    ],
                    fontSize: 10,
                    margin: [0, 0, 0, 15]
                });

                // 9. Footer Text
                content.push({
                    text: 'El presente presupuesto podría tener modificaciones en el transcurso del tratamiento; el mismo será notificado oportunamente a su persona.',
                    fontSize: 10,
                    margin: [0, 0, 0, 2]
                });
                content.push({
                    text: 'Presupuesto válido por 15 días.',
                    fontSize: 10,
                    margin: [0, 0, 0, 2]
                });
                content.push({
                    text: 'En conformidad y aceptando el presente presupuesto, firmo.',
                    fontSize: 10,
                    margin: [0, 0, 0, 20]
                });

                // 10. Signatures
                content.push({
                    columns: [
                        {
                            width: '*',
                            stack: [
                                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 1 }] },
                                { text: 'CENTRO DENTAL A&A', alignment: 'center', margin: [0, 5, 0, 0], width: 120 }
                            ],
                            alignment: 'center'
                        },
                        {
                            width: '*',
                            stack: [
                                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 1 }] },
                                { text: patientName, alignment: 'center', margin: [0, 5, 0, 0], width: 120 }
                            ],
                            alignment: 'center'
                        }
                    ],
                    margin: [0, 20, 0, 0]
                });
            });

            const docDefinition = {
                defaultStyle: {
                    font: 'Helvetica',
                    fontSize: 11
                },
                content: content,
                styles: {
                    tableHeader: { bold: true, fontSize: 10, color: 'black', fillColor: '#eeeeee' }
                },
                pageSize: 'LETTER',
                pageMargins: [40, 40, 40, 40]
            };

            const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
            const chunks: any[] = [];
            pdfDoc.on('data', (chunk: any) => chunks.push(chunk));
            pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
            pdfDoc.on('error', (err: any) => reject(err));
            pdfDoc.end();
        });
    }

    private formatDateSpanish(dateString: string): string {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('T')[0].split('-').map(Number);

        const months = [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ];

        const days = [
            'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'
        ];

        const localDate = new Date(year, month - 1, day);
        const dayOfWeek = days[localDate.getDay()];

        return `La Paz ${dayOfWeek}, ${day} de ${months[month - 1]} de ${year}`;
    }

    private numberToWords(amount: number): string {
        const units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
        const tens = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
        const teens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
        const hundreds = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

        const convertGroup = (n: number): string => {
            let output = '';
            if (n === 100) return 'CIEN';
            if (n >= 100) {
                output += hundreds[Math.floor(n / 100)] + ' ';
                n %= 100;
            }
            if (n >= 20) {
                output += tens[Math.floor(n / 10)];
                if (n % 10 > 0) output += ' Y ' + units[n % 10];
            } else if (n >= 10) {
                output += teens[n - 10];
            } else if (n > 0) {
                output += units[n];
            }
            return output.trim();
        };

        const integerPart = Math.floor(amount);
        if (integerPart === 0) return 'CERO';

        let words = '';
        if (integerPart >= 1000000) {
            const millions = Math.floor(integerPart / 1000000);
            words += (millions === 1 ? 'UN MILLON' : convertGroup(millions) + ' MILLONES') + ' ';
            const remainder = integerPart % 1000000;
            if (remainder > 0) {
                if (remainder >= 1000) {
                    const thousands = Math.floor(remainder / 1000);
                    words += (thousands === 1 ? 'MIL' : convertGroup(thousands) + ' MIL') + ' ';
                    words += convertGroup(remainder % 1000);
                } else {
                    words += convertGroup(remainder);
                }
            }
        } else if (integerPart >= 1000) {
            const thousands = Math.floor(integerPart / 1000);
            words += (thousands === 1 ? 'MIL' : convertGroup(thousands) + ' MIL') + ' ';
            words += convertGroup(integerPart % 1000);
        } else {
            words += convertGroup(integerPart);
        }
        return words.trim();
    }
}
