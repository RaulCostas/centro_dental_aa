import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import type { Paciente } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Pagination from './Pagination';
import ManualModal, { type ManualSection } from './ManualModal';
import { formatDate } from '../utils/dateUtils';
import { formatFullName } from '../utils/formatters';
import PacienteImagenesModal from './PacienteImagenesModal';
import Swal from 'sweetalert2';
import { FileText, Download, Printer, Users, CheckCircle } from 'lucide-react';
import SignatureModal from './SignatureModal';


const PacienteList: React.FC = () => {
    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalRecords, setTotalRecords] = useState(0);
    const [showManual, setShowManual] = useState(false);
    const [showImagenesModal, setShowImagenesModal] = useState(false);
    const [selectedPacienteIdForImages, setSelectedPacienteIdForImages] = useState<number | null>(null);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [selectedPacienteId, setSelectedPacienteId] = useState<number | null>(null);
    const limit = 10;
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const tipo = queryParams.get('tipo');

    const manualSections: ManualSection[] = [
        {
            title: 'Gestión de Pacientes',
            content: 'Desde esta pantalla puede administrar todo el registro de pacientes de la clínica.'
        },
        {
            title: 'Agregar Paciente',
            content: 'Use el botón azul "+ Nuevo Paciente" para registrar una nueva ficha. Es importante completar los datos personales y de contacto.'
        },
        {
            title: 'Edición y Estados',
            content: 'Use el botón de lápiz (amarillo) para modificar datos personales. Para pacientes activos, el botón rojo (papelera) cambia el estado a "Inactivo". Para pacientes inactivos, aparece un botón verde (check) que permite reactivarlos.'
        },
        {
            title: 'Exportación e Impresión',
            content: 'Puede exportar la lista de pacientes a Excel o PDF, o imprimir la ficha individual de cada paciente usando los botones correspondientes en la columna de Acciones.'
        }
    ];

    const calcularEdad = (fecha_nacimiento: string | undefined): string => {
        if (!fecha_nacimiento) return '';
        const hoy = new Date();
        const nacimiento = new Date(fecha_nacimiento);
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const m = hoy.getMonth() - nacimiento.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
        return `${edad} años`;
    };

    const formatCelular = (celular: string) => {
        if (!celular) return '';
        const countryCodes = ['+591', '+54', '+55', '+56', '+51', '+595', '+598', '+57', '+52', '+34', '+1'];
        const code = countryCodes.find(c => celular && celular.startsWith(c));
        if (code) {
            const number = celular.substring(code.length);
            return `(${code}) ${number}`;
        }
        return celular;
    };


    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchInput);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [searchInput]);

    useEffect(() => {
        setCurrentPage(1);
        fetchPacientes(debouncedSearchTerm);
    }, [debouncedSearchTerm]); // Reset page when search changes

    useEffect(() => {
        fetchPacientes(debouncedSearchTerm);
    }, [currentPage]);

    const fetchPacientes = async (search: string = debouncedSearchTerm) => {
        try {
            let url = `/pacientes?page=${currentPage}&limit=${limit}&search=${search}`;
            const response = await api.get(url);
            setPacientes(Array.isArray(response.data.data) ? response.data.data : []);
            setTotalPages(response.data.totalPages || 0);
            setTotalRecords(response.data.total || 0);
        } catch (error) {
            console.error('Error fetching pacientes:', error);
            setPacientes([]);
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Dar de baja paciente?',
            text: 'El paciente pasará a estado Inactivo sin eliminar el registro de la base de datos.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, dar de baja',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.patch(`/pacientes/${id}`, { estado: 'inactivo' });
                await Swal.fire({
                    icon: 'success',
                    title: '¡Paciente dado de baja!',
                    text: 'El estado del paciente ha sido cambiado a Inactivo.',
                    showConfirmButton: false,
                    timer: 1500
                });
                fetchPacientes();
            } catch (error) {
                console.error('Error al dar de baja paciente:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo dar de baja el paciente'
                });
            }
        }
    };

    const handleReactivate = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Reactivar paciente?',
            text: 'El paciente volverá a estado Activo.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, reactivar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.patch(`/pacientes/${id}`, { estado: 'activo' });
                await Swal.fire({
                    icon: 'success',
                    title: '¡Paciente reactivado!',
                    text: 'El estado del paciente ha sido cambiado a Activo.',
                    showConfirmButton: false,
                    timer: 1500
                });
                fetchPacientes();
            } catch (error) {
                console.error('Error al reactivar paciente:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo reactivar el paciente'
                });
            }
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchInput(e.target.value);
    };

    const handleClearSearch = () => {
        setSearchInput('');
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const exportToExcel = async () => {
        try {
            Swal.fire({
                title: 'Generando Excel...',
                text: 'Por favor espere',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const response = await api.get(`/pacientes?page=1&limit=9999&search=${searchTerm}`);
            const allPacientes = Array.isArray(response.data.data) ? response.data.data : [];

            const dataToExport = allPacientes.map((p: any) => ({
                'Fecha Ingreso': formatDate(p.fecha_ingreso),
                Paciente: formatFullName(p),
                'Fecha de nacimiento': formatDate(p.fecha_nacimiento),
                Celular: p.telefono_celular,
                Direccion: p.direccion || '-',
                Correo: p.email || '-',
                Estado: p.estado === 'activo' ? 'Activo' : 'Inactivo'
            }));
            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Pacientes");
            XLSX.writeFile(wb, "pacientes.xlsx");
            Swal.close();
        } catch (error) {
            console.error('Error generating Excel:', error);
            Swal.fire('Error', 'No se pudo generar el Excel', 'error');
        }
    };

    const exportToPDF = async () => {
        try {
            // Show loading alert
            Swal.fire({
                title: 'Generando PDF...',
                text: 'Por favor espere',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Fetch ALL records for PDF
            const response = await api.get(`/pacientes?page=1&limit=9999&search=${searchTerm}`);
            const allPacientes = Array.isArray(response.data.data) ? response.data.data : [];

            const doc = new jsPDF();
            doc.text("Lista de Pacientes", 20, 10);
            const tableColumn = ["F. Ingreso", "Paciente", "F. Nacimiento", "Celular", "Dirección", "Correo", "Estado"];
            const tableRows = allPacientes.map((p: any) => [
                formatDate(p.fecha_ingreso),
                formatFullName(p),
                formatDate(p.fecha_nacimiento),
                p.telefono_celular,
                p.direccion || '-',
                p.email || '-',
                p.estado === 'activo' ? 'Activo' : 'Inactivo'
            ]);

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 20,
            });
            doc.save("pacientes.pdf");
            Swal.close();
        } catch (error) {
            console.error('Error generating PDF:', error);
            Swal.fire('Error', 'No se pudo generar el PDF', 'error');
        }
    };


    const handlePrint = async () => {
        try {
            // Fetch ALL records for printing
            const response = await api.get(`/pacientes?page=1&limit=9999&search=${searchTerm}`);
            const allPacientes = Array.isArray(response.data.data) ? response.data.data : [];

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


            const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Lista de Pacientes</title>
                    <style>
                        @page {
                            size: A4; /* Vertical */
                            margin: 2cm 1.5cm 3cm 1.5cm;
                        }
                        
                        body {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            padding: 0;
                            color: #333;
                        }
                        
                        .header {
                            display: flex;
                            align-items: center;
                            margin-bottom: 20px;
                            padding-bottom: 15px;
                            border-bottom: 2px solid #3498db;
                        }
                        
                        .header img {
                            height: 60px;
                            margin-right: 20px;
                        }
                        
                        h1 {
                            color: #2c3e50;
                            margin: 0;
                            font-size: 24px;
                        }
                        
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                            font-size: 10px;
                        }
                        
                        th {
                            background-color: #3498db;
                            color: white;
                            padding: 8px 6px;
                            text-align: left;
                            font-weight: bold;
                            border: 1px solid #2980b9;
                        }
                        
                        td {
                            padding: 6px;
                            border: 1px solid #ddd;
                        }
                        
                        tr:nth-child(even) {
                            background-color: #f8f9fa;
                        }
                        
                        .status-active {
                            color: #27ae60;
                            font-weight: bold;
                        }
                        
                        .status-inactive {
                            color: #e74c3c;
                            font-weight: bold;
                        }
                        
                        .footer {
                            position: fixed;
                            bottom: 1.5cm;
                            left: 1.5cm;
                            right: 1.5cm;
                            padding-top: 10px;
                            border-top: 1px solid #eee;
                            font-size: 10px;
                            color: #777;
                            display: flex;
                            justify-content: space-between;
                        }
                        
                        @media print {
                            th {
                                background-color: #3498db !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            
                            tr:nth-child(even) {
                                background-color: #f8f9fa !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            
                            .footer {
                                position: fixed;
                                bottom: 0;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                    <h1 style="color: #1e40af; font-size: 24px;">Lista de Pacientes</h1>
                    <p style="color: #666; font-size: 14px;">Gestión integral de pacientes y sus historias clínicas</p>
                </div>
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>F. Ingreso</th>
                                <th>Paciente</th>
                                <th>Seguros</th>
                                <th>Celular</th>
                                <th>Fecha Nac.</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allPacientes.map((p: Paciente, index: number) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${formatDate(p.fecha_ingreso)}</td>
                                    <td>${formatFullName(p)}</td>
                                    <td>${p.seguro?.nombre || 'Particular'}</td>
                                    <td>${p.telefono_celular}</td>
                                    <td>${formatDate(p.fecha_nacimiento)}</td>
                                    <td class="${p.estado === 'activo' ? 'status-active' : 'status-inactive'}">
                                        ${p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="footer">
                        <div>Sistema de Gestión</div>
                        <div>Página 1</div>
                    </div>
                </body>
                </html>
            `;

            doc.open();
            doc.write(printContent);
            doc.close();

            const doPrint = () => {
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
                    }, 2000);
                }
            };

            const logo = doc.querySelector('img');
            if (logo) {
                if (logo.complete) {
                    doPrint();
                } else {
                    logo.onload = doPrint;
                    logo.onerror = doPrint;
                }
            } else {
                doPrint();
            }
        } catch (error) {
            console.error('Error al imprimir:', error);
            alert('Error al generar el documento de impresión');
        }
    };

    const handlePrintPaciente = async (pacientePreview: Paciente) => {
        try {
            Swal.fire({
                title: 'Generando Ficha...',
                text: 'Por favor espere',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const response = await api.get<Paciente>(`/pacientes/${pacientePreview.id}`);
            const fullPaciente = response.data;

            let signatures: any[] = [];
            try {
                const resHC = await api.get(`/firmas/documento/historia_clinica/${fullPaciente.id}`);
                signatures = Array.isArray(resHC.data) ? resHC.data : [];
            } catch (error) {
                console.error('Error fetching signatures for patient print:', error);
            }

            const patientSignature = signatures.filter(s => s.rolFirmante === 'paciente').pop();

            const check = (val: boolean | undefined) => val ? 'SÍ' : 'NO';
            const checkIcon = (val: boolean | undefined) => val ? '☒' : '☐';

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
                throw new Error('No se pudo crear el iframe de impresión');
            }

            const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Historia Clínica - ${formatFullName(fullPaciente)}</title>
                    <style>
                        @page { 
                            size: A4; 
                            margin: 0.8cm; 
                        }
                        body { 
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                            margin: 0; 
                            padding: 0; 
                            color: #333; 
                            line-height: 1.25; 
                            font-size: 9px; 
                        }
                        .page-container { 
                            width: 100%; 
                            box-sizing: border-box; 
                            display: flex; 
                            flex-direction: column; 
                        }
                        .header { 
                            display: flex; 
                            align-items: center; 
                            justify-content: space-between; 
                            margin-bottom: 10px; 
                            border-bottom: 2px solid #3b82f6; 
                            padding-bottom: 6px; 
                        }
                        .header-left {
                            display: flex;
                            align-items: center;
                            gap: 12px;
                        }
                        .header-logo {
                            height: 48px;
                            width: auto;
                            object-fit: contain;
                        }
                        .header-titles {
                            text-align: left;
                        }
                        .paternal-box {
                            border: 2px solid #1e3a8a;
                            border-radius: 6px;
                            min-width: 36px;
                            padding: 0 8px;
                            height: 36px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 20px;
                            font-weight: bold;
                            color: #1e3a8a;
                            background: #eff6ff;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        h1 { color: #1e3a8a; margin: 0; font-size: 15px; text-transform: uppercase; }
                        h2 { 
                            background: #eff6ff; 
                            color: #1e40af; 
                            padding: 3px 8px; 
                            margin-top: 10px; 
                            margin-bottom: 6px;
                            font-size: 10px; 
                            text-transform: uppercase; 
                            border-left: 4px solid #3b82f6; 
                        }
                        .info-grid { 
                            display: grid; 
                            grid-template-columns: repeat(4, 1fr); 
                            gap: 6px; 
                            margin-top: 3px; 
                        }
                        .field { border-bottom: 1px solid #f3f4f6; padding: 2px 0; }
                        .label { font-weight: bold; color: #6b7280; font-size: 7.5px; text-transform: uppercase; display: block; }
                        .value { font-size: 9px; color: #111827; min-height: 10px; font-weight: 500; }
                        
                        .section-grid { 
                            display: grid; 
                            grid-template-columns: 1fr 1fr; 
                            gap: 12px; 
                            margin-top: 4px; 
                        }
                        .checkbox-table { width: 100%; border-collapse: collapse; }
                        .checkbox-table td { padding: 2px; border-bottom: 1px solid #f9fafb; font-size: 9px; }
                        .checkbox-icon { font-size: 11px; margin-right: 5px; color: #3b82f6; font-weight: bold; }
                        
                        .signature-section {
                            margin-top: 20px;
                            padding-top: 15px;
                            display: flex;
                            justify-content: center;
                            width: 100%;
                        }
                        .signature-box { 
                            text-align: center; 
                            width: 220px; 
                        }
                        .sig-line { border-top: 1px solid #374151; margin-top: 0px; }
                        
                        .footer { 
                            margin-top: 15px;
                            font-size: 7.5px; 
                            color: #9ca3af; 
                            border-top: 1px solid #e5e7eb; 
                            padding-top: 4px; 
                            display: flex; 
                            justify-content: space-between; 
                        }
                        .detail-text {
                            font-size: 8.5px;
                            color: #4b5563;
                            margin-top: 1px;
                            font-style: italic;
                        }
                        @media print {
                            .page-container { min-height: auto; }
                            h2 { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body>
                    <div class="page-container">
                        <div class="header">
                            <div class="header-left">
                                <img src="/logo-clinica-dental.png" class="header-logo" alt="Logo" />
                                <div class="header-titles">
                                    <h1>CENTRO DENTAL A&A</h1>
                                    <div style="font-size: 10px; font-weight: bold; color: #1e40af; text-transform: uppercase; margin-top: 1px;">Historia Clínica Odontológica</div>
                                    <div style="font-size: 8px; color: #666; margin-top: 1px;">Fecha de Registro: ${formatDate(fullPaciente.fecha_ingreso)}</div>
                                </div>
                            </div>
                            <div class="paternal-box">
                                ${(fullPaciente.paterno || '').trim().charAt(0).toUpperCase() || '-'}-${fullPaciente.id}
                            </div>
                        </div>

                        <h2>Filiación del Paciente</h2>
                        <div class="info-grid">
                            <div class="field"><span class="label">Paterno</span><div class="value">${fullPaciente.paterno || '-'}</div></div>
                            <div class="field"><span class="label">Materno</span><div class="value">${fullPaciente.materno || '-'}</div></div>
                            <div class="field" style="grid-column: span 2;"><span class="label">Nombres</span><div class="value">${fullPaciente.nombre || '-'}</div></div>
                            
                            <div class="field"><span class="label">Nacimiento</span><div class="value">${formatDate(fullPaciente.fecha_nacimiento)}</div></div>
                            <div class="field"><span class="label">Edad</span><div class="value">${calcularEdad(fullPaciente.fecha_nacimiento)}</div></div>
                            <div class="field"><span class="label">Género</span><div class="value">${fullPaciente.genero === 'M' ? 'Masculino' : 'Femenino'}</div></div>
                            <div class="field"><span class="label">C.I.</span><div class="value">${fullPaciente.ci || '-'}</div></div>
                            
                            <div class="field"><span class="label">Celular</span><div class="value">${fullPaciente.telefono_celular || '-'}</div></div>
                            <div class="field"><span class="label">Correo</span><div class="value">${fullPaciente.email || '-'}</div></div>
                            <div class="field"><span class="label">Estado Civil</span><div class="value">${fullPaciente.estado_civil || '-'}</div></div>
                            <div class="field"><span class="label">Instrucción</span><div class="value">${fullPaciente.grado_instruccion || '-'}</div></div>
                            <div class="field"><span class="label">Seguro / Convenio</span><div class="value">${fullPaciente.seguro?.nombre || 'Particular'}</div></div>
                            <div class="field" style="grid-column: span 3;"><span class="label">Dirección</span><div class="value">${fullPaciente.direccion || '-'}</div></div>
                            
                            <div class="field"><span class="label">Nombre Tutor</span><div class="value">${fullPaciente.tutor_nombre || '-'}</div></div>
                            <div class="field"><span class="label">Celular Tutor</span><div class="value">${fullPaciente.tutor_celular || '-'}</div></div>
                            <div class="field" style="grid-column: span 2;"><span class="label">Persona Brinda Información</span><div class="value">${fullPaciente.persona_brinda_informacion || '-'}</div></div>
                        </div>

                        <h2>Cuestionario Médico (Ficha Médica)</h2>
                        <div class="field" style="margin-bottom: 8px;">
                            <span class="label">Motivo de Consulta</span>
                            <div class="value">${fullPaciente.fichaClinica?.motivo_consulta || 'No especificado'}</div>
                        </div>
                        <div class="field" style="margin-bottom: 8px;">
                            <span class="label">Antecedentes Familiares (Enfermedades hereditarias)</span>
                            <div class="value">${fullPaciente.fichaClinica?.ant_pat_familiares || 'Ninguno'}</div>
                        </div>

                        <div class="section-grid">
                            <div>
                                <span class="label" style="font-weight: bold; color: #1e40af; margin-bottom: 4px;">Antecedentes Patológicos</span>
                                <table class="checkbox-table">
                                    <tr><td><span class="checkbox-icon">${checkIcon(fullPaciente.fichaClinica?.ant_pat_anemia)}</span> Anemia</td>
                                    <td><span class="checkbox-icon">${checkIcon(fullPaciente.fichaClinica?.ant_pat_cardiopatias)}</span> Cardiopatías</td></tr>
                                    <tr><td><span class="checkbox-icon">${checkIcon(fullPaciente.fichaClinica?.ant_pat_gastricas)}</span> Enf. Gástricas</td>
                                    <td><span class="checkbox-icon">${checkIcon(fullPaciente.fichaClinica?.ant_pat_hepatitis)}</span> Hepatitis</td></tr>
                                    <tr><td><span class="checkbox-icon">${checkIcon(fullPaciente.fichaClinica?.ant_pat_tuberculosis)}</span> Tuberculosis</td>
                                    <td><span class="checkbox-icon">${checkIcon(fullPaciente.fichaClinica?.ant_pat_asma)}</span> Asma</td></tr>
                                    <tr><td><span class="checkbox-icon">${checkIcon(fullPaciente.fichaClinica?.ant_pat_diabetes)}</span> Diabetes</td>
                                    <td><span class="checkbox-icon">${checkIcon(fullPaciente.fichaClinica?.ant_pat_epilepsia)}</span> Epilepsia</td></tr>
                                    <tr><td><span class="checkbox-icon">${checkIcon(fullPaciente.fichaClinica?.ant_pat_hipertension)}</span> Hipertensión</td>
                                    <td><span class="checkbox-icon">${checkIcon(fullPaciente.fichaClinica?.ant_pat_vih)}</span> VIH</td></tr>
                                    <tr><td colspan="2"><span class="checkbox-icon">${checkIcon(fullPaciente.fichaClinica?.ant_pat_ninguno)}</span> Ninguno de los anteriores</td></tr>
                                </table>
                            </div>
                            <div style="border-left: 1px solid #e5e7eb; padding-left: 10px;">
                                <span class="label" style="font-weight: bold; color: #1e40af; margin-bottom: 4px;">Detalles y Especificaciones</span>
                                <div style="margin-bottom: 4px;">
                                    <span class="label">¿Tuvo cirugías?: ${check(fullPaciente.fichaClinica?.ant_pat_cirugia)}</span>
                                    ${fullPaciente.fichaClinica?.ant_pat_cirugia ? `<div class="detail-text">Detalle: ${fullPaciente.fichaClinica.ant_pat_cirugia_detalle || '-'}</div>` : ''}
                                </div>
                                <div style="margin-bottom: 4px;">
                                    <span class="label">Alergias: ${check(fullPaciente.fichaClinica?.ant_pat_alergias)}</span>
                                    ${fullPaciente.fichaClinica?.ant_pat_alergias ? `<div class="detail-text">Detalle: ${fullPaciente.fichaClinica.ant_pat_alergias_detalle || '-'}</div>` : ''}
                                </div>
                                ${fullPaciente.genero === 'F' ? `
                                <div style="margin-bottom: 4px;">
                                    <span class="label">Embarazo: ${check(fullPaciente.fichaClinica?.ant_pat_embarazo)}</span>
                                    ${fullPaciente.fichaClinica?.ant_pat_embarazo ? `<div class="detail-text">Semanas de gestación: ${fullPaciente.fichaClinica.ant_pat_embarazo_semanas || '-'}</div>` : ''}
                                </div>
                                ` : ''}
                                <div style="margin-bottom: 4px;">
                                    <span class="label">Tratamiento Médico Activo: ${check(fullPaciente.fichaClinica?.ant_pat_tratamiento_medico)}</span>
                                    ${fullPaciente.fichaClinica?.ant_pat_tratamiento_medico ? `<div class="detail-text">Detalle: ${fullPaciente.fichaClinica.ant_pat_tratamiento_medico_detalle || '-'}</div>` : ''}
                                </div>
                                <div style="margin-bottom: 4px;">
                                    <span class="label">¿Esta tomado algún medicamento?: ${check(fullPaciente.fichaClinica?.ant_pat_toma_medicamentos)}</span>
                                    ${fullPaciente.fichaClinica?.ant_pat_toma_medicamentos ? `<div class="detail-text">Detalle: ${fullPaciente.fichaClinica.ant_pat_toma_medicamentos_detalle || '-'}</div>` : ''}
                                </div>
                                <div style="margin-bottom: 4px;">
                                    <span class="label">Hemorragias Anormales: ${check(fullPaciente.fichaClinica?.ant_pat_hemorragias)}</span>
                                    ${fullPaciente.fichaClinica?.ant_pat_hemorragias ? `<div class="detail-text">Tipo: ${fullPaciente.fichaClinica.ant_pat_hemorragias_tipo || '-'}</div>` : ''}
                                </div>
                                <div>
                                    <span class="label">Otros Antecedentes Patológicos:</span>
                                    <div class="value">${fullPaciente.fichaClinica?.ant_pat_otros || '-'}</div>
                                </div>
                            </div>
                        </div>

                        <h2>Exámenes Clínicos</h2>
                        <div class="section-grid">
                            <div>
                                <span class="label" style="font-weight: bold; color: #1e40af; margin-bottom: 4px;">Examen Extra Oral</span>
                                <div class="field"><span class="label">A.T.M.</span><div class="value">${fullPaciente.fichaClinica?.exam_extra_atm || '-'}</div></div>
                                <div class="field"><span class="label">Ganglios Linfáticos</span><div class="value">${fullPaciente.fichaClinica?.exam_extra_ganglios || '-'}</div></div>
                                <div class="field"><span class="label">Tipo de Respirador</span><div class="value">${fullPaciente.fichaClinica?.exam_extra_respirador || '-'}</div></div>
                                <div class="field"><span class="label">Otros extraorales</span><div class="value">${fullPaciente.fichaClinica?.exam_extra_otros || '-'}</div></div>
                            </div>
                            <div style="border-left: 1px solid #e5e7eb; padding-left: 10px;">
                                <span class="label" style="font-weight: bold; color: #1e40af; margin-bottom: 4px;">Examen Intra Oral</span>
                                <div class="info-grid" style="grid-template-columns: 1fr 1fr;">
                                    <div class="field"><span class="label">Labios</span><div class="value">${fullPaciente.fichaClinica?.exam_intra_labios || '-'}</div></div>
                                    <div class="field"><span class="label">Lengua</span><div class="value">${fullPaciente.fichaClinica?.exam_intra_lengua || '-'}</div></div>
                                    <div class="field"><span class="label">Paladar</span><div class="value">${fullPaciente.fichaClinica?.exam_intra_paladar || '-'}</div></div>
                                    <div class="field"><span class="label">Piso de Boca</span><div class="value">${fullPaciente.fichaClinica?.exam_intra_piso_boca || '-'}</div></div>
                                    <div class="field"><span class="label">Mucosa Yugal</span><div class="value">${fullPaciente.fichaClinica?.exam_intra_mucosa_yugal || '-'}</div></div>
                                    <div class="field"><span class="label">Encías</span><div class="value">${fullPaciente.fichaClinica?.exam_intra_encias || '-'}</div></div>
                                </div>
                                <div class="field" style="margin-top: 4px;">
                                    <span class="label">¿Utiliza Prótesis?: ${check(fullPaciente.fichaClinica?.exam_intra_protesis)}</span>
                                </div>
                            </div>
                        </div>

                        <h2>Antecedentes Bucodentales e Higiene Oral</h2>
                        <div class="section-grid">
                            <div>
                                <span class="label" style="font-weight: bold; color: #1e40af; margin-bottom: 4px;">Bucodentales y Hábitos</span>
                                <div class="field"><span class="label">Última visita al odontólogo</span><div class="value">${fullPaciente.fichaClinica?.ant_buco_ultima_visita || '-'}</div></div>
                                <div class="field"><span class="label">Otros hábitos orales</span><div class="value">${fullPaciente.fichaClinica?.habito_otros || '-'}</div></div>
                                <div style="margin-top: 5px; display: flex; gap: 15px;">
                                    <div><span class="checkbox-icon">${checkIcon(fullPaciente.fichaClinica?.habito_fuma)}</span> Fuma</div>
                                    <div><span class="checkbox-icon">${checkIcon(fullPaciente.fichaClinica?.habito_bebe)}</span> Consume alcohol</div>
                                </div>
                            </div>
                            <div style="border-left: 1px solid #e5e7eb; padding-left: 10px;">
                                <span class="label" style="font-weight: bold; color: #1e40af; margin-bottom: 4px;">Higiene Bucal</span>
                                <div style="display: flex; gap: 10px; margin-bottom: 4px; flex-wrap: wrap;">
                                     <div><span class="checkbox-icon">${checkIcon(fullPaciente.fichaClinica?.hig_cepillo)}</span> Cepillo</div>
                                     <div><span class="checkbox-icon">${checkIcon(fullPaciente.fichaClinica?.hig_hilo)}</span> Hilo</div>
                                     <div><span class="checkbox-icon">${checkIcon(fullPaciente.fichaClinica?.hig_enjuague)}</span> Enjuague</div>
                                     <div><span class="checkbox-icon">${checkIcon(fullPaciente.fichaClinica?.hig_waterpik)}</span> Waterpik</div>
                                 </div>
                                <div class="info-grid" style="grid-template-columns: 1fr 1fr;">
                                    <div class="field"><span class="label">Frecuencia cepillado</span><div class="value">${fullPaciente.fichaClinica?.hig_frecuencia_cepillado || '-'}</div></div>
                                    <div class="field"><span class="label">Estado Higiene</span><div class="value">${fullPaciente.fichaClinica?.hig_bucal_estado || '-'}</div></div>
                                </div>
                                <div class="field" style="margin-top: 4px;">
                                    <span class="label">¿Sangran las encías?: ${check(fullPaciente.fichaClinica?.hig_sangrado_encias)}</span>
                                </div>
                            </div>
                        </div>

                        ${fullPaciente.fichaClinica?.observaciones_ficha ? `
                        <h2 style="margin-top: 8px;">Observaciones Adicionales</h2>
                        <div class="value" style="padding: 4px; border: 1px solid #f3f4f6; border-radius: 4px; background-color: #f9fafb; font-style: italic;">
                            ${fullPaciente.fichaClinica.observaciones_ficha}
                        </div>
                        ` : ''}

                        <div class="signature-section">
                            <div class="signature-box">
                                ${patientSignature ? `
                                     <img src="${patientSignature.firmaData}" style="max-height: 55px; margin-bottom: 2px; position: relative; z-index: 1;" />
                                 ` : '<div style="height: 45px;"></div>'}
                                <div class="sig-line"></div>
                                <div style="font-weight: bold; margin-top: 3px;">${formatFullName(fullPaciente)}</div>
                                <div style="font-size: 8px; color: #666;">Firma del Paciente</div>
                            </div>
                        </div>

                        <div class="footer">
                            <div>CENTRO DENTAL A&A - Ficha de Historia Clínica Oficial</div>
                            <div>Fecha Impresión: ${formatDate(new Date())}</div>
                        </div>
                    </div>
                </body>
                </html>
            `;

            doc.open();
            doc.write(printContent);
            doc.close();

            const images = Array.from(doc.querySelectorAll('img'));
            let printTriggered = false;

            const doPrint = () => {
                if (printTriggered) return;
                printTriggered = true;
                if (Swal.isVisible()) Swal.close();
                try {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                } catch (e) {
                    console.error('Print error:', e);
                }
                setTimeout(() => {
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                    }
                }, 2000);
            };

            if (images.length === 0) {
                doPrint();
            } else {
                let loadedCount = 0;
                images.forEach(img => {
                    img.onload = () => {
                        loadedCount++;
                        if (loadedCount === images.length) doPrint();
                    };
                    img.onerror = () => {
                        loadedCount++;
                        if (loadedCount === images.length) doPrint();
                    };
                });
            }
        } catch (error) {
            console.error('Error al imprimir:', error);
            Swal.fire('Error', 'No se pudo generar el documento de impresión', 'error');
        }
    };

    return (
        <div className="content-card">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                        {tipo === 'particular' ? (
                             <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                            </div>
                        ) : tipo === 'seguro' ? (
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                                <FileText className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                            </div>
                        ) : (
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                            </div>
                        )}
                        {tipo === 'particular' ? 'Pacientes Particulares' : tipo === 'seguro' ? 'Pacientes Seguro' : 'Gestión de Pacientes'}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {tipo === 'particular' ? 'Listado de pacientes sin convenio o particulares.' : tipo === 'seguro' ? 'Listado de pacientes vinculados a seguros y convenios.' : 'Administre todos los pacientes registrados en el sistema.'}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <button
                        onClick={() => setShowManual(true)}
                        className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="Ayuda / Manual"
                    >
                        ?
                    </button>
                    <button
                        onClick={exportToExcel}
                        className="bg-[#28a745] hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                        title="Exportar a Excel"
                    >
                        <FileText size={18} />
                        <span className="text-sm">Excel</span>
                    </button>
                    <button
                        onClick={exportToPDF}
                        className="bg-[#dc3545] hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                        title="Exportar a PDF"
                    >
                        <Download size={18} />
                        <span className="text-sm">PDF</span>
                    </button>
                    <button
                        onClick={handlePrint}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                        title="Imprimir"
                    >
                        <Printer size={18} />
                        <span className="text-sm">Imprimir</span>
                    </button>

                    {/* Vertical Divider */}
                    <div className="hidden md:block h-8 w-[1px] bg-gray-300 dark:bg-gray-600 mx-1"></div>

                    <button
                        onClick={() => navigate('/pacientes/create' + (tipo ? `?tipo=${tipo}` : ''))}
                        className="inline-flex items-center px-5 py-2.5 bg-[#3498db] hover:bg-blue-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-200 dark:shadow-none transition-all transform hover:-translate-y-0.5 active:scale-95 gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Nuevo Paciente
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 no-print">
                <div className="flex gap-2 w-full md:max-w-md">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Buscar por nombre, paterno o materno..."
                            value={searchInput}
                            onChange={handleSearch}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-300"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                    {searchInput && (
                        <button
                            onClick={handleClearSearch}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                        >
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                Mostrando {totalRecords === 0 ? 0 : (currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, totalRecords)} de {totalRecords} registros
            </div>

            <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Paciente</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Celular</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha Nacimiento</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Firma HC</th>
                            <th className="no-print px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {Array.isArray(pacientes) && pacientes.map((paciente, index) => (
                            <tr key={paciente.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="p-3 text-gray-800 dark:text-gray-300">{(currentPage - 1) * limit + index + 1}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">
                                    <div className="flex flex-col">
                                        <span 
                                            className="font-bold cursor-pointer text-blue-600 hover:text-blue-800 hover:underline transition-all"
                                            onClick={() => navigate(`/pacientes/${paciente.id}/ficha`)}
                                        >
                                            {formatFullName(paciente)}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">{formatDate(paciente.fecha_ingreso)}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">{formatCelular(paciente.telefono_celular)}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">
                                    {formatDate(paciente.fecha_nacimiento)}
                                    {paciente.fecha_nacimiento && (
                                        <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">({calcularEdad(paciente.fecha_nacimiento)})</span>
                                    )}
                                </td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-sm ${paciente.estado === 'activo'
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                        }`}>
                                        {paciente.estado}
                                    </span>
                                </td>
                                <td className="p-3 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        {(paciente as any).esta_firmado ? (
                                            <div className="flex items-center text-green-600 dark:text-green-400 font-bold" title="Historia Clínica Firmada">
                                                <CheckCircle size={20} className="mr-1" />
                                                <span className="text-xs">Firmado</span>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setSelectedPacienteId(paciente.id);
                                                    setShowSignatureModal(true);
                                                }}
                                                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-all transform hover:-translate-y-0.5"
                                                title="Firmar Historia Clínica"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </td>


                                <td className="no-print p-3 flex gap-2">
                                    <button
                                        onClick={() => handlePrintPaciente(paciente)}
                                        className="p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                        title="Imprimir Ficha"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                            <rect x="6" y="14" width="12" height="8"></rect>
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => navigate(`/pacientes/edit/${paciente.id}`)}
                                        className="p-2 bg-amber-400 hover:bg-amber-500 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                        title="Editar"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                        </svg>
                                    </button>
                                    {paciente.estado === 'activo' ? (
                                        <button
                                            onClick={() => handleDelete(paciente.id)}
                                            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                            title="Dar de baja"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleReactivate(paciente.id)}
                                            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                            title="Reactivar"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {(!pacientes || pacientes.length === 0) && (
                            <tr>
                                <td colSpan={7} className="p-5 text-center text-gray-500 dark:text-gray-400">No hay pacientes registrados</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
            />
            {/* Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Pacientes"
                sections={manualSections}
            />
            <PacienteImagenesModal
                isOpen={showImagenesModal}
                onClose={() => setShowImagenesModal(false)}
                pacienteId={selectedPacienteIdForImages || 0}
            />

            {showSignatureModal && selectedPacienteId && (
                <SignatureModal
                    isOpen={showSignatureModal}
                    onClose={() => {
                        setShowSignatureModal(false);
                        setSelectedPacienteId(null);
                    }}
                    tipoDocumento="historia_clinica"
                    documentoId={selectedPacienteId}
                    rolFirmante="paciente"
                    onSuccess={() => {
                        fetchPacientes();
                    }}
                />
            )}
        </div>
    );
};

export default PacienteList;
