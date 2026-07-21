import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Printer, Search, Calendar, FileText, PenTool, CheckCircle, Eye, Image as ImageIcon, X, XCircle } from 'lucide-react';
import api from '../services/api';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatFullName, formatDateSpanish, formatDateUTC } from '../utils/formatters';
import Pagination from './Pagination';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import SignatureModal from './SignatureModal';
import ManualModal, { type ManualSection } from './ManualModal';

import { useParams } from 'react-router-dom';

const PacienteTabInformes: React.FC = () => {
    const { id: pacienteId } = useParams<{ id: string }>();
    const [paciente, setPaciente] = useState<any>(null);
    const [informes, setInformes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingInforme, setEditingInforme] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showManual, setShowManual] = useState(false);
    const [viewingInforme, setViewingInforme] = useState<any>(null);
    const limit = 10;
    
    const manualSections: ManualSection[] = [
        {
            title: 'Gestión de Informes',
            content: 'El módulo de Informes Odontológicos permite redactar y guardar documentos e informes formales para los pacientes.'
        },
        {
            title: 'Crear Nuevo Informe',
            content: 'Use el botón "+ Nuevo Informe" para abrir el editor. La fecha y sus datos profesionales se colocarán automáticamente.'
        },
        {
            title: 'Firma Digital',
            content: 'Una vez generado, puede utilizar el botón de "Firma Paciente" (icono de pluma) para solicitar la firma digital del paciente en tableta o celular.'
        }
    ];
    
    // Form state
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [contenido, setContenido] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Signature state
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [selectedInforme, setSelectedInforme] = useState<any>(null);

    // Extra states for Seguimiento and Images
    const [historiaClinica, setHistoriaClinica] = useState<any[]>([]);
    const [proformas, setProformas] = useState<any[]>([]);
    const [generalImages, setGeneralImages] = useState<any[]>([]);
    const [proformaImages, setProformaImages] = useState<{ [key: number]: any[] }>({});
    
    const [showSeguimientoModal, setShowSeguimientoModal] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImages, setSelectedImages] = useState<any[]>([]);

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'align': [] }],
            ['clean']
        ],
    };

    const fetchInformes = async () => {
        setIsLoading(true);
        try {
            const response = await api.get(`/informes?pacienteId=${pacienteId}`);
            setInformes(response.data || []);
            const resPaciente = await api.get(`/pacientes/${pacienteId}`);
            if (resPaciente.data) {
                setPaciente(resPaciente.data);
            }
        } catch (error) {
            console.error("Error fetching informes:", error);
            Swal.fire('Error', 'No se pudieron cargar los informes médicos.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchExtraData = async () => {
        try {
            const [historiaRes, proformasRes, genImagesRes] = await Promise.all([
                api.get(`/historia-clinica/paciente/${pacienteId}`),
                api.get(`/proformas/paciente/${pacienteId}`),
                api.get(`/proformas/paciente/${pacienteId}/imagenes-generales`)
            ]);
            setHistoriaClinica(historiaRes.data || []);
            const proformasData = proformasRes.data || [];
            setProformas(proformasData);
            setGeneralImages(genImagesRes.data || []);

            const proformaImgs: { [key: number]: any[] } = {};
            for (const p of proformasData) {
                try {
                    const imgRes = await api.get(`/proformas/${p.id}/imagenes`);
                    proformaImgs[p.id] = imgRes.data || [];
                } catch (e) { console.error(e); }
            }
            setProformaImages(proformaImgs);
        } catch (error) {
            console.error("Error fetching extra data:", error);
        }
    };

    useEffect(() => {
        fetchInformes();
        fetchExtraData();
    }, [pacienteId]);

    const handleOpenForm = (informe?: any) => {
        if (informe) {
            setEditingInforme(informe);
            setFecha(informe.fecha);
            setContenido(informe.contenido);
        } else {
            setEditingInforme(null);
            setFecha(new Date().toISOString().split('T')[0]);
            setContenido('');
        }
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingInforme(null);
        setContenido('');
    };
    const handleInsertSeguimiento = (seguimiento: any) => {
        const fechaStr = formatDateUTC(seguimiento.fecha);
        const pNumero = proformas.find(p => p.id === seguimiento.proformaId)?.numero || 'N/A';
        const obs = seguimiento.observaciones ? seguimiento.observaciones : '-';
        const pieza = seguimiento.pieza ? seguimiento.pieza : '-';
        
        const tableHtml = `
            <table class="seguimiento-table" style="width: 100%; border-collapse: collapse; border: 1px solid #ddd; margin-bottom: 10px;" border="1">
                <tbody>
                    <tr style="background-color: #f3f4f6;">
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: left;"><strong>Fecha</strong></td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: left;"><strong>Plan #</strong></td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: left;"><strong>Tratamiento</strong></td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: left;"><strong>Pieza</strong></td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: left;"><strong>Observaciones</strong></td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;">${fechaStr}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${pNumero}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${seguimiento.tratamiento || '-'}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${pieza}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${obs}</td>
                    </tr>
                </tbody>
            </table><p><br/></p>
        `;
        setContenido(prev => prev + tableHtml);
        setShowSeguimientoModal(false);
    };

    const toggleImageSelection = (img: any) => {
        if (selectedImages.find(i => i.id === img.id)) {
            setSelectedImages(selectedImages.filter(i => i.id !== img.id));
        } else {
            setSelectedImages([...selectedImages, img]);
        }
    };

    const handleInsertImages = () => {
        if (selectedImages.length === 0) return;
        let txt = '';
        const baseUrl = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : '';
        
        txt += `<p class="ql-align-center">`;
        for (let i = 0; i < selectedImages.length; i++) {
            const img = selectedImages[i];
            const imgUrl = img?.ruta?.startsWith('http') ? img.ruta : baseUrl + (img?.ruta || '');
            
            txt += `<img src="${imgUrl}" alt="${img.descripcion || ''}" />`;
        }
        txt += `</p><p><br/></p>`;
        
        setContenido(prev => prev + txt);
        setShowImageModal(false);
        setSelectedImages([]);
    };


    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!contenido || contenido === '<p><br></p>') {
            Swal.fire('Atención', 'El contenido del informe no puede estar vacío.', 'warning');
            return;
        }

        setIsSaving(true);
        try {
            const userStr = localStorage.getItem('user');
            let userId = null;
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    userId = user.id ? Number(user.id) : null;
                } catch {
                    // ignore
                }
            }

            const payload = {
                pacienteId: Number(pacienteId),
                fecha,
                contenido,
                userId: userId
            };

            if (editingInforme) {
                await api.patch(`/informes/${editingInforme.id}`, payload);
                Swal.fire({
                    icon: 'success',
                    title: 'Informe actualizado',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await api.post('/informes', payload);
                Swal.fire({
                    icon: 'success',
                    title: 'Informe creado',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
            handleCloseForm();
            fetchInformes();
        } catch (error: any) {
            console.error("Error saving informe:", error);
            Swal.fire('Error', error.response?.data?.message || 'Error al guardar el informe.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Eliminar informe?',
            text: "Esta acción no se puede deshacer.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/informes/${id}`);
                Swal.fire('Eliminado', 'El informe ha sido eliminado.', 'success');
                fetchInformes();
            } catch (error) {
                console.error("Error deleting informe:", error);
                Swal.fire('Error', 'No se pudo eliminar el informe.', 'error');
            }
        }
    };

    const stripHtmlTags = (html: string) => {
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    };

    const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src;
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(e);
        });
    };

    const handlePrint = async (informe: any, returnBase64 = false): Promise<string | void> => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        let cursorY = 15;

        // Fetch signatures
        let patientSignature = null;
        try {
            const sigRes = await api.get(`/firmas?tipoDocumento=informe_medico&documentoId=${informe.id}`);
            if (sigRes.data && sigRes.data.length > 0) {
                patientSignature = sigRes.data.find((s: any) => s.rolFirmante === 'paciente');
            }
        } catch (error) {
            console.error("Error fetching signatures", error);
        }

        // Fetch Centro Dental data
        let centroDental: any = null;
        try {
            const resCentro = await api.get('/datos-centro-dental');
            if (resCentro.data && resCentro.data.length > 0) {
                centroDental = resCentro.data[0];
            }
        } catch (error) {
            console.error('Error fetching centro dental data:', error);
        }

        // Logo
        try {
            const logo = await loadImage("/logo-clinica-dental.jpg");
            const targetHeight = 15;
            const targetWidth = (logo.width / logo.height) * targetHeight;
            doc.addImage(logo, 'JPEG', 14, cursorY, targetWidth, targetHeight);
            cursorY += targetHeight + 5;
        } catch (e) {
            console.warn('Logo could not be loaded');
        }

        // Date (Right aligned, La Paz format)
        const dateObj = new Date(informe.fecha + 'T00:00:00');
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const dateFormatted = `La Paz, ${dateObj.getDate()} de ${months[dateObj.getMonth()]} de ${dateObj.getFullYear()}`;
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        doc.text(dateFormatted, pageWidth - 14, cursorY, { align: 'right' });
        cursorY += 15;

        // Title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('INFORME ODONTOLÓGICO', pageWidth / 2, cursorY, { align: 'center' });
        cursorY += 15;

        // Patient Info
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('PACIENTE:', 14, cursorY);
        doc.setFont('helvetica', 'normal');
        doc.text(paciente ? formatFullName(paciente).toUpperCase() : 'N/A', 40, cursorY);
        cursorY += 7;

        doc.setFont('helvetica', 'bold');
        doc.text('C.I.:', 14, cursorY);
        doc.setFont('helvetica', 'normal');
        doc.text(paciente && paciente.ci ? paciente.ci : 'N/A', 40, cursorY);
        cursorY += 7;

        doc.setFont('helvetica', 'bold');
        doc.text('FECHA NAC.:', 14, cursorY);
        doc.setFont('helvetica', 'normal');
        let fechaNacFormatted = 'N/A';
        if (paciente && paciente.fecha_nacimiento) {
            const parts = paciente.fecha_nacimiento.split('T')[0].split('-');
            if (parts.length === 3) {
                fechaNacFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
            } else {
                fechaNacFormatted = paciente.fecha_nacimiento;
            }
        }
        doc.text(fechaNacFormatted, 40, cursorY);
        cursorY += 7;

        doc.setFont('helvetica', 'bold');
        doc.text('CELULAR:', 14, cursorY);
        doc.setFont('helvetica', 'normal');
        let celularFormatted = 'N/A';
        if (paciente && paciente.telefono_celular) {
            let clean = paciente.telefono_celular.replace(/\s+/g, '');
            if (clean.startsWith('+591')) clean = clean.substring(4);
            else if (clean.startsWith('591') && clean.length > 8) clean = clean.substring(3);
            celularFormatted = `(+591)${clean}`;
        }
        doc.text(celularFormatted, 40, cursorY);
        cursorY += 7;

        doc.setFont('helvetica', 'bold');
        doc.text('DIRECCIÓN:', 14, cursorY);
        doc.setFont('helvetica', 'normal');
        doc.text(paciente && paciente.direccion ? paciente.direccion : 'N/A', 40, cursorY);
        cursorY += 15;

        // Content parsed via DOMParser for tables and image grids
        const parser = new DOMParser();
        const docHtml = parser.parseFromString(informe.contenido, 'text/html');
        const elements = Array.from(docHtml.body.children);
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');

        for (const el of elements) {
            if (el.tagName === 'TABLE') {
                autoTable(doc, {
                    html: el as HTMLTableElement,
                    startY: cursorY,
                    theme: 'grid',
                    styles: { fontSize: 9, cellPadding: 2 },
                    headStyles: { fillColor: [243, 244, 246], textColor: 20 },
                    columnStyles: { 0: { cellWidth: 22 } }
                });
                cursorY = (doc as any).lastAutoTable.finalY + 10;
            } else {
                let plain = el.outerHTML
                    .replace(/<\/p>/gi, '\n')
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<li>/gi, '• ')
                    .replace(/<\/li>/gi, '\n');
                plain = stripHtmlTags(plain).trim();
                
                if (plain) {
                    const textLines = doc.splitTextToSize(plain, pageWidth - 28);
                    if (cursorY + (textLines.length * 5) > pageHeight - 20) {
                        doc.addPage();
                        cursorY = 20;
                    }
                    doc.text(plain, 14, cursorY, { align: 'justify', maxWidth: pageWidth - 28 });
                    cursorY += (textLines.length * 5) + 5;
                }
                
                // Handle images inside the paragraph
                const imgs = Array.from(el.querySelectorAll('img'));
                if (imgs.length > 0) {
                    const rowHeight = 80;
                    const gap = 10;
                    const availableWidth = pageWidth - 28;
                    
                    for (let i = 0; i < imgs.length; i++) {
                        try {
                            if (i % 2 === 0 && cursorY + rowHeight > pageHeight - 20) {
                                doc.addPage();
                                cursorY = 20;
                            }
                            
                            const image = await loadImage(imgs[i].src);
                            const cellWidth = imgs.length === 1 ? availableWidth : (availableWidth - gap) / 2;
                            const xOffset = 14 + (i % 2) * (cellWidth + gap);
                            
                            let finalW = image.width;
                            let finalH = image.height;
                            if (finalW > cellWidth) { finalH = (cellWidth/finalW)*finalH; finalW = cellWidth; }
                            if (finalH > rowHeight) { finalW = (rowHeight/finalH)*finalW; finalH = rowHeight; }
                            
                            // Center horizontally in the cell
                            const cellXOffset = xOffset + (cellWidth - finalW) / 2;
                            
                            const extension = imgs[i].src.split('.').pop()?.toLowerCase();
                            const format = extension === 'png' ? 'PNG' : 'JPEG';
                            
                            doc.addImage(image, format, cellXOffset, cursorY, finalW, finalH);
                            
                            if (i % 2 === 1 || i === imgs.length - 1) {
                                cursorY += rowHeight + gap;
                            }
                        } catch(e) {
                            console.warn("Error loading image", imgs[i].src);
                        }
                    }
                }
            }
        }
        cursorY += 10;

        // Check page break for signatures
        if (cursorY + 40 > pageHeight - 20) {
            doc.addPage();
            cursorY = 40;
        }

        // Signatures
        // Doctor Signature (Centered or Left if Patient exists)
        if (patientSignature) {
            // Left Signature
            doc.line(30, cursorY, 80, cursorY);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('Msc. Dr. Alfredo Dimitri Antequera Villagra', 55, cursorY + 5, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.text('Cirujano Dentista', 55, cursorY + 9, { align: 'center' });
            doc.text('M.P. No. 317 Col. 996', 55, cursorY + 13, { align: 'center' });
            doc.setFontSize(8);
            doc.setTextColor('#555555');
            doc.text('Máster en Implantología Oral', 55, cursorY + 17, { align: 'center' });
            doc.text('Endodoncia', 55, cursorY + 21, { align: 'center' });
            doc.setTextColor(0);

            // Right Signature (Patient)
            try {
                doc.addImage(patientSignature.firmaData, 'PNG', 125, cursorY - 22, 50, 25);
            } catch {
                // ignore
            }
            doc.line(120, cursorY, 180, cursorY);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(paciente ? formatFullName(paciente).toUpperCase() : 'N/A', 150, cursorY + 5, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.text('PACIENTE', 150, cursorY + 9, { align: 'center' });
        } else {
            // Centered Doctor Signature
            doc.line(pageWidth/2 - 30, cursorY, pageWidth/2 + 30, cursorY);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('Msc. Dr. Alfredo Dimitri Antequera Villagra', pageWidth/2, cursorY + 5, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.text('Cirujano Dentista', pageWidth/2, cursorY + 9, { align: 'center' });
            doc.text('M.P. No. 317 Col. 996', pageWidth/2, cursorY + 13, { align: 'center' });
            doc.setFontSize(8);
            doc.setTextColor('#555555');
            doc.text('Máster en Implantología Oral', pageWidth/2, cursorY + 17, { align: 'center' });
            doc.text('Endodoncia', pageWidth/2, cursorY + 21, { align: 'center' });
            doc.setTextColor(0);
        }

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
                doc.setDrawColor(221, 221, 221);
                doc.line(14, pageHeight - 16, pageWidth - 14, pageHeight - 16);
                doc.setFontSize(8);
                doc.setTextColor('#555555');
                doc.text(footerString, pageWidth / 2, pageHeight - 11, { align: 'center', maxWidth: 180 });
            }
        }

        if (returnBase64) {
            return doc.output('datauristring').split('base64,')[1];
        } else {
            doc.autoPrint();
            const blobUrl = doc.output('bloburl');
            window.open(String(blobUrl), '_blank');
        }
    };

    const handleSendWhatsApp = async (informe: any) => {
        let defaultPhone = paciente?.telefono_celular || paciente?.celular || '';
        defaultPhone = defaultPhone.replace(/\+/g, '').replace(/\s/g, '');
        let defaultCode = '591';
        
        if (defaultPhone.startsWith('591')) {
            defaultPhone = defaultPhone.substring(3);
        } else if (defaultPhone.length > 8 && (defaultPhone.startsWith('54') || defaultPhone.startsWith('56') || defaultPhone.startsWith('51') || defaultPhone.startsWith('55') || defaultPhone.startsWith('57') || defaultPhone.startsWith('52') || defaultPhone.startsWith('34'))) {
            defaultCode = defaultPhone.substring(0, 2);
            defaultPhone = defaultPhone.substring(2);
        } else if (defaultPhone.length > 10 && defaultPhone.startsWith('1')) {
            defaultCode = '1';
            defaultPhone = defaultPhone.substring(1);
        }

        const isDark = document.documentElement.classList.contains('dark');
        
        const result = await Swal.fire({
            title: 'Enviar por WhatsApp',
            html: `
                <div style="text-align: left; margin-bottom: 8px; font-size: 14px; color: ${isDark ? '#d1d5db' : '#4b5563'};">
                    Seleccione el código de país e ingrese el número:
                </div>
                <div style="display: flex; gap: 10px; align-items: center; justify-content: center;">
                    <select id="country-code" class="swal2-select" style="margin: 0; width: 40%; font-size: 15px; padding: 5px;">
                        <option value="591" ${defaultCode === '591' ? 'selected' : ''}>🇧🇴 +591</option>
                        <option value="54" ${defaultCode === '54' ? 'selected' : ''}>🇦🇷 +54</option>
                        <option value="56" ${defaultCode === '56' ? 'selected' : ''}>🇨🇱 +56</option>
                        <option value="51" ${defaultCode === '51' ? 'selected' : ''}>🇵🇪 +51</option>
                        <option value="55" ${defaultCode === '55' ? 'selected' : ''}>🇧🇷 +55</option>
                        <option value="57" ${defaultCode === '57' ? 'selected' : ''}>🇨🇴 +57</option>
                        <option value="52" ${defaultCode === '52' ? 'selected' : ''}>🇲🇽 +52</option>
                        <option value="34" ${defaultCode === '34' ? 'selected' : ''}>🇪🇸 +34</option>
                        <option value="1" ${defaultCode === '1' ? 'selected' : ''}>🇺🇸 +1</option>
                    </select>
                    <input id="phone-number" class="swal2-input" placeholder="Número" type="number" style="margin: 0; width: 60%; font-size: 16px;" value="${defaultPhone}">
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#25D366',
            confirmButtonText: 'Sí, enviar',
            cancelButtonText: 'Cancelar',
            background: isDark ? '#1f2937' : '#fff',
            color: isDark ? '#f3f4f6' : '#000',
            preConfirm: () => {
                const code = (document.getElementById('country-code') as HTMLSelectElement).value;
                const num = (document.getElementById('phone-number') as HTMLInputElement).value;
                if (!num || num.trim() === '') {
                    Swal.showValidationMessage('¡Necesita escribir un número de celular!');
                    return false;
                }
                return code + num.trim();
            }
        });

        if (result.isConfirmed && result.value) {
            const celular = result.value.replace(/\+/g, '').replace(/\s/g, '');
            
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

                const base64Data = await handlePrint(informe, true);
                
                if (!base64Data) {
                    throw new Error("No se pudo generar el PDF");
                }

                const jid = `${celular}@s.whatsapp.net`;
                await api.post('/chatbot/send-pdf', {
                    jid: jid,
                    base64: base64Data,
                    fileName: `Informe_Odontologico_${formatDateUTC(informe.fecha).replace(/\//g, '-')}.pdf`,
                    caption: `Hola ${paciente?.nombre || ''}, le adjunto su Informe Odontológico de la Clínica CENTRO DENTAL A&A.`
                });

                Swal.fire({
                    icon: 'success',
                    title: '¡Enviado!',
                    text: 'El informe ha sido enviado exitosamente.',
                    timer: 2000,
                    showConfirmButton: false,
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });

            } catch (error) {
                console.error('Error sending WhatsApp:', error);
                Swal.fire({
                    title: 'Error',
                    text: 'No se pudo enviar el informe por WhatsApp.',
                    icon: 'error',
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });
            }
        }
    };

    const filteredInformes = informes.filter(inf => 
        inf.contenido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inf.fecha?.includes(searchTerm)
    );

    const paginatedInformes = filteredInformes.slice((currentPage - 1) * limit, currentPage * limit);

    return (
        <div className="content-card p-6 bg-gray-50 dark:bg-gray-800 min-h-screen">
            <style>{`
                .ql-editor img, .report-view img {
                    width: calc(50% - 12px) !important;
                    max-width: 400px !important;
                    height: auto !important;
                    display: inline-block !important;
                    margin: 4px !important;
                    vertical-align: middle !important;
                    border-radius: 4px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .ql-editor table, .report-view table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                    margin-bottom: 10px !important;
                }
                .ql-editor td, .report-view td, .ql-editor th, .report-view th {
                    border: 1px solid #ddd !important;
                    padding: 8px !important;
                }
            `}</style>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex flex-col">
                    <h2 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                        <FileText className="text-blue-500" size={28} />
                        Informes Odontológicos
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión de informes odontológicos del paciente</p>
                </div>
                
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowManual(true)}
                        className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="Ayuda / Manual"
                    >
                        ?
                    </button>
                    <button
                        onClick={() => handleOpenForm()}
                        className="bg-[#3498db] hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <span className="text-xl font-bold">+</span> Nuevo Informe
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center gap-4">
                <div className="flex gap-2 w-full md:max-w-md">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Buscar en informes..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-300"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                    {searchTerm && (
                        <button
                            onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                        >
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">#</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">Fecha</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vista Previa</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Firma Paciente</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-48">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {paginatedInformes.map((informe, index) => (
                                <tr key={informe.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-medium">
                                        {(currentPage - 1) * limit + index + 1}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-medium">
                                        {formatDateUTC(informe.fecha)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-[200px]">
                                        <div className="truncate" title={stripHtmlTags(informe.contenido)}>
                                            {stripHtmlTags(informe.contenido)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="flex justify-center items-center gap-2">
                                            {informe.esta_firmado ? (
                                                <div className="flex items-center text-green-600 dark:text-green-400 font-bold" title="Informe Firmado">
                                                    <CheckCircle size={20} className="mr-1" />
                                                    <span className="text-xs">Firmado</span>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setSelectedInforme(informe);
                                                        setShowSignatureModal(true);
                                                    }}
                                                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-all transform hover:-translate-y-0.5"
                                                    title="Firmar Informe"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setViewingInforme(informe)}
                                                className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                                title="Ver Informe"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleSendWhatsApp(informe)}
                                                className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                                title="Enviar por WhatsApp"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handlePrint(informe)}
                                                className="p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                                title="Imprimir"
                                            >
                                                <Printer size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleOpenForm(informe)}
                                                className="p-2 bg-amber-400 hover:bg-amber-500 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                                title="Editar"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(informe.id)}
                                                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {paginatedInformes.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
                                        No hay informes odontológicos registrados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {filteredInformes.length > limit && (
                <div className="mt-6 flex justify-center">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(filteredInformes.length / limit)}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}

            {/* Modal Form */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <FileText className="text-[#3498db]" />
                                {editingInforme ? 'Editar Informe Odontológico' : 'Nuevo Informe Odontológico'}
                            </h3>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <form id="informeForm" onSubmit={handleSave} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <Calendar size={16} className="text-blue-500" />
                                            Fecha del Informe
                                        </label>
                                        <input
                                            type="date"
                                            value={fecha}
                                            onChange={(e) => setFecha(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <FileText size={16} className="text-blue-500" />
                                            Contenido
                                        </label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowSeguimientoModal(true)}
                                                className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 py-1 px-3 rounded-lg flex items-center gap-1 transition-colors"
                                            >
                                                <Plus size={14} /> Añadir Seguimiento
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowImageModal(true)}
                                                className="text-xs bg-green-100 hover:bg-green-200 text-green-700 py-1 px-3 rounded-lg flex items-center gap-1 transition-colors"
                                            >
                                                <ImageIcon size={14} /> Añadir Imagen
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-lg text-black dark:text-white">
                                        <ReactQuill
                                            theme="snow"
                                            value={contenido}
                                            onChange={setContenido}
                                            modules={modules}
                                            className="h-64 mb-12 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex justify-start gap-3">
                            <button
                                type="submit"
                                form="informeForm"
                                disabled={isSaving}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-xl flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md disabled:opacity-50"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                    <polyline points="7 3 7 8 15 8"></polyline>
                                </svg>
                                {isSaving ? 'Guardando...' : 'Guardar Informe'}
                            </button>
                            <button
                                type="button"
                                onClick={handleCloseForm}
                                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Signature Modal */}
            {showSignatureModal && selectedInforme && (
                <SignatureModal
                    isOpen={showSignatureModal}
                    onClose={() => {
                        setShowSignatureModal(false);
                        setSelectedInforme(null);
                    }}
                    tipoDocumento="informe_medico"
                    documentoId={selectedInforme.id}
                    rolFirmante="paciente"
                    onSuccess={() => {
                        setInformes(informes.map(inf => inf.id === selectedInforme.id ? {...inf, esta_firmado: true} : inf));
                    }}
                />
            )}

            {/* Ver Informe Modal */}
            {viewingInforme && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <FileText className="text-[#3498db]" />
                                Ver Informe Odontológico
                                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                                    ({formatDateSpanish(viewingInforme.fecha)})
                                </span>
                            </h3>
                        </div>
                        <div className="p-8 overflow-y-auto overflow-x-hidden flex-1 bg-white dark:bg-gray-900">
                            <div className="report-view prose dark:prose-invert max-w-none break-words whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: viewingInforme.contenido }} />
                        </div>
                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex justify-end">
                            <button
                                onClick={() => setViewingInforme(null)}
                                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Seguimiento Modal */}
            {showSeguimientoModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Seleccionar Seguimiento Clínico</h3>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 bg-white dark:bg-gray-800">
                            {!Array.isArray(historiaClinica) || historiaClinica.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">No hay seguimientos registrados.</p>
                            ) : (
                                <div className="space-y-4">
                                    {[...historiaClinica].filter(h => h && h.fecha).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map(h => {
                                        const pNum = proformas.find(p => p.id === h.proformaId)?.numero || 'N/A';
                                        return (
                                            <div key={h.id} className="border dark:border-gray-700 p-4 rounded-lg flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <div>
                                                    <p className="font-bold text-sm text-gray-800 dark:text-white">Fecha: {formatDateUTC(h.fecha)} - Plan #{pNum}</p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-300">Tratamiento: {h.tratamiento || 'Tratamiento General'}</p>
                                                    {h.pieza && <p className="text-xs text-gray-500 dark:text-gray-400">Pieza: {h.pieza}</p>}
                                                    {h.observaciones && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Obs: {h.observaciones}</p>}
                                                </div>
                                                <button
                                                    onClick={() => handleInsertSeguimiento(h)}
                                                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-transform transform hover:scale-105 active:scale-95 shadow"
                                                >
                                                    Insertar
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-900 rounded-b-xl">
                            <button onClick={() => setShowSeguimientoModal(false)} className="bg-gray-600 hover:bg-gray-700 text-white dark:bg-gray-700 dark:hover:bg-gray-600 px-5 py-2 rounded-lg font-semibold flex items-center gap-2 transform hover:scale-105 active:scale-95 transition-all shadow-sm">
                                <XCircle size={18} /> Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Modal */}
            {showImageModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Seleccionar Imágenes</h3>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 bg-white dark:bg-gray-800">
                            <div className="space-y-6">
                                {Array.isArray(generalImages) && generalImages.length > 0 && (
                                    <div>
                                        <h4 className="font-bold mb-3 text-gray-700 dark:text-gray-300">Imágenes Generales</h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                            {generalImages.map(img => {
                                                const imgUrl = img?.ruta?.startsWith('http') ? img.ruta : (api.defaults.baseURL?.replace('/api', '') || '') + (img?.ruta || '');
                                                const isSelected = selectedImages.find(i => i.id === img.id);
                                                return (
                                                    <div key={img.id} className="relative group cursor-pointer" onClick={() => toggleImageSelection(img)}>
                                                        <img src={imgUrl} alt="" className={`w-full aspect-square object-cover rounded-lg border-4 transition-all ${isSelected ? 'border-blue-500' : 'border-transparent group-hover:border-blue-300'}`} />
                                                        {isSelected && (
                                                            <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1 shadow-md">
                                                                <CheckCircle size={16} />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                
                                {Object.entries(proformaImages).map(([pId, imgs]) => {
                                    const validImgs = Array.isArray(imgs) ? imgs : [];
                                    if (validImgs.length === 0) return null;
                                    const pNum = proformas.find(p => p.id.toString() === pId)?.numero || pId;
                                    return (
                                        <div key={pId}>
                                            <h4 className="font-bold mb-3 text-gray-700 dark:text-gray-300">Plan de Tratamiento #{pNum}</h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                                {validImgs.map(img => {
                                                    const imgUrl = img?.ruta?.startsWith('http') ? img.ruta : (api.defaults.baseURL?.replace('/api', '') || '') + (img?.ruta || '');
                                                    const isSelected = selectedImages.find(i => i.id === img.id);
                                                    return (
                                                        <div key={img.id} className="relative group cursor-pointer" onClick={() => toggleImageSelection(img)}>
                                                            <img src={imgUrl} alt="" className={`w-full aspect-square object-cover rounded-lg border-4 transition-all ${isSelected ? 'border-blue-500' : 'border-transparent group-hover:border-blue-300'}`} />
                                                            {isSelected && (
                                                                <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1 shadow-md">
                                                                    <CheckCircle size={16} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}

                                {(!Array.isArray(generalImages) || generalImages.length === 0) && Object.values(proformaImages).every(imgs => !Array.isArray(imgs) || imgs.length === 0) && (
                                    <p className="text-center text-gray-500 py-8">No hay imágenes registradas para este paciente.</p>
                                )}
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 rounded-b-xl">
                            <button onClick={() => setShowImageModal(false)} className="bg-gray-600 hover:bg-gray-700 text-white dark:bg-gray-700 dark:hover:bg-gray-600 px-5 py-2 rounded-lg font-semibold flex items-center gap-2 transform hover:scale-105 active:scale-95 transition-all shadow-sm">
                                <XCircle size={18} /> Cerrar
                            </button>
                            {selectedImages.length > 0 && (
                                <button onClick={handleInsertImages} className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transform hover:scale-105 active:scale-95 transition-all shadow-lg">
                                    <ImageIcon size={18} /> Insertar Seleccionadas ({selectedImages.length})
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Informes Odontológicos"
                sections={manualSections}
            />
        </div>
    );
};

export default PacienteTabInformes;
