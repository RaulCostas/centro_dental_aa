import jsPDF from 'jspdf';
import { getColorForSurfaceCode, getFigureForConditionCode } from './odontogramMappings';
import { getFigureUrlByKey } from './figureRegistry';
import { formatDateSpanish, formatFullName } from './formatters';

import implanteImg from '../assets/teeth/implante.png';
import coronaImg from '../assets/teeth/corona.png';
import pernoImg from '../assets/teeth/perno.png';

const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
    });
};

const imageToDataUrl = (img: HTMLImageElement): string => {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 100;
        canvas.height = img.naturalHeight || img.height || 200;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0);
            return canvas.toDataURL('image/png');
        }
    } catch (e) {
        console.warn('Error converting image to data URL:', e);
    }
    return '';
};

export interface PrintOdontogramaOptions {
    paciente: any;
    centroDental?: any;
    odontogramaMapa?: Record<string, any> | string;
    detalles?: any[];
    aranceles?: any[];
    numeroPlan?: string | number;
    fecha?: string;
    action?: 'print' | 'open' | 'save';
}

const parsePlanItems = (detallesList: any[]) => {
    const items: { tooth: number; surface?: string; arancelId: number; tratamiento?: string }[] = [];
    if (!Array.isArray(detallesList)) return items;

    detallesList.forEach(detail => {
        const piezasStr = detail.piezas || detail.pieza;
        if (!piezasStr) return;

        const cleanedPiezas = String(piezasStr).replace(/\s*\(\s*([^)]+)\s*\)/g, '($1)');
        const parts = cleanedPiezas.split(/[\s,\/-]+/).filter((p: string) => p.trim() !== '');

        parts.forEach((part: string) => {
            const match = part.match(/^(\d+)(?:\(([^)]+)\))?$/);
            if (match) {
                const tooth = Number(match[1]);
                const surface = match[2] ? match[2].trim().toUpperCase() : undefined;
                items.push({
                    tooth,
                    surface,
                    arancelId: Number(detail.arancel?.id || detail.arancelId),
                    tratamiento: detail.tratamiento || detail.arancel?.detalle
                });
            }
        });
    });
    return items;
};

