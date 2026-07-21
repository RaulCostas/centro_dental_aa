import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';
import type { Paciente, Propuesta } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDateSpanish, numberToWords, formatFullName, formatNumber, formatCurrency } from '../utils/formatters';
import { formatDate } from '../utils/dateUtils';
import ManualModal, { type ManualSection } from './ManualModal';
import Pagination from './Pagination';
import { Printer, MessageCircle, ClipboardList } from 'lucide-react';



const PropuestasList: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [paciente, setPaciente] = useState<Paciente | null>(null);
    const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showManual, setShowManual] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    

    const manualSections: ManualSection[] = [
        {
            title: 'Propuestas de Tratamiento',
            content: 'Gestión de múltiples opciones de tratamiento para el paciente. Puede crear hasta 6 variantes (A-F).'
        },
        {
            title: 'Opciones de Propuesta',
            content: 'Cada columna (Total A, Total B, etc.) muestra el costo total de esa opción. Si está vacía o en cero, no se ha cargado nada en esa letra.'
        },
        {
            title: 'Acciones',
            content: 'Use los botones para Ver (Ojo), Editar (Lápiz), Imprimir (Impresora) o Eliminar (Basurero) una propuesta.'
        },
        {
            title: 'Crear Nueva',
            content: 'Haga clic en "+ Nueva Propuesta" para diseñar opciones de tratamiento.'
        }];

    const filteredPropuestas = propuestas.filter(p =>
        p.numero.toString().includes(searchTerm) ||
        p.nota?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatDate(p.fecha).includes(searchTerm)
    );

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentPropuestas = filteredPropuestas.slice(indexOfFirstItem, indexOfLastItem);

    useEffect(() => {
        if (id) {
            fetchPaciente(Number(id));
            fetchPropuestas(Number(id));
        }
    }, [id]);

    const fetchPaciente = async (pacienteId: number) => {
        try {
            const response = await api.get(`/pacientes/${pacienteId}`);
            setPaciente(response.data);
        } catch (error) {
            console.error('Error fetching paciente:', error);
        }
    };

    const fetchPropuestas = async (pacienteId: number) => {
        try {
            const response = await api.get(`/propuestas/paciente/${pacienteId}`);
            setPropuestas(response.data);
        } catch (error) {
            console.error('Error fetching propuestas:', error);
        }
    };

    const handleVolver = () => {
        if (paciente) {
            const isParticular = !paciente.seguro || paciente.seguro?.nombre?.toLowerCase() === 'particular';
            const tipo = isParticular ? 'particular' : 'seguro';
            navigate(`/pacientes?tipo=${tipo}`);
        } else {
            navigate('/pacientes');
        }
    };

    const deletePropuesta = async (propuestaId: number) => {
        try {
            const result = await Swal.fire({
                title: '¿Estás seguro?',
                text: "No podrás revertir esto!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, eliminar!',
                cancelButtonText: 'Cancelar',
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });

            if (result.isConfirmed) {
                await api.delete(`/propuestas/${propuestaId}`);
                setPropuestas(propuestas.filter(p => p.id !== propuestaId));
                Swal.fire({
                    title: 'Eliminado!',
                    text: 'La propuesta ha sido eliminada.',
                    icon: 'success',
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });
            }
        } catch (error) {
            console.error('Error deleting propuesta:', error);
            Swal.fire({
                title: 'Error',
                text: 'No se pudo eliminar la propuesta',
                icon: 'error',
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
        }
    };

    const handleConvertToBudget = async (propuestaId: number, letra: string) => {
        const result = await Swal.fire({
            title: 'Convertir a Plan de Tratamiento',
            text: `¿Crear un nuevo plan de tratamiento con los items de la Propuesta ${letra}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, crear',
            background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
            color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
        });

        if (result.isConfirmed) {
            try {
                const usuarioId = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).id : 1;
                const response = await api.post(`/propuestas/${propuestaId}/convertir`, {
                    letra: letra,
                    usuarioId: usuarioId
                });

                Swal.fire({
                    icon: 'success',
                    title: '¡Creado!',
                    text: 'El plan de tratamiento ha sido creado.',
                    showConfirmButton: false,
                    timer: 1500,
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });

                navigate(`/pacientes/${id}/presupuestos`);

            } catch (error: any) {
                console.error('Error converting to budget:', error);
                const errorMessage = error.response?.data?.message || 'Error al crear el plan de tratamiento';
                Swal.fire({
                    title: 'Error',
                    text: errorMessage,
                    icon: 'error',
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });
            }
        }
    };

    const handleSendWhatsApp = async (propuesta: Propuesta, letra: string) => {
        if (!paciente?.telefono_celular) {
            Swal.fire({
                title: 'Error',
                text: 'El paciente no tiene un número de celular registrado.',
                icon: 'error',
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
            return;
        }

        const result = await Swal.fire({
            title: 'Enviar por WhatsApp',
            text: `¿Enviar la Propuesta ${letra} al paciente via WhatsApp?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#25D366',
            confirmButtonText: 'Sí, enviar',
            background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
            color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
        });

        if (result.isConfirmed) {
            try {
                // Check chatbot status first
                const statusResponse = await api.get('/chatbot/status');
                if (statusResponse.data.status !== 'connected') {
                    Swal.fire({
                        title: 'Bot Desconectado',
                        text: 'El chatbot no está conectado a WhatsApp. Por favor, conéctelo en Configuración.',
                        icon: 'warning',
                        background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                        color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                    });
                    return;
                }

                Swal.fire({
                    title: 'Generando y enviando...',
                    allowOutsideClick: false,
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                const doc = generatePDF(propuesta, 'blob', letra);
                const base64Data = doc.output('datauristring').split(',')[1];

                let celular = paciente.telefono_celular.replace(/\D/g, '');
                if (!celular.startsWith('591') && celular.length === 8) {
                    celular = `591${celular}`;
                }
                const jid = `${celular}@s.whatsapp.net`;

                await api.post('/chatbot/send-pdf', {
                    jid: jid,
                    base64: base64Data,
                    fileName: `Propuesta_${propuesta.numero}_Opción_${letra}.pdf`,
                    caption: `Hola ${paciente.nombre}, le envío la propuesta de tratamiento odontológico de la Clínica CENTRO DENTAL A&A.`
                });

                Swal.fire({
                    icon: 'success',
                    title: '¡Enviado!',
                    text: 'La propuesta ha sido enviada exitosamente.',
                    timer: 2000,
                    showConfirmButton: false,
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });

            } catch (error) {
                console.error('Error sending WhatsApp:', error);
                Swal.fire({
                    title: 'Error',
                    text: 'No se pudo enviar la propuesta por WhatsApp.',
                    icon: 'error',
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });
            }
        }
    };

    const generatePDF = async (propuesta: Propuesta, action: 'print' | 'download' | 'blob', letra?: string) => {
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

        // 1. Date (Right aligned)
        doc.setFontSize(10);
        doc.setTextColor(0);
        const dateStr = formatDateSpanish(propuesta.fecha);
        doc.text(dateStr, 200, 20, { align: 'right' });

        // 2. Salutation
        doc.setFont('helvetica', 'normal');
        doc.text('Señor(a):', 14, 35);

        doc.setFont('helvetica', 'bold');
        const patientName = formatFullName(paciente).toUpperCase();
        doc.text(patientName, 14, 40);

        doc.setFont('helvetica', 'normal');
        doc.text('De mi consideración:', 14, 50);
        doc.text('Según los estudios realizados le presentamos la siguiente propuesta del tratamiento odontológico que Ud. requiere:', 14, 55, { align: 'justify', maxWidth: 180 });

        // 3. Propuesta Number
        doc.setFont('helvetica', 'bold');
        const propNumber = letra ? `Prop. # ${propuesta.numero.toString().padStart(2, '0')} - Opción ${letra}` : `Prop. # ${propuesta.numero.toString().padStart(2, '0')}`;
        doc.text(propNumber, 200, 65, { align: 'right' });

        // 4. Table - Filter by letra if provided
        const filteredDetalles = letra ? propuesta.detalles.filter(d => d.letra === letra) : propuesta.detalles;

        let tableColumn = ["Pieza(s)", "Descripción", "Cant.", "P.U.", "Total"];
        const tableRows: any[] = [];

        filteredDetalles.forEach(item => {
            const row = [
                item.piezas,
                item.arancel?.detalle || '',
                item.cantidad,
                formatNumber(item.precioUnitario),
                formatNumber(item.total)
            ];
            tableRows.push(row);
        });

        const columnStyles: any = {
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

        // Totals Row
        let finalY = (doc as any).lastAutoTable.finalY + 5;

        // Fallback static positioning if capture failed
        if (lastColWidth === 0) {
            lastColWidth = 30; lastColX = 165;
            penultColWidth = 30; penultColX = 135;
        }

        doc.setFont('helvetica', 'bold');

        const subtotal = filteredDetalles.reduce((acc, curr) => acc + Number(curr.total), 0);
        const discount = (letra && propuesta.descuentos && propuesta.descuentos[letra]) ? Number(propuesta.descuentos[letra]) : 0;
        const totalAmount = subtotal - discount;

        // Draw Subtotal and Discount if exists
        if (discount > 0) {
            doc.text('SUBTOTAL Bs.', penultColX + penultColWidth - 2, finalY, { align: 'right' });
            doc.text(formatNumber(subtotal), lastColX + lastColWidth - 2, finalY, { align: 'right' });
            finalY += 6;

            doc.text('DESCUENTO (Bs.)', penultColX + penultColWidth - 2, finalY, { align: 'right' });
            doc.text(`-${formatNumber(discount)}`, lastColX + lastColWidth - 2, finalY, { align: 'right' });
            finalY += 6;
        }

        // Draw Total Box
        doc.rect(penultColX, finalY - 4, penultColWidth, 7);
        doc.rect(lastColX, finalY - 4, lastColWidth, 7);
        doc.text('TOTAL Bs.', penultColX + penultColWidth - 2, finalY + 1, { align: 'right' });
        doc.text(formatNumber(totalAmount), lastColX + lastColWidth - 2, finalY + 1, { align: 'right' });

        finalY += 10;

        // 5. Amount in Words
        doc.setFont('helvetica', 'normal');
        const decimalPart = formatNumber(totalAmount).split(',')[1] || '00';
        const words = numberToWords(totalAmount);
        doc.text(`SON: ${words} ${decimalPart}/100 BOLIVIANOS`, 14, finalY);

        finalY += 15;

        // 5.1 Propuesta Note
        if (propuesta.nota) {
            doc.setFont('helvetica', 'bold');
            doc.text('NOTA:', 14, finalY);

            doc.setFont('helvetica', 'normal');
            const splitNote = doc.splitTextToSize(propuesta.nota, 165);
            doc.text(splitNote, 30, finalY);

            finalY += (splitNote.length * 5) + 5;
        }

        finalY += 5;

        // 7. Payment System
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('SISTEMA DE PAGO', 14, finalY + 3.5);

        doc.setFont('helvetica', 'normal');
        doc.text('- Cancelación del 50% al inicio. 30% durante el tratamiento. 20% antes de finalizado el mismo.', 14, finalY + 9.5, { align: 'justify', maxWidth: 180 });

        finalY += 15;

        // 8. Note
        doc.setFont('helvetica', 'bold');
        doc.text('NOTA: Se garantiza los trabajos realizados si el paciente sigue las recomendaciones indicadas y asiste a sus controles periódicos de manera puntual.', 14, finalY + 3.5, { align: 'justify', maxWidth: 180 });

        finalY += 12;

        // 9. Footer Text
        doc.setFont('helvetica', 'normal');
        doc.text('El presente plan de tratamiento podría tener modificaciones en el transcurso del tratamiento; el mismo será notificado oportunamente a su persona.', 14, finalY, { align: 'justify', maxWidth: 180 });
        doc.text('Plan de Tratamiento válido por 15 días.', 14, finalY + 10);
        doc.text('En conformidad y aceptando el presente plan de tratamiento, firmo.', 14, finalY + 15);

        // 10. Signatures
        const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
        let sigY = finalY + 40;
        if (sigY + 20 > pageHeight - 15) {
            doc.addPage();
            sigY = 40;
        }

        // Left Signature
        doc.line(30, sigY, 80, sigY);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Msc. Dr. Alfredo Dimitri Antequera Villagra', 55, sigY + 5, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.text('Cirujano Dentista', 55, sigY + 9, { align: 'center' });
        doc.text('M.P. No. 317 Col. 996', 55, sigY + 13, { align: 'center' });
        doc.setFontSize(8);
        doc.setTextColor('#555555');
        doc.text('Máster en Implantología Oral', 55, sigY + 17, { align: 'center' });
        doc.text('Endodoncia', 55, sigY + 21, { align: 'center' });
        doc.setTextColor(0);

        // Right Signature
        doc.line(120, sigY, 180, sigY);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(patientName, 150, sigY + 5, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.text('PACIENTE', 150, sigY + 9, { align: 'center' });

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
                
                doc.setFontSize(8);
                doc.setTextColor('#555555');
                doc.text(footerString, 105, pageHeight - 11, { align: 'center', maxWidth: 180 });
            }
        }

        if (action === 'print') {
            const blobUrl = doc.output('bloburl');

            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            iframe.src = String(blobUrl);
            document.body.appendChild(iframe);

            iframe.onload = () => {
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
                                URL.revokeObjectURL(String(blobUrl));
                            }
                        }, 2000);
                    }
                }, 100);
            };
        } else if (action === 'download') {
            const fileName = letra
                ? `propuesta_${propuesta.numero}_${letra}_${paciente?.paterno}.pdf`
                : `propuesta_${propuesta.numero}_${paciente?.paterno}.pdf`;
            doc.save(fileName);
        }

        return doc;
    };

    return (
        <div className="content-card bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 transition-colors duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <div className="flex flex-col">
                    <h2 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                        <ClipboardList className="text-blue-500" size={28} />
                        Propuestas del Paciente
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión de alternativas de tratamiento</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center md:justify-end">
                    <button
                        onClick={() => setShowManual(true)}
                        className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="Ayuda / Manual"
                    >
                        ?
                    </button>

                    <Link
                        to={`/pacientes/${id}/propuestas/create`}
                        className="bg-purple-600 hover:bg-purple-700 text-white hover:text-white font-semibold py-2 px-6 rounded-lg flex items-center gap-2 shadow-md transition-all transform hover:-translate-y-0.5"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nueva Propuesta
                    </Link>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 no-print">
                <div className="flex gap-2 flex-grow max-w-md">
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
            {filteredPropuestas.length > 0 && (
                <div className="mb-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                    Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredPropuestas.length)} de {filteredPropuestas.length} registros
                </div>
            )}

            <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider"># Prop.</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Registrado Por</th>
                            {['A', 'B', 'C', 'D', 'E', 'F'].map(letra => (
                                <th key={letra} className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total {letra}</th>
                            ))}
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider no-print">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {currentPropuestas.map((propuesta) => {
                            const calculateTotalByLetra = (letra: string) => {
                                const subtotal = propuesta.detalles
                                    .filter(d => d.letra === letra)
                                    .reduce((acc, curr) => acc + Number(curr.total), 0);
                                const discount = (propuesta.descuentos && propuesta.descuentos[letra]) ? Number(propuesta.descuentos[letra]) : 0;
                                return subtotal - discount;
                            };

                            return (
                                <tr key={propuesta.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-5 py-4 whitespace-nowrap text-sm font-medium">{propuesta.numero}</td>
                                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(propuesta.fecha)}</td>
                                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{propuesta.usuario?.name || 'Sistema'}</td>
                                    {['A', 'B', 'C', 'D', 'E', 'F'].map(letra => {
                                        const total = calculateTotalByLetra(letra);
                                        return (
                                            <td key={letra} className="px-5 py-4 whitespace-nowrap text-sm text-center">
                                                {total > 0 ? (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <span className="font-bold text-gray-800 dark:text-gray-200">{formatNumber(total)}</span>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => generatePDF(propuesta, 'print', letra)}
                                                                className="p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                                                title={`Imprimir Opción ${letra}`}
                                                            >
                                                                <Printer size={20} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleConvertToBudget(propuesta.id, letra)}
                                                                className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                                                title={`Pasar Opción ${letra} a Plan de Tratamiento`}
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => handleSendWhatsApp(propuesta, letra)}
                                                                className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                                                title={`Enviar Opción ${letra} por WhatsApp`}
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-600">-</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="px-5 py-4 whitespace-nowrap text-center no-print">
                                        <div className="flex gap-2 justify-center">
                                            <button
                                                onClick={() => navigate(`/pacientes/${id}/propuestas/view/${propuesta.id}`)}
                                                className="p-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 shadow-md transition-all transform hover:-translate-y-0.5"
                                                title="Ver"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </button>
                                            <Link
                                                to={`/pacientes/${id}/propuestas/edit/${propuesta.id}`}
                                                className="p-2 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 shadow-md transition-all transform hover:-translate-y-0.5 inline-flex items-center justify-center"
                                                title="Editar"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                </svg>
                                            </Link>
                                            <button
                                                onClick={() => deletePropuesta(propuesta.id)}
                                                className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-md transition-all transform hover:-translate-y-0.5"
                                                title="Eliminar"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredPropuestas.length === 0 && (
                            <tr>
                                <td colSpan={10} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                                    <div className="flex flex-col items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <p>No hay propuestas registradas para este paciente.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {filteredPropuestas.length > itemsPerPage && (
                <div className="mt-4">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(filteredPropuestas.length / itemsPerPage)}
                        onPageChange={(page) => setCurrentPage(page)}
                    />
                </div>
            )}

            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Propuestas"
                sections={manualSections}
            />
        </div>
    );
};

export default PropuestasList;
