import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';
import type { Paciente, Arancel } from '../types';
import jsPDF from 'jspdf';
import Pagination from './Pagination';
import autoTable from 'jspdf-autotable';
import { formatDateSpanish, numberToWords, formatFullName, formatNumber, formatCurrency } from '../utils/formatters';
import { formatDate } from '../utils/dateUtils';
import ManualModal, { type ManualSection } from './ManualModal';
import SignatureModal from './SignatureModal';
import PresupuestoViewModal from './PresupuestoViewModal';
import Odontogram from './Odontogram';
import { getColorForSurfaceCode, getFigureForConditionCode } from '../utils/odontogramMappings';
import { getFigureUrlByKey } from '../utils/figureRegistry';

import implanteImg from '../assets/teeth/implante.png';
import coronaImg from '../assets/teeth/corona.png';
import pernoImg from '../assets/teeth/perno.png';

import { Printer, DollarSign, CreditCard, ClipboardList } from 'lucide-react';
import PropuestasList from './PropuestasList';


interface Proforma {
    id: number;
    numero: number;
    fecha: string;
    total: number;
    sub_total: number;
    descuento: number;
    nota: string;
    usuario: { name: string };
    aprobado: boolean;
    detalles: any[];
    plan_pagos?: any;
    usuarioAprobado?: { name: string };
    fecha_aprobado?: string;
    pacienteId: number;
    esta_firmado?: boolean;
    odontograma_mapa?: any;
    moneda?: string;
    tipoCambio?: number;
}