export const printOdontogramaPDF = async (options: PrintOdontogramaOptions) => {
    const {
        paciente,
        centroDental,
        odontogramaMapa = {},
        detalles = [],
        aranceles = [],
        numeroPlan,
        fecha,
        action = 'print'
    } = options;

    const doc = new jsPDF();

    // Parse odontogramaMapa if string
    let mapaDientes: Record<string, any> = {};
    if (typeof odontogramaMapa === 'string') {
        try {
            mapaDientes = JSON.parse(odontogramaMapa);
        } catch (e) {}
    } else if (typeof odontogramaMapa === 'object' && odontogramaMapa !== null) {
        mapaDientes = odontogramaMapa;
    }

    // Fallback to paciente data if empty
    if (Object.keys(mapaDientes).length === 0 && paciente) {
        const fallbackMapa = paciente.odontograma_mapa || paciente.odontograma_inicial?.mapa_dientes;
        if (typeof fallbackMapa === 'string') {
            try {
                mapaDientes = JSON.parse(fallbackMapa);
            } catch (e) {}
        } else if (typeof fallbackMapa === 'object' && fallbackMapa !== null) {
            mapaDientes = fallbackMapa;
        }
    }

    const parsedPlanItems = parsePlanItems(detalles);

    // 1. Logo Header
    try {
        const logoSrc = '/logo-clinica-dental.jpg';
        if (logoSrc) {
            const logo = await loadImage(logoSrc);
            const logoDataUrl = imageToDataUrl(logo);
            const targetHeight = 15;
            const targetWidth = (logo.width / logo.height) * targetHeight;
            doc.addImage(logoDataUrl || logo, 'JPEG', 14, 10, targetWidth, targetHeight);
        }
    } catch (error) {
        console.warn('Could not load logo for Odontograma PDF', error);
    }

    // 2. Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 64, 175);
    doc.text('REGISTRO DE ODONTOGRAMA CLÍNICO', 105, 18, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);

    const patientName = paciente ? formatFullName(paciente).toUpperCase() : 'PACIENTE';
    const dateStr = fecha ? formatDateSpanish(fecha) : formatDateSpanish(new Date().toISOString());
    const planText = numeroPlan ? ` | Plan # ${String(numeroPlan).padStart(2, '0')}` : '';

    doc.text(`Paciente: ${patientName} | Fecha: ${dateStr}${planText}`, 105, 25, { align: 'center' });

    // Separator Line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(14, 29, 196, 29);

    // Preload figure overlay images as Data URLs for instant drawing
    const loadedImagesCache: Record<string, string> = {};
    try {
        const implanteEl = await loadImage(implanteImg);
        loadedImagesCache['implante'] = imageToDataUrl(implanteEl);

        const coronaEl = await loadImage(coronaImg);
        loadedImagesCache['circulo_corona'] = imageToDataUrl(coronaEl);
        loadedImagesCache['corona'] = loadedImagesCache['circulo_corona'];

        const pernoEl = await loadImage(pernoImg);
        loadedImagesCache['perno'] = imageToDataUrl(pernoEl);
    } catch (err) {
        console.warn('Error preloading overlay images for Odontograma PDF:', err);
    }

    // Vector Anatomical Tooth Paths
    const paths: Record<string, { type: string, commands: any[] }[]> = {
        upper_molar: [
            {
                type: 'path',
                commands: [
                    { type: 'M', x: 20, y: 95 },
                    { type: 'C', x1: 5, y1: 70, x2: 5, y2: 30, x: 15, y: 5 },
                    { type: 'C', x1: 25, y1: 20, x2: 35, y2: 50, x: 40, y: 75 },
                    { type: 'C', x1: 45, y1: 40, x2: 45, y2: 15, x: 50, y: 5 },
                    { type: 'C', x1: 55, y1: 15, x2: 55, y2: 40, x: 60, y: 75 },
                    { type: 'C', x1: 65, y1: 50, x2: 75, y2: 20, x: 85, y: 5 },
                    { type: 'C', x1: 95, y1: 30, x2: 95, y2: 70, x: 80, y: 95 },
                    { type: 'C', x1: 65, y1: 105, x2: 60, y2: 95, x: 50, y: 95 },
                    { type: 'C', x1: 40, y1: 95, x2: 35, y2: 105, x: 20, y: 95 },
                    { type: 'Z' }
                ]
            },
            {
                type: 'path',
                commands: [
                    { type: 'M', x: 20, y: 95 },
                    { type: 'C', x1: 10, y1: 100, x2: 5, y2: 120, x: 5, y: 140 },
                    { type: 'C', x1: 5, y1: 165, x2: 15, y2: 185, x: 25, y: 185 },
                    { type: 'C', x1: 35, y1: 185, x2: 45, y2: 175, x: 50, y: 175 },
                    { type: 'C', x1: 55, y1: 175, x2: 65, y2: 185, x: 75, y: 185 },
                    { type: 'C', x1: 85, y1: 185, x2: 95, y2: 165, x: 95, y: 140 },
                    { type: 'C', x1: 95, y1: 120, x2: 90, y2: 100, x: 80, y: 95 },
                    { type: 'C', x1: 65, y1: 105, x2: 60, y2: 95, x: 50, y: 95 },
                    { type: 'C', x1: 40, y1: 95, x2: 35, y2: 105, x: 20, y: 95 },
                    { type: 'Z' }
                ]
            }
        ],
        lower_molar: [
            {
                type: 'path',
                commands: [
                    { type: 'M', x: 20, y: 95 },
                    { type: 'C', x1: 10, y1: 50, x2: 15, y2: 20, x: 30, y: 5 },
                    { type: 'C', x1: 35, y1: 25, x2: 35, y2: 50, x: 50, y: 75 },
                    { type: 'C', x1: 65, y1: 50, x2: 65, y2: 25, x: 70, y: 5 },
                    { type: 'C', x1: 85, y1: 20, x2: 90, y2: 50, x: 80, y: 95 },
                    { type: 'C', x1: 65, y1: 105, x2: 60, y2: 95, x: 50, y: 95 },
                    { type: 'C', x1: 40, y1: 95, x2: 35, y2: 105, x: 20, y: 95 },
                    { type: 'Z' }
                ]
            },
            {
                type: 'path',
                commands: [
                    { type: 'M', x: 20, y: 95 },
                    { type: 'C', x1: 10, y1: 100, x2: 5, y2: 120, x: 5, y: 140 },
                    { type: 'C', x1: 5, y1: 165, x2: 15, y2: 185, x: 25, y: 185 },
                    { type: 'C', x1: 35, y1: 185, x2: 45, y2: 175, x: 50, y: 175 },
                    { type: 'C', x1: 55, y1: 175, x2: 65, y2: 185, x: 75, y: 185 },
                    { type: 'C', x1: 85, y1: 185, x2: 95, y2: 165, x: 95, y: 140 },
                    { type: 'C', x1: 95, y1: 120, x2: 90, y2: 100, x: 80, y: 95 },
                    { type: 'C', x1: 65, y1: 105, x2: 60, y2: 95, x: 50, y: 95 },
                    { type: 'C', x1: 40, y1: 95, x2: 35, y2: 105, x: 20, y: 95 },
                    { type: 'Z' }
                ]
            }
        ],
        upper_premolar: [
            {
                type: 'path',
                commands: [
                    { type: 'M', x: 25, y: 95 },
                    { type: 'C', x1: 20, y1: 50, x2: 30, y2: 20, x: 40, y: 5 },
                    { type: 'C', x1: 45, y1: 20, x2: 50, y2: 50, x: 50, y: 75 },
                    { type: 'C', x1: 55, y1: 50, x2: 60, y2: 20, x: 60, y: 5 },
                    { type: 'C', x1: 70, y1: 20, x2: 80, y2: 50, x: 75, y: 95 },
                    { type: 'C', x1: 65, y1: 105, x2: 60, y2: 95, x: 50, y: 95 },
                    { type: 'C', x1: 40, y1: 95, x2: 35, y2: 105, x: 25, y: 95 },
                    { type: 'Z' }
                ]
            },
            {
                type: 'path',
                commands: [
                    { type: 'M', x: 25, y: 95 },
                    { type: 'C', x1: 20, y1: 115, x2: 15, y2: 135, x: 15, y: 155 },
                    { type: 'C', x1: 15, y1: 175, x2: 30, y2: 190, x: 50, y: 190 },
                    { type: 'C', x1: 70, y1: 190, x2: 85, y2: 175, x: 85, y: 155 },
                    { type: 'C', x1: 85, y1: 135, x2: 80, y2: 115, x: 75, y: 95 },
                    { type: 'C', x1: 65, y1: 105, x2: 60, y2: 95, x: 50, y: 95 },
                    { type: 'C', x1: 40, y1: 95, x2: 35, y2: 105, x: 25, y: 95 },
                    { type: 'Z' }
                ]
            }
        ],
        lower_premolar: [
            {
                type: 'path',
                commands: [
                    { type: 'M', x: 25, y: 95 },
                    { type: 'C', x1: 15, y1: 40, x2: 30, y2: 5, x: 50, y: 5 },
                    { type: 'C', x1: 70, y1: 5, x2: 85, y2: 40, x: 75, y: 95 },
                    { type: 'C', x1: 65, y1: 105, x2: 60, y2: 95, x: 50, y: 95 },
                    { type: 'C', x1: 40, y1: 95, x2: 35, y2: 105, x: 25, y: 95 },
                    { type: 'Z' }
                ]
            },
            {
                type: 'path',
                commands: [
                    { type: 'M', x: 25, y: 95 },
                    { type: 'C', x1: 25, y1: 115, x2: 20, y2: 135, x: 20, y: 155 },
                    { type: 'C', x1: 20, y1: 175, x2: 35, y2: 190, x: 50, y: 190 },
                    { type: 'C', x1: 65, y1: 190, x2: 80, y2: 175, x: 80, y: 155 },
                    { type: 'C', x1: 80, y1: 135, x2: 75, y2: 115, x: 75, y: 95 },
                    { type: 'C', x1: 65, y1: 105, x2: 60, y2: 95, x: 50, y: 95 },
                    { type: 'C', x1: 40, y1: 95, x2: 35, y2: 105, x: 25, y: 95 },
                    { type: 'Z' }
                ]
            }
        ],
        canine: [
            {
                type: 'path',
                commands: [
                    { type: 'M', x: 32, y: 100 },
                    { type: 'C', x1: 25, y1: 30, x2: 35, y2: 5, x: 50, y: 5 },
                    { type: 'C', x1: 65, y1: 5, x2: 75, y2: 30, x: 68, y: 100 }
                ]
            },
            {
                type: 'path',
                commands: [
                    { type: 'M', x: 32, y: 100 },
                    { type: 'C', x1: 20, y1: 110, x2: 15, y2: 130, x: 15, y: 150 },
                    { type: 'C', x1: 15, y1: 170, x2: 40, y2: 195, x: 50, y: 195 },
                    { type: 'C', x1: 60, y1: 195, x2: 85, y2: 170, x: 85, y: 150 },
                    { type: 'C', x1: 85, y1: 130, x2: 80, y2: 110, x: 68, y: 100 },
                    { type: 'C', x1: 55, y1: 105, x2: 45, y2: 105, x: 32, y: 100 },
                    { type: 'Z' }
                ]
            }
        ],
        incisor: [
            {
                type: 'path',
                commands: [
                    { type: 'M', x: 32, y: 100 },
                    { type: 'C', x1: 25, y1: 40, x2: 38, y2: 10, x: 50, y: 10 },
                    { type: 'C', x1: 62, y1: 10, x2: 75, y2: 40, x: 68, y: 100 }
                ]
            },
            {
                type: 'path',
                commands: [
                    { type: 'M', x: 32, y: 100 },
                    { type: 'C', x1: 20, y1: 110, x2: 15, y2: 130, x: 15, y: 160 },
                    { type: 'C', x1: 15, y1: 185, x2: 25, y2: 190, x: 50, y: 190 },
                    { type: 'C', x1: 75, y1: 190, x2: 85, y2: 185, x: 85, y: 160 },
                    { type: 'C', x1: 85, y1: 130, x2: 80, y2: 110, x: 68, y: 100 },
                    { type: 'C', x1: 55, y1: 105, x2: 45, y2: 105, x: 32, y: 100 },
                    { type: 'Z' }
                ]
            }
        ]
    };

    const drawPolygon = (points: number[][], style: 'F' | 'S' | 'FD' = 'FD') => {
        if (points.length < 3) return;
        doc.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
            doc.lineTo(points[i][0], points[i][1]);
        }
        doc.close();
        if (style === 'FD') {
            doc.fillStroke();
        } else if (style === 'F') {
            doc.fill();
        } else {
            doc.stroke();
        }
    };

    const drawAnatomicalTooth = (x: number, toothY: number, num: number, isAbsentOrExtraction: boolean) => {
        const isUpper = num < 30 || (num >= 51 && num <= 65);
        const lastDigit = num % 10;
        const isChild = num >= 51 && num <= 85;
        let type: 'upper_molar' | 'lower_molar' | 'upper_premolar' | 'lower_premolar' | 'canine' | 'incisor' = 'incisor';

        if (isChild) {
            if ([5, 4].includes(lastDigit)) type = isUpper ? 'upper_molar' : 'lower_molar';
            else if (lastDigit === 3) type = 'canine';
        } else {
            if ([8, 7, 6].includes(lastDigit)) type = isUpper ? 'upper_molar' : 'lower_molar';
            else if ([5, 4].includes(lastDigit)) type = isUpper ? 'upper_premolar' : 'lower_premolar';
            else if (lastDigit === 3) type = 'canine';
        }

        const toothPaths = paths[type];
        if (!toothPaths) return;

        doc.setLineWidth(0.12);

        toothPaths.forEach(p => {
            p.commands.forEach((cmd: any) => {
                let svgX = cmd.x ?? 0;
                let svgY = cmd.y ?? 0;
                if (!isUpper) {
                    svgX = 100 - svgX;
                    svgY = 200 - svgY;
                }

                const pdfX = x + svgX * 0.08;
                const pdfY = toothY + svgY * 0.08;

                if (cmd.type === 'M') {
                    doc.moveTo(pdfX, pdfY);
                } else if (cmd.type === 'C') {
                    let svgX1 = cmd.x1 ?? 0;
                    let svgY1 = cmd.y1 ?? 0;
                    let svgX2 = cmd.x2 ?? 0;
                    let svgY2 = cmd.y2 ?? 0;

                    if (!isUpper) {
                        svgX1 = 100 - svgX1;
                        svgY1 = 200 - svgY1;
                        svgX2 = 100 - svgX2;
                        svgY2 = 200 - svgY2;
                    }

                    const pdfX1 = x + svgX1 * 0.08;
                    const pdfY1 = toothY + svgY1 * 0.08;
                    const pdfX2 = x + svgX2 * 0.08;
                    const pdfY2 = toothY + svgY2 * 0.08;

                    doc.curveTo(pdfX1, pdfY1, pdfX2, pdfY2, pdfX, pdfY);
                } else if (cmd.type === 'L') {
                    doc.lineTo(pdfX, pdfY);
                } else if (cmd.type === 'Z') {
                    doc.close();
                }
            });

            if (isAbsentOrExtraction) {
                doc.setDrawColor(200, 200, 200);
                doc.setFillColor(250, 250, 250);
            } else {
                doc.setDrawColor(60, 60, 60);
                doc.setFillColor(255, 255, 255);
            }
            doc.fillStroke();
        });
    };

    const getArancelConfig = (arancelId: number) => {
        return aranceles.find(a => a.id === arancelId);
    };

    const getActiveFiguresForTooth = (num: number, data: any) => {
        const figures: { type: string; color: string }[] = [];

        if (data) {
            // 1. Check data.activeFigures array (used in interactively set odontogram data)
            if (Array.isArray(data.activeFigures)) {
                data.activeFigures.forEach((f: any) => {
                    if (f && f.type) {
                        figures.push({
                            type: f.type,
                            color: f.color || '#3b82f6'
                        });
                    }
                });
            }

            // 2. Check state code (historical state)
            const stateCode = data.state;
            if (stateCode) {
                const fig = getFigureForConditionCode(stateCode);
                if (fig && !figures.some(f => f.type === fig.type)) {
                    figures.push(fig);
                }
            }

            // 3. Check connectionType code
            const connCode = data.connectionType;
            if (connCode) {
                const fig = getFigureForConditionCode(connCode);
                if (fig && !figures.some(f => f.type === fig.type)) {
                    figures.push(fig);
                }
            }
        }

        // 4. Check budget details items for this tooth
        if (parsedPlanItems) {
            parsedPlanItems.forEach(item => {
                if (Number(item.tooth) === num) {
                    let figType = '';
                    let figColor = '#3b82f6';

                    const config = getArancelConfig(item.arancelId);
                    if (config?.odontogramaFigura && config.odontogramaFigura !== 'none') {
                        figType = config.odontogramaFigura;
                        figColor = config.odontogramaColor || '#3b82f6';
                    } else if (item.tratamiento) {
                        const tr = String(item.tratamiento).toLowerCase();
                        if (tr.includes('implante')) { figType = 'implante'; figColor = '#14b8a6'; }
                        else if (tr.includes('corona')) { figType = 'circulo_corona'; figColor = '#f59e0b'; }
                        else if (tr.includes('perno')) { figType = 'perno'; figColor = '#6b7280'; }
                        else if (tr.includes('endo') || tr.includes('conducto')) { figType = 'conducto'; figColor = '#10b981'; }
                        else if (tr.includes('sellante')) { figType = 'sellante'; figColor = '#10b981'; }
                        else if (tr.includes('extracción') || tr.includes('extraccion')) { figType = 'tachar_extraccion'; figColor = '#ef4444'; }
                        else if (tr.includes('ausente')) { figType = 'tachar_ausente'; figColor = '#3b82f6'; }
                    }

                    if (figType && !figures.some(f => f.type === figType)) {
                        figures.push({ type: figType, color: figColor });
                    }
                }
            });
        }

        return figures;
    };

    const drawSingleTooth = async (x: number, y: number, num: number, data: any) => {
        const isUpper = num < 30 || (num >= 51 && num <= 65);

        // Label
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 80);
        const labelY = isUpper ? y - 2 : y + 28;
        doc.text(num.toString(), x + 4, labelY, { align: 'center' });

        const activeFigures = getActiveFiguresForTooth(num, data);
        const state = data?.state;
        const isAbsent = activeFigures.some(f => f.type === 'tachar_ausente' || f.type === 'ausente') || state === 10;
        const isExtraction = activeFigures.some(f => f.type === 'tachar_extraccion' || f.type === 'extraccion') || state === 11;
        const isImplante = activeFigures.some(f => f.type === 'implante') || state === 30;

        const toothY = isUpper ? y : y + 10;
        const surfaceYOffset = isUpper ? y + 18 : y;

        drawAnatomicalTooth(x, toothY, num, isAbsent || isExtraction);

        for (const fig of activeFigures) {
            let imgDataUrl: string | null = loadedImagesCache[fig.type] || null;

            if (!imgDataUrl) {
                if (fig.type.startsWith('dynamic:')) {
                    const pathKey = fig.type.replace('dynamic:', '');
                    const url = getFigureUrlByKey(pathKey);
                    if (url) {
                        try {
                            const loaded = await loadImage(url);
                            imgDataUrl = imageToDataUrl(loaded);
                        } catch (err) {
                            console.warn(`Failed to load dynamic figure: ${url}`, err);
                        }
                    }
                } else {
                    const url = getFigureUrlByKey(fig.type);
                    if (url) {
                        try {
                            const loaded = await loadImage(url);
                            imgDataUrl = imageToDataUrl(loaded);
                        } catch (err) {}
                    }
                }
            }

            if (imgDataUrl) {
                try {
                    doc.addImage(imgDataUrl, 'PNG', x, toothY, 8, 16);
                } catch (e) {
                    console.warn(`Error drawing image ${fig.type} for tooth ${num}:`, e);
                }
            }
        }

        if (!isAbsent && !isExtraction && !isImplante) {
            const parseHexColor = (hex: string) => {
                if (!hex || hex === 'transparent') return null;
                const clean = hex.replace('#', '');
                if (clean.length !== 6) return null;
                const r = parseInt(clean.substring(0, 2), 16);
                const g = parseInt(clean.substring(2, 4), 16);
                const b = parseInt(clean.substring(4, 6), 16);
                return [r, g, b];
            };

            const surfaces = data?.surfaces || data?.surfaceColors || {};

            const drawSurface = (surfaceName: string, points: number[][]) => {
                const surfaceCode = surfaces[surfaceName];
                let hexColor = 'transparent';
                if (surfaceCode) {
                    hexColor = typeof surfaceCode === 'number' ? getColorForSurfaceCode(surfaceCode) : String(surfaceCode);
                }

                const rgb = parseHexColor(hexColor);
                const absPoints = points.map(p => [x + p[0], surfaceYOffset + p[1]]);
                if (rgb) {
                    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
                    drawPolygon(absPoints, 'FD');
                } else {
                    doc.setLineWidth(0.15);
                    doc.setDrawColor(120, 120, 120);
                    drawPolygon(absPoints, 'S');
                }
            };

            doc.setLineWidth(0.15);
            doc.setDrawColor(120, 120, 120);

            drawSurface('V', [[0, 0], [8, 0], [6, 2], [2, 2]]);
            drawSurface('L', [[0, 8], [8, 8], [6, 6], [2, 6]]);
            drawSurface('M', [[0, 0], [0, 8], [2, 6], [2, 2]]);
            drawSurface('D', [[8, 0], [8, 8], [6, 6], [6, 2]]);
            drawSurface('O', [[2, 2], [6, 2], [6, 6], [2, 6]]);
        }

        if (isAbsent || isExtraction) {
            doc.setLineWidth(0.6);
            doc.setDrawColor(isAbsent ? 59 : 239, isAbsent ? 130 : 68, isAbsent ? 246 : 68);
            doc.line(x, toothY, x + 8, toothY + 16);
            doc.line(x + 8, toothY, x, toothY + 16);
        }
    };

    // Upper Adult (18 - 28)
    const upperAdult = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
    for (let idx = 0; idx < upperAdult.length; idx++) {
        const num = upperAdult[idx];
        const x = idx < 8 ? (25 + idx * 10) : (107 + (idx - 8) * 10);
        await drawSingleTooth(x, 40, num, mapaDientes[num]);
    }

    // Upper Child (55 - 65)
    const upperChild = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
    for (let idx = 0; idx < upperChild.length; idx++) {
        const num = upperChild[idx];
        const x = idx < 5 ? (55 + idx * 10) : (107 + (idx - 5) * 10);
        await drawSingleTooth(x, 78, num, mapaDientes[num]);
    }

    // Lower Child (85 - 75)
    const lowerChild = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
    for (let idx = 0; idx < lowerChild.length; idx++) {
        const num = lowerChild[idx];
        const x = idx < 5 ? (55 + idx * 10) : (107 + (idx - 5) * 10);
        await drawSingleTooth(x, 120, num, mapaDientes[num]);
    }

    // Lower Adult (48 - 38)
    const lowerAdult = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
    for (let idx = 0; idx < lowerAdult.length; idx++) {
        const num = lowerAdult[idx];
        const x = idx < 8 ? (25 + idx * 10) : (107 + (idx - 8) * 10);
        await drawSingleTooth(x, 162, num, mapaDientes[num]);
    }

    // Clinic Footer
    if (centroDental) {
        const footerParts: string[] = [];
        if (centroDental.direccion) footerParts.push(`Dirección: ${centroDental.direccion}`);
        if (centroDental.telefono) footerParts.push(`Teléfono: ${centroDental.telefono}`);
        if (centroDental.celular) footerParts.push(`Celular: ${centroDental.celular}`);
        if (centroDental.emergencias) footerParts.push(`Emergencias: ${centroDental.emergencias}`);
        if (centroDental.email) footerParts.push(`Email: ${centroDental.email}`);

        const footerString = footerParts.join(' | ');
        if (footerString) {
            const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
            doc.setDrawColor(221, 221, 221);
            doc.line(14, pageHeight - 16, 196, pageHeight - 16);
            doc.setFontSize(8);
            doc.setTextColor('#555555');
            doc.text(footerString, 105, pageHeight - 11, { align: 'center', maxWidth: 180 });
        }
    }

    if (action === 'print') {
        doc.autoPrint();
        const blobUrl = doc.output('bloburl');
        window.open(String(blobUrl), '_blank');
    } else if (action === 'save') {
        doc.save(`Odontograma_${patientName.replace(/\s+/g, '_')}.pdf`);
    }

    return doc;
};