const PresupuestoList: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [paciente, setPaciente] = useState<Paciente | null>(null);
    const [proformas, setProformas] = useState<Proforma[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showManual, setShowManual] = useState(false);
    const [budgetsWithRelations, setBudgetsWithRelations] = useState<Set<number>>(new Set());
    const [completedBudgets, setCompletedBudgets] = useState<Set<number>>(new Set());
    
    const [showOdontogramModal, setShowOdontogramModal] = useState(false);
    const [selectedOdontogramProforma, setSelectedOdontogramProforma] = useState<Proforma | null>(null);
    const [aranceles, setAranceles] = useState<Arancel[]>([]);

    // Signature states
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [selectedPresupuesto, setSelectedPresupuesto] = useState<Proforma | null>(null);
    const [showViewModal, setShowViewModal] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;


    const manualSections: ManualSection[] = [
        {
            title: 'Presupuestos',
            content: 'Gestión de proformas y presupuestos para el paciente. Los presupuestos permiten planificar tratamientos, hacer seguimiento de piezas completadas y controlar el estado de finalización.'
        },
        {
            title: 'Nuevo Presupuesto',
            content: 'Cree un nuevo presupuesto seleccionando tratamientos del arancel. Puede especificar las piezas dentales a tratar, agregar notas y generar PDF para entregar al paciente.'
        },
        {
            title: 'Indicadores Visuales',
            content: 'Los planes de tratamiento terminados aparecen con las columnas "# Plan" y "Fecha" tachadas en verde. Esto indica que todos los tratamientos del plan han sido completados en Seguimiento Clínico.'
        },
        {
            title: 'Seguimiento de Piezas',
            content: 'Al ver o editar un plan de tratamiento, las piezas dentales completadas aparecen tachadas en verde. Solo cuando TODAS las piezas de un tratamiento están terminadas, el tratamiento completo se marca como finalizado.'
        },
        {
            title: 'Uso en Clínico',
            content: 'Los planes de tratamiento creados están listos para ser utilizados directamente en la sección de Seguimiento Clínico y Agenda para registrar los tratamientos realizados.'
        },
        {
            title: 'Acciones Disponibles',
            content: 'Ver/Editar plan de tratamiento, Eliminar (solo si no tiene pagos o seguimiento clínico asociado), Enviar por WhatsApp, Imprimir PDF, y Exportar a Excel.'
        },
        {
            title: 'Estados del Plan de Tratamiento',
            content: 'Un plan de tratamiento puede estar: Editable (recién creado), En Proceso (con tratamientos ya iniciados en clínico), o Terminado (todos los tratamientos del plan fueron completados).'
        }];

    const filteredProformas = proformas.filter(p =>
        p.numero.toString().includes(searchTerm) ||
        p.nota.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatDate(p.fecha).includes(searchTerm)
    );

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentProformas = filteredProformas.slice(indexOfFirstItem, indexOfLastItem);

    useEffect(() => {
        if (id) {
            fetchPaciente(Number(id));
            fetchProformas(Number(id));
            fetchAranceles();
        }
    }, [id]);


    // Reset pagination when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const getParsedPlanItems = (proforma: Proforma | null) => {
        if (!proforma || !proforma.detalles) return [];
        const items: any[] = [];
        proforma.detalles.forEach(detail => {
            if (!detail.piezas) return;
            const cleanedPiezas = detail.piezas.replace(/\s*\(\s*([^)]+)\s*\)/g, '($1)');
            const parts = cleanedPiezas.split(/[\s,\/-]+/).filter((p: string) => p.trim() !== '');
            parts.forEach((part: string) => {
                const match = part.match(/^(\d+)(?:\(([^)]+)\))?$/);
                if (match) {
                    const tooth = Number(match[1]);
                    const surface = match[2] ? match[2].trim().toUpperCase() : undefined;
                    items.push({
                        tooth,
                        surface,
                        arancelId: Number(detail.arancel?.id || detail.arancelId)
                    });
                }
            });
        });
        return items;
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
            const response = await api.get('/arancel?limit=1000');
            setAranceles(response.data.data || []);
        } catch (error) {
            console.error('Error fetching aranceles:', error);
        }
    };

    const fetchProformas = async (pacienteId: number) => {
        try {
            const response = await api.get(`/proformas/paciente/${pacienteId}`);
            setProformas(response.data);

            // Check which budgets have payments or clinical history
            await checkBudgetsWithRelations(response.data.map((p: any) => p.id));
        } catch (error) {
            console.error('Error fetching proformas:', error);
        }
    };

    const checkBudgetsWithRelations = async (proformaIds: number[]) => {
        try {
            const [pagosResponse, historiaResponse] = await Promise.all([
                api.get('/pagos'),
                api.get(`/historia-clinica/paciente/${id}`)
            ]);

            const budgetsWithData = new Set<number>();
            const budgetsCompleted = new Set<number>();

            // Check for payments
            pagosResponse.data.forEach((pago: any) => {
                if (pago.proformaId && proformaIds.includes(pago.proformaId)) {
                    budgetsWithData.add(pago.proformaId);
                }
            });

            // Check for clinical history and completed budgets
            historiaResponse.data.forEach((historia: any) => {
                if (historia.proformaId && proformaIds.includes(historia.proformaId)) {
                    budgetsWithData.add(historia.proformaId);

                    // Check if this budget is marked as terminado
                    if (historia.estadoPresupuesto === 'terminado') {
                        budgetsCompleted.add(historia.proformaId);
                    }
                }
            });

            setBudgetsWithRelations(budgetsWithData);
            setCompletedBudgets(budgetsCompleted);
        } catch (error) {
            console.error('Error checking budget relations:', error);
        }
    };



    const handleToggleCurrency = async (proforma: Proforma) => {
        const isUSD = proforma.moneda === 'USD';

        if (isUSD) {
            try {
                await api.patch(`/proformas/${proforma.id}`, { moneda: 'Bs', tipoCambio: 1 });
                if (id) fetchProformas(Number(id));
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'No se pudo cambiar la moneda', 'error');
            }
        } else {
            Swal.fire({
                title: 'Cambiar a Dólares (USD)',
                text: 'Ingrese el tipo de cambio actual (Ej. 6.96):',
                input: 'number',
                inputAttributes: {
                    min: '1',
                    step: '0.01'
                },
                inputValue: '6.96',
                showCancelButton: true,
                confirmButtonText: 'Cambiar a USD',
                cancelButtonText: 'Cancelar'
            }).then(async (result) => {
                if (result.isConfirmed && result.value) {
                    const tipoCambio = parseFloat(result.value);
                    if (tipoCambio > 0) {
                        try {
                            await api.patch(`/proformas/${proforma.id}`, { moneda: 'USD', tipoCambio });
                            if (id) fetchProformas(Number(id));
                        } catch (error) {
                            console.error(error);
                            Swal.fire('Error', 'No se pudo cambiar la moneda', 'error');
                        }
                    }
                }
            });
        }
    };

    const handleDelete = async (proformaId: number) => {
        const result = await Swal.fire({
            title: '¿Está seguro?',
            text: 'Esta acción eliminará el plan de tratamiento permanentemente',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
            color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/proformas/${proformaId}`);
                Swal.fire({
                    title: '¡Eliminado!',
                    text: 'El plan de tratamiento ha sido eliminado.',
                    icon: 'success',
                    showConfirmButton: false,
                    timer: 1500,
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });
                if (id) fetchProformas(Number(id));
            } catch (error: any) {
                console.error('Error deleting proforma:', error);
                Swal.fire({
                    title: 'Error',
                    text: error.response?.data?.message || 'Error al eliminar el plan de tratamiento',
                    icon: 'error',
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });
            }
        }
    };

    const canDeleteBudget = (proformaId: number) => {
        return !budgetsWithRelations.has(proformaId);
    };

    const handleSendWhatsApp = async (proforma: Proforma, includePaymentInfo: boolean) => {
        const type = includePaymentInfo ? 'Con Pago' : 'Sin Pago';

        Swal.fire({
            title: 'Enviando...',
            text: `Enviando plan de tratamiento (${type}) por WhatsApp...`,
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            // Generate PDF Blob
            const pdfBlob = await generatePDF(proforma, 'blob', includePaymentInfo);

            if (!(pdfBlob instanceof Blob)) {
                throw new Error('Error al generar el PDF');
            }

            const formData = new FormData();
            formData.append('file', pdfBlob, `Plan_de_Tratamiento_${proforma.numero}.pdf`);

            await api.post(`/proformas/${proforma.id}/send-whatsapp`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            Swal.fire({
                icon: 'success',
                title: '¡Enviado!',
                text: 'El plan de tratamiento se envió correctamente por WhatsApp',
                timer: 2000,
                showConfirmButton: false,
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
        } catch (error: any) {
            console.error('Error sending WhatsApp:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Error al enviar por WhatsApp. Verifique que el chatbot esté conectado.',
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
        }
    };



    const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src;
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(e);
        });
    };

    const generatePDF = async (proforma: Proforma, action: 'print' | 'download' | 'blob', includePaymentInfo: boolean = true) => {
        const doc = new jsPDF();
        
        let centroDental: any = null;
        try {
            const resCentro = await api.get('/datos-centro-dental');
            if (resCentro.data && resCentro.data.length > 0) {
                centroDental = resCentro.data[0];
            }
        } catch (error) {
            console.error('Error fetching centro dental data:', error);
        }

        // Fetch signatures before generating PDF
        let pdfSignatures: any[] = [];
        try {
            const response = await api.get(`/firmas/documento/presupuesto/${proforma.id}`);
            pdfSignatures = Array.isArray(response.data) ? response.data : [];
            
            // Fallback: If no patient signature is found for the proforma, look for the patient's HC signature
            const patientSignatureInProforma = pdfSignatures.find(s => s.rolFirmante === 'paciente');
            if (!patientSignatureInProforma) {
                try {
                    const resHC = await api.get(`/firmas/documento/historia_clinica/${proforma.pacienteId}`);
                    const patientSignatureHC = Array.isArray(resHC.data) ? resHC.data.find((s: any) => s.rolFirmante === 'paciente') : undefined;
                    if (patientSignatureHC) {
                        pdfSignatures.push(patientSignatureHC);
                    }
                } catch (error) {
                    console.error('Error fetching patient HC signature:', error);
                }
            }
        } catch (error) {
            console.error('Error fetching signatures for PDF:', error);
        }

        const patientSignature = pdfSignatures.find(s => s.rolFirmante === 'paciente');
        const clinicSignature = pdfSignatures.find(s => s.rolFirmante === 'doctor' || s.rolFirmante === 'personal' || s.rolFirmante === 'administrador');





        // 1. Header (Logo)
        try {
            const logoSrc = '/logo-clinica-dental.jpg';
            if (logoSrc) {
                const logo = await loadImage(logoSrc);
                const targetHeight = 20;
                const targetWidth = (logo.width / logo.height) * targetHeight;
                doc.addImage(logo, 'JPEG', 14, 10, targetWidth, targetHeight);
            }
        } catch (error) {
            console.warn('Could not load logo for PDF', error);
        }

        // 1. Date (Right aligned)
        doc.setFontSize(10);
        doc.setTextColor(0);
        const dateStr = formatDateSpanish(proforma.fecha);
        doc.text(dateStr, 200, 20, { align: 'right' });

        // 2. Salutation
        doc.setFont('helvetica', 'normal');
        doc.text('Señor(a):', 14, 35);

        doc.setFont('helvetica', 'bold');
        const patientName = formatFullName(paciente).toUpperCase();
        doc.text(patientName, 14, 40);

        doc.setFont('helvetica', 'normal');
        doc.text('De mi consideración:', 14, 50);
        doc.text('Según los estudios realizados le presentamos el siguiente plan de tratamiento odontológico que Ud. requiere:', 14, 55, { align: 'justify', maxWidth: 180 });

        // 3. Proforma Number
        doc.setFont('helvetica', 'bold');
        doc.text(`Plan # ${proforma.numero.toString().padStart(2, '0')}`, 200, 65, { align: 'right' });

        // 4. Table
        const hasItemDiscounts = proforma.detalles.some(d => Number(d.descuento) > 0);
        let tableColumn = ["Pieza(s)", "Descripción", "Cant.", "P.U.", "Total"];
        if (hasItemDiscounts) {
            tableColumn.splice(3, 0, "Desc. %");
        }
        const tableRows: any[] = [];
        const tableStyles: any[] = []; // per-row styles for posible items
        let totalSubTotal = 0;
        let hasPosible = false;

        proforma.detalles.forEach(item => {
            const isPosible = item.posible === true;
            if (isPosible) hasPosible = true;
            const sub = Number(item.total) / (proforma.tipoCambio || 1);
            if (!isPosible) totalSubTotal += sub; // only confirmed items
            const row = [
                item.piezas,
                isPosible ? `${item.arancel.detalle} (*)` : item.arancel.detalle,
                item.cantidad
            ];
            if (hasItemDiscounts) {
                row.push(`${item.descuento || 0}%`);
            }
            row.push(formatNumber(item.precioUnitario / (proforma.tipoCambio || 1)));
            row.push(isPosible ? '-' : formatNumber(sub));

            tableRows.push(row);
            tableStyles.push(isPosible ? { fontStyle: 'italic', textColor: [120, 90, 0] } : {});
        });

        const columnStyles: any = hasItemDiscounts ? {
            0: { halign: 'center' }, // Pieza(s)
            1: { halign: 'left' }, // Descripción
            2: { halign: 'center' }, // Cant
            3: { halign: 'center' }, // Desc %
            4: { halign: 'right' }, // PU
            5: { halign: 'right' } // Total
        } : {
            0: { halign: 'center' }, // Pieza(s)
            1: { halign: 'left' }, // Descripción
            2: { halign: 'center' }, // Cant
            3: { halign: 'right' }, // PU
            4: { halign: 'right' } // Total
        };

        let penultColX = 0;
        let penultColWidth = 0;
        let lastColX = 0;
        let lastColWidth = 0;

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 70,
            theme: 'plain',
            styles: {
                fontSize: 9,
                cellPadding: 2,
                lineColor: [0, 0, 0],
                lineWidth: 0.1,
                textColor: [0, 0, 0]
            },
            headStyles: {
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                halign: 'center',
                lineWidth: 0.1,
                lineColor: [0, 0, 0]
            },
            columnStyles: columnStyles,
            willDrawCell: (data) => {
                if (data.section === 'body') {
                    const rowStyle = tableStyles[data.row.index];
                    if (rowStyle && rowStyle.fontStyle) {
                        data.cell.styles.fontStyle = rowStyle.fontStyle;
                        data.cell.styles.textColor = rowStyle.textColor;
                    }
                }
            },
            didDrawCell: (data) => {
                if (data.section === 'head') {
                    const lastIndex = tableColumn.length - 1;
                    const penultIndex = tableColumn.length - 2;

                    if (data.column.index === penultIndex) {
                        penultColX = data.cell.x;
                        penultColWidth = data.cell.width;
                    }
                    if (data.column.index === lastIndex) {
                        lastColX = data.cell.x;
                        lastColWidth = data.cell.width;
                    }
                }
            }
        });

        // Footnote for posible treatments
        if (hasPosible) {
            let noteY = (doc as any).lastAutoTable.finalY + 3;
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(120, 90, 0);
            doc.text('(*) Tratamiento posible — sujeto a evaluación; no incluido en el total.', 14, noteY);
            doc.setTextColor(0);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
        }

        // Totals Row
        let finalY = (doc as any).lastAutoTable.finalY + 5;

        // Fallback static positioning if capture failed
        if (lastColWidth === 0) {
            lastColWidth = 30; lastColX = 165;
            penultColWidth = 30; penultColX = 135;
        }

        doc.setFont('helvetica', 'bold');
        const isUSD = proforma.moneda === 'USD';
        const currencyLabel = isUSD ? 'USD' : 'Bs.';

        // Calculate dynamic width for TOTAL box to avoid text spilling out
        const minBoxWidth = 26; // Enough width for "TOTAL USD" or "TOTAL Bs."
        const finalBoxWidth = Math.max(penultColWidth, minBoxWidth);
        const finalBoxX = (penultColX + penultColWidth) - finalBoxWidth;

        // Subtotal row if there is a discount
        if (proforma.descuento && proforma.descuento > 0) {
            doc.text(`SUBTOTAL ${currencyLabel}`, finalBoxX + finalBoxWidth - 2, finalY, { align: 'right' });
            doc.text(formatNumber(proforma.sub_total / (proforma.tipoCambio || 1)), lastColX + lastColWidth - 2, finalY, { align: 'right' });
            finalY += 6;

            doc.text(`DESCUENTO (${proforma.descuento}%)`, finalBoxX + finalBoxWidth - 2, finalY, { align: 'right' });
            const montoDescuento = ((Number(proforma.sub_total) * Number(proforma.descuento)) / 100) / (proforma.tipoCambio || 1);
            doc.text(`-${formatNumber(montoDescuento)}`, lastColX + lastColWidth - 2, finalY, { align: 'right' });
            finalY += 6;
        }

        doc.rect(finalBoxX, finalY - 4, finalBoxWidth, 7);
        doc.rect(lastColX, finalY - 4, lastColWidth, 7);

        doc.text(`TOTAL ${currencyLabel}`, finalBoxX + finalBoxWidth - 2, finalY + 1, { align: 'right' });
        doc.text(formatNumber(proforma.total / (proforma.tipoCambio || 1)), lastColX + lastColWidth - 2, finalY + 1, { align: 'right' });

        finalY += 10;

        // 5. Amount in Words
        doc.setFont('helvetica', 'normal');
        const convertedTotal = proforma.total / (proforma.tipoCambio || 1);
        const decimalPart = formatNumber(convertedTotal).split(',')[1] || '00';
        const words = numberToWords(convertedTotal);
        doc.text(`SON: ${words} ${decimalPart}/100 ${isUSD ? 'DÓLARES AMERICANOS' : 'BOLIVIANOS'}`, 14, finalY);

        finalY += 15; // Space

        // 5.1 Proforma Note (User Note)
        if (proforma.nota) {
            doc.setFont('helvetica', 'bold');
            doc.text('Observación:', 14, finalY);

            doc.setFont('helvetica', 'normal');
            const splitNote = doc.splitTextToSize(proforma.nota, 180);
            doc.text(proforma.nota, 14, finalY + 5, { align: 'justify', maxWidth: 180 });

            finalY += (splitNote.length * 5) + 10;
        }

        // 7. Payment System (Moved up)
        if (includePaymentInfo) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            // doc.rect(14, finalY, 40, 5); // Removed box
            doc.text('SISTEMA DE PAGO', 14, finalY + 3.5);

            doc.setFont('helvetica', 'normal');
            // doc.rect(14, finalY + 6, 180, 5); // Removed box
            if (proforma.plan_pagos?.activo) {
                const meses = proforma.plan_pagos.meses;
                const dia = proforma.plan_pagos.diaPago;
                const cuotaInicial = proforma.plan_pagos.cuotaInicial || 0;
                const cuotaInicialConvertedRaw = cuotaInicial / (isUSD ? (proforma.tipoCambio || 1) : 1);
                const cuotaInicialConverted = formatNumber(cuotaInicialConvertedRaw);
                const montoParaCuotas = Math.max(0, convertedTotal - cuotaInicialConvertedRaw);
                
                const cuota = formatNumber(montoParaCuotas / meses);

                doc.text('Plan de Pagos Activo:', 14, finalY + 9.5);
                
                let tableBody = [];
                let fechaActual = new Date(proforma.plan_pagos.fechaInicio || proforma.fecha || new Date());
                
                if (cuotaInicial > 0) {
                    tableBody.push([
                        'Cuota Inicial', 
                        `${cuotaInicialConverted} ${isUSD ? 'USD' : 'Bs.'}`, 
                        fechaActual.toLocaleDateString('en-GB')
                    ]);
                }

                for (let i = 1; i <= meses; i++) {
                    let nextMonth = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + i, dia);
                    if (nextMonth.getMonth() !== (fechaActual.getMonth() + i) % 12) {
                        nextMonth = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + i + 1, 0);
                    }
                    tableBody.push([
                        `Cuota ${i}`, 
                        `${cuota} ${isUSD ? 'USD' : 'Bs.'}`, 
                        nextMonth.toLocaleDateString('en-GB')
                    ]);
                }

                autoTable(doc, {
                    startY: finalY + 12,
                    head: [['Detalle', 'Monto', 'Fecha Vencimiento']],
                    body: tableBody,
                    theme: 'grid',
                    styles: { fontSize: 9, cellPadding: 2, halign: 'center', textColor: [0, 0, 0], lineColor: [200, 200, 200], lineWidth: 0.1 },
                    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.1, lineColor: [200, 200, 200] },
                    margin: { left: 14, right: 14 }
                });

                finalY = (doc as any).lastAutoTable.finalY + 5;
            } else {
                doc.text('- Cancelación del 50% al inicio. 30% durante el tratamiento. 20% antes de finalizado el mismo.', 14, finalY + 9.5, { align: 'justify', maxWidth: 180 });
                finalY += 15;
            }
        } else {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            // Phase A
            // doc.rect(14, finalY, 60, 5); // Removed box
            doc.text('Fase A Quirurgica: Implante.', 14, finalY + 3.5);

            // Phase B
            const phaseBY = finalY + 7;
            const textPhaseB = 'Fase B Rehabilitación: Transcurridos 4 a 6 meses de la cirugía se realizará la rehabilitación, es decir muñones y coronas sobre implantes.';
            const splitPhaseB = doc.splitTextToSize(textPhaseB, 180);
            const heightPhaseB = splitPhaseB.length * 5;

            // doc.rect(14, phaseBY, 180, heightPhaseB + 2); // Removed box
            doc.text(splitPhaseB, 14, phaseBY + 4.5, { align: 'justify', maxWidth: 180 });

            finalY = phaseBY + heightPhaseB + 10;
        }

        // 8. Note (Static Disclaimer)
        doc.setFont('helvetica', 'bold');
        // doc.rect(14, finalY, 180, 8); // Removed box
        doc.text('NOTA: Se garantiza los trabajos realizados si el paciente sigue las recomendaciones indicadas y asiste a sus controles periódicos de manera puntual.', 14, finalY + 3.5, { align: 'justify', maxWidth: 180 });

        finalY += 12;

        // 9. Footer Text
        const footerY = finalY;
        doc.setFont('helvetica', 'normal');
        doc.text('El presente plan de tratamiento podría tener modificaciones en el transcurso del tratamiento; el mismo será notificado oportunamente a su persona.', 14, footerY, { align: 'justify', maxWidth: 180 });
        doc.text('Plan de tratamiento válido por 15 días.', 14, footerY + 10);
        doc.text('En conformidad y aceptando el presente plan de tratamiento, firmo.', 14, footerY + 15);

        // 10. Signatures
        const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
        let sigY = footerY + 60;
        if (sigY + 20 > pageHeight - 15) {
            doc.addPage();
            sigY = 40;
        }

        // Left Signature (Clinic/System)
        if (clinicSignature) {
            try {
                // Add signature image - positioned exactly above the line
                doc.addImage(clinicSignature.firmaData, 'PNG', 30, sigY - 22, 50, 25);
            } catch (err) {
                console.error('Error adding clinic signature to PDF:', err);
            }
        }
        doc.setDrawColor(0);
        doc.line(20, sigY + 7, 90, sigY + 7);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        const clinicName = clinicSignature ? formatFullName(clinicSignature.usuario) : 'Msc. Dr. Alfredo Dimitri Antequera Villagra';
        doc.text(clinicName, 55, sigY + 11, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        
        if (clinicSignature) {
            doc.text(clinicSignature.rolFirmante === 'doctor' ? 'ODONTÓLOGO' : 'PERSONAL', 55, sigY + 15, { align: 'center' });
        } else {
            doc.text('Cirujano Dentista', 55, sigY + 15, { align: 'center' });
            doc.text('M.P. No. 317 Col. 996', 55, sigY + 19, { align: 'center' });
            doc.setFontSize(8);
            doc.setTextColor('#555555');
            doc.text('Máster en Implantología Oral', 55, sigY + 23, { align: 'center' });
            doc.text('Endodoncia', 55, sigY + 27, { align: 'center' });
            doc.setTextColor(0);
        }

        // Right Signature (Patient)
        if (patientSignature) {
            try {
                // Add signature image - positioned exactly above the line
                doc.addImage(patientSignature.firmaData, 'PNG', 130, sigY - 22, 50, 25);
            } catch (err) {
                console.error('Error adding patient signature to PDF:', err);
            }
        }
        doc.setDrawColor(0);
        doc.line(120, sigY + 7, 190, sigY + 7);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(patientName, 155, sigY + 11, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.text('PACIENTE', 155, sigY + 15, { align: 'center' });

        // Add Centro Dental Footer
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
                
                doc.setTextColor('#555555');
                doc.text(footerString, 105, pageHeight - 11, { align: 'center', maxWidth: 180 });
            }
        }

        // --- PAGINA 2: ODONTOGRAMA ---
        doc.addPage();

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
                const stateCode = data.state;
                if (stateCode) {
                    const fig = getFigureForConditionCode(stateCode);
                    if (fig) figures.push(fig);
                }
                const connCode = data.connectionType;
                if (connCode) {
                    const fig = getFigureForConditionCode(connCode);
                    if (fig) figures.push(fig);
                }
            }

            if (proforma.detalles) {
                proforma.detalles.forEach(item => {
                    if (item.piezas) {
                        const toothList = item.piezas.split(',').map((p: string) => Number(p.trim()));
                        if (toothList.includes(num)) {
                            const config = getArancelConfig(item.arancelId || item.arancel?.id);
                            if (config?.odontogramaFigura && config.odontogramaFigura !== 'none') {
                                figures.push({
                                    type: config.odontogramaFigura,
                                    color: config.odontogramaColor || '#3b82f6'
                                });
                            }
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
            
            // State
            const state = data?.state;
            const isAbsent = state === 10;
            const isExtraction = state === 11;
            const isCorona = state === 12 || state === 13;
            const isImplante = state === 30;

            const toothY = isUpper ? y : y + 10;
            const surfaceYOffset = isUpper ? y + 18 : y;

            // Draw anatomical tooth base using our vector path drawer
            drawAnatomicalTooth(x, toothY, num, isAbsent || isExtraction);

            // Draw overlays / active figures
            const activeFigures = getActiveFiguresForTooth(num, data);
            for (const fig of activeFigures) {
                let imgToDraw: any = null;
                if (fig.type === 'implante') {
                    imgToDraw = await loadImage(implanteImg);
                } else if (fig.type === 'perno') {
                    imgToDraw = await loadImage(pernoImg);
                } else if (fig.type === 'circulo_corona') {
                    imgToDraw = await loadImage(coronaImg);
                } else if (fig.type.startsWith('dynamic:')) {
                    const pathKey = fig.type.replace('dynamic:', '');
                    const url = getFigureUrlByKey(pathKey);
                    if (url) {
                        try {
                            imgToDraw = await loadImage(url);
                        } catch (err) {
                            console.warn(`Failed to load dynamic figure: ${url}`, err);
                        }
                    }
                }
                
                if (imgToDraw) {
                    if (isUpper) {
                        doc.addImage(imgToDraw, 'PNG', x, toothY, 8, 16);
                    } else {
                        // Rotated 180 degrees
                        doc.addImage(imgToDraw, 'PNG', x + 8, toothY + 16, 8, 16, undefined, undefined, 180);
                    }
                }
            }
            
            // Draw surfaces if not absent, extracted, or implant
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
                
                const surfaces = data?.surfaces || {};
                
                const drawSurface = (surfaceName: string, points: number[][]) => {
                    const surfaceCode = surfaces[surfaceName];
                    let hexColor = 'transparent';
                    if (surfaceCode) {
                        hexColor = getColorForSurfaceCode(surfaceCode);
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

            // Draw cross X if absent or extracted
            if (isAbsent || isExtraction) {
                doc.setLineWidth(0.6);
                doc.setDrawColor(isAbsent ? 59 : 239, isAbsent ? 130 : 68, isAbsent ? 246 : 68);
                doc.line(x, toothY, x + 8, toothY + 16);
                doc.line(x + 8, toothY, x, toothY + 16);
            }
        };

        // Draw Header Page 2
        try {
            const logoSrc = '/logo-clinica-dental.jpg';
            if (logoSrc) {
                const logo = await loadImage(logoSrc);
                const targetHeight = 15;
                const targetWidth = (logo.width / logo.height) * targetHeight;
                doc.addImage(logo, 'JPEG', 14, 10, targetWidth, targetHeight);
            }
        } catch (error) {
            console.warn('Could not load logo for PDF Page 2', error);
        }
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(30, 64, 175);
        doc.text('REGISTRO DE ODONTOGRAMA CLÍNICO', 105, 20, { align: 'center' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text(`Plan de Tratamiento # ${proforma.numero.toString().padStart(2, '0')}`, 105, 25, { align: 'center' });
        
        // Line
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(14, 30, 196, 30);
        
        const mapDientes = proforma.odontograma_mapa || {};
        
        // Upper Adult (18 - 28)
        const upperAdult = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
        for (let idx = 0; idx < upperAdult.length; idx++) {
            const num = upperAdult[idx];
            const x = idx < 8 ? (25 + idx * 10) : (107 + (idx - 8) * 10);
            await drawSingleTooth(x, 40, num, mapDientes[num]);
        }
        
        // Upper Child (55 - 65)
        const upperChild = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
        for (let idx = 0; idx < upperChild.length; idx++) {
            const num = upperChild[idx];
            const x = idx < 5 ? (55 + idx * 10) : (107 + (idx - 5) * 10);
            await drawSingleTooth(x, 78, num, mapDientes[num]);
        }
        
        // Lower Child (85 - 75)
        const lowerChild = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
        for (let idx = 0; idx < lowerChild.length; idx++) {
            const num = lowerChild[idx];
            const x = idx < 5 ? (55 + idx * 10) : (107 + (idx - 5) * 10);
            await drawSingleTooth(x, 120, num, mapDientes[num]);
        }
        
        // Lower Adult (48 - 38)
        const lowerAdult = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
        for (let idx = 0; idx < lowerAdult.length; idx++) {
            const num = lowerAdult[idx];
            const x = idx < 8 ? (25 + idx * 10) : (107 + (idx - 8) * 10);
            await drawSingleTooth(x, 162, num, mapDientes[num]);
        }
        
        // Dividing lines removed
        
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
        } else if (action === 'download') {
            doc.save(`plan_de_tratamiento_${proforma.numero}_${paciente?.paterno}.pdf`);
        } else if (action === 'blob') {
            return doc.output('blob');
        }
    };

    return (
        <div className="content-card bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 transition-colors duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <div className="flex flex-col">
                    <h2 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                        <CreditCard className="text-blue-500" size={28} />
                        Presupuestos
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión de presupuestos y tratamientos</p>
                </div>
                <div className="flex flex-wrap gap-3 items-center justify-center md:justify-end">
                    <button
                        onClick={() => setShowManual(true)}
                        className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm"
                        title="Ayuda / Manual"
                    >
                        ?
                    </button>
                    <button
                        onClick={() => navigate(`/pacientes/${id}/propuestas?returnTo=presupuestos`)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-8 text-lg rounded-lg flex items-center gap-2 shadow-md transition-all transform hover:-translate-y-0.5"
                    >
                        <ClipboardList size={20} />
                        Propuestas
                    </button>
                    <Link
                        to={`/pacientes/${id}/presupuestos/create`}
                        className="bg-[#3498db] hover:bg-blue-600 text-white hover:text-white font-bold py-2.5 px-8 text-lg rounded-lg flex items-center gap-2 shadow-md transition-all transform hover:-translate-y-0.5"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nuevo Presupuesto
                    </Link>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 no-print">
                <div className="flex gap-2 w-full md:max-w-md">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Buscar por número, nota o fecha..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-300"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                        >
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            {/* Record Count */}
            {filteredProformas.length > 0 && (
                <div className="mb-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                    Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredProformas.length)} de {filteredProformas.length} presupuestos
                </div>
            )}

            <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider"># Plan</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Registrado Por</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total (Bs.)</th>

                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider no-print">Enviar</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider no-print">Imprimir</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider no-print">Exportar</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider no-print">Firmar</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider no-print">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {currentProformas.map((proforma) => {
                            const isCompleted = completedBudgets.has(proforma.id);
                            return (
                                <tr key={proforma.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className={`px-5 py-4 whitespace-nowrap text-sm font-medium ${isCompleted ? 'text-green-600 dark:text-green-400 line-through decoration-2' : 'text-gray-900 dark:text-gray-200'
                                        }`}>
                                        {proforma.numero}
                                    </td>
                                    <td className={`px-5 py-4 whitespace-nowrap text-sm ${isCompleted ? 'text-green-600 dark:text-green-400 line-through decoration-2' : 'text-gray-500 dark:text-gray-400'
                                        }`}>
                                        {formatDate(proforma.fecha)}
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {proforma.usuario?.name || 'Sistema'}
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap text-sm font-bold text-gray-800 dark:text-gray-200">
                                        <div className="flex items-center gap-1">
                                            {proforma.moneda === 'USD' ? <DollarSign size={14} className="text-emerald-500" /> : <span className="text-xs text-gray-500">Bs.</span>}
                                            {formatNumber(proforma.total / (proforma.tipoCambio || 1))}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap text-center no-print">
                                        <button
                                            onClick={() => handleSendWhatsApp(proforma, true)}
                                            className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md transition-all transform hover:-translate-y-0.5"
                                            title="Enviar por WhatsApp"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                            </svg>
                                        </button>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap text-center no-print">
                                        <button
                                            onClick={() => generatePDF(proforma, 'print', true)}
                                            className="p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                            title="Imprimir"
                                        >
                                            <Printer size={20} />
                                        </button>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap text-center no-print">
                                        <button
                                            onClick={() => generatePDF(proforma, 'download', true)}
                                            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-md transition-all transform hover:-translate-y-0.5"
                                            title="Exportar PDF"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </button>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap text-center no-print">
                                        {proforma.esta_firmado ? (
                                            <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-bold flex items-center justify-center gap-1 mx-auto w-fit">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Firmado
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setSelectedPresupuesto(proforma);
                                                    setShowSignatureModal(true);
                                                }}
                                                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-all transform hover:-translate-y-0.5"
                                                title="Firmar Plan de Tratamiento"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap text-center no-print">
                                        <div className="flex gap-2 justify-center">
                                            <button
                                                onClick={() => handleToggleCurrency(proforma)}
                                                className={`p-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 border ${proforma.moneda === 'USD' ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'}`}
                                                title={proforma.moneda === 'USD' ? "Volver a Bolivianos" : "Convertir a Dólares"}
                                            >
                                                <DollarSign size={20} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedPresupuesto(proforma);
                                                    setShowViewModal(true);
                                                }}
                                                className="p-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 shadow-md transition-all transform hover:-translate-y-0.5"
                                                title="Ver Detalle"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedOdontogramProforma(proforma);
                                                    setShowOdontogramModal(true);
                                                }}
                                                className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 shadow-md transition-all transform hover:-translate-y-0.5"
                                                title="Ver Odontograma"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M16 4h-8a4 4 0 0 0-4 4v3a7 7 0 0 0 7 7h2a7 7 0 0 0 7-7v-3a4 4 0 0 0-4-4z" />
                                                    <path d="M8 12a4 4 0 0 0 8 0" />
                                                </svg>
                                            </button>
                                            {isCompleted ? (
                                                <button disabled className="p-2 bg-gray-400 text-gray-200 rounded-lg shadow-md cursor-not-allowed opacity-60 inline-flex items-center justify-center" title="Plan Terminado - Edición Bloqueada">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                    </svg>
                                                </button>
                                            ) : (
                                                <Link
                                                    to={`/pacientes/${id}/presupuestos/edit/${proforma.id}`}
                                                    className="p-2 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 shadow-md transition-all transform hover:-translate-y-0.5 inline-flex items-center justify-center"
                                                    title="Editar"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                    </svg>
                                                </Link>
                                            )}
                                            <button
                                                onClick={() => handleDelete(proforma.id)}
                                                disabled={!canDeleteBudget(proforma.id)}
                                                className="p-2 bg-red-500 text-white rounded-lg shadow-md transition-all transform disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none hover:bg-red-600 hover:-translate-y-0.5"
                                                title={!canDeleteBudget(proforma.id) ? "No se puede eliminar: tiene pagos o seguimiento clínico asociado" : "Eliminar Plan de Tratamiento"}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredProformas.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                                    <div className="flex flex-col items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <p>No hay presupuestos registrados para este paciente.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {filteredProformas.length > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(filteredProformas.length / itemsPerPage)}
                    onPageChange={(page) => setCurrentPage(page)}
                />
            )}

            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Presupuestos"
                sections={manualSections}
            />

            {/* View Modal */}
            <PresupuestoViewModal
                isOpen={showViewModal}
                onClose={() => {
                    setShowViewModal(false);
                    setSelectedPresupuesto(null);
                }}
                id={id || ''}
                proformaId={selectedPresupuesto ? selectedPresupuesto.id.toString() : null}
                onUpdate={() => {
                    if (id) fetchProformas(Number(id));
                }}
            />

            {/* Signature Modal */}
            {showSignatureModal && selectedPresupuesto && (
                <SignatureModal
                    isOpen={showSignatureModal}
                    onClose={() => {
                        setShowSignatureModal(false);
                        setSelectedPresupuesto(null);
                    }}
                    tipoDocumento="presupuesto"
                    documentoId={selectedPresupuesto.id}
                    rolFirmante="paciente"
                    onSuccess={() => {
                        // Success handling already shows alert in SignatureModal
                    }}
                />
            )}

            {/* Modal de Odontograma */}
            {showOdontogramModal && selectedOdontogramProforma && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 transition-opacity">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Odontograma del Plan #{selectedOdontogramProforma.numero}
                            </h2>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 bg-gray-50 dark:bg-gray-900/50 min-h-[400px]">
                            <Odontogram
                                initialData={selectedOdontogramProforma.odontograma_mapa || {}}
                                readOnly={true}
                                dentitionType="adult"
                                treatmentPlanItems={getParsedPlanItems(selectedOdontogramProforma)}
                                aranceles={aranceles}
                                onSelectSurface={() => {}}
                                onSelectTooth={() => {}}
                            />
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end">
                            <button
                                onClick={() => setShowOdontogramModal(false)}
                                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-xl transition-all shadow-sm transform hover:-translate-y-0.5 active:scale-95"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default PresupuestoList;
