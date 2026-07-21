import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { formatFullName, formatNumber } from '../utils/formatters';
import Swal from 'sweetalert2';
import type { Paciente, HistoriaClinica as HistoriaClinicaType, Proforma, Pago } from '../types';
import Odontogram from './Odontogram';
import HistoriaClinicaForm from './HistoriaClinicaForm';
import HistoriaClinicaList from './HistoriaClinicaList';
import PresupuestoViewModal from './PresupuestoViewModal';
import SeguimientoViewModal from './SeguimientoViewModal';
import RecordatorioTratamientoModal from './RecordatorioTratamientoModal';
import ManualModal, { type ManualSection } from './ManualModal';
import { formatDate } from '../utils/dateUtils';
import { Info, Activity } from 'lucide-react';



const HistoriaClinica: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [paciente, setPaciente] = useState<Paciente | null>(null);
    const [historia, setHistoria] = useState<HistoriaClinicaType[]>([]);
    const [proformas, setProformas] = useState<Proforma[]>([]);
    const [pagos, setPagos] = useState<Pago[]>([]);
    const [musicaPreferences, setMusicaPreferences] = useState<string[]>([]);
    const [televisionPreferences, setTelevisionPreferences] = useState<string[]>([]);
    const [selectedProformaId, setSelectedProformaId] = useState<number>(0);


    const [historiaToEdit, setHistoriaToEdit] = useState<HistoriaClinicaType | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [showManual, setShowManual] = useState(false);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [showSeguimientoModal, setShowSeguimientoModal] = useState(false);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [selectedReminderHistoria, setSelectedReminderHistoria] = useState<HistoriaClinicaType | null>(null);

    const manualSections: ManualSection[] = [
        {
            title: 'Seguimiento Clínico',
            content: 'Registro detallado de todos los tratamientos realizados al paciente.'
        },
        {
            title: 'Estados',
            content: 'Cada registro muestra el estado del Tratamiento (Terminado/Pendiente) y del Plan de Tratamiento u Honorario (Cobrado/Pendiente).'
        },
        {
            title: 'Acciones',
            content: 'Puede Editar un registro, Eliminarlo o Imprimir la lista. También puede ver el Plan de Tratamiento asociado si el registro proviene de un Plan de Tratamiento.'
        },
        {
            title: 'Recordatorio de Tratamiento',
            content: 'Utilice el botón de campana/ícono índigo para programar un recordatorio de seguimiento para un tratamiento específico. Este recordatorio aparecerá en la página de inicio cuando llegue la fecha programada.'
        }];

    // Odontogram States
    // Tabs States
    const [activeTab, setActiveTab] = useState<'seguimiento' | 'odontograma'>('seguimiento');
    const [odontogramas, setOdontogramas] = useState<any[]>([]);
    const [selectedOdontoId, setSelectedOdontoId] = useState<number | null>(null);
    const [isEditingOdonto, setIsEditingOdonto] = useState(false);
    const [odontogramData, setOdontogramData] = useState<any>({});



    // Format phone number as (+code) number
    const formatPhoneNumber = (phone: string | undefined): string => {
        if (!phone) return 'N/A';

        // Remove any spaces or special characters
        const cleaned = phone.replace(/\D/g, '');

        // If it starts with a country code (e.g., 591 for Bolivia)
        if (cleaned.length >= 10) {
            // Assume first 2-3 digits are country code
            const countryCode = cleaned.substring(0, cleaned.length - 8);
            const number = cleaned.substring(cleaned.length - 8);
            return `(+${countryCode}) ${number}`;
        }

        // If it's just a local number
        return phone;
    };

    useEffect(() => {
        if (location.state?.initialTab) {
            setActiveTab(location.state.initialTab as any);
        }
    }, [location.state]);

    useEffect(() => {
        if (id) {
            fetchPaciente();
            fetchHistoria();
            fetchProformas();
            fetchPagos();
            fetchMusicaTelevision();
            fetchOdontogramas();
        }
    }, [id]);

    const fetchOdontogramas = async () => {
        try {
            const response = await api.get(`/odontogramas/paciente/${id}`);
            const data = response.data;
            setOdontogramas(data);
            if (data.length > 0) {
                setSelectedOdontoId(data[0].id);
                setOdontogramData(data[0].mapa_dientes || {});
            }
        } catch (error) {
            console.error('Error fetching odontogramas:', error);
        }
    };

    const fetchPagos = async () => {
        try {
            const response = await api.get(`/pagos/paciente/${id}`);
            setPagos(response.data);
        } catch (error) {
            console.error('Error fetching pagos:', error);
        }
    };

    const fetchPaciente = async () => {
        try {
            const response = await api.get(`/pacientes/${id}`);
            setPaciente(response.data);
        } catch (error) {
            console.error('Error fetching paciente:', error);
        }
    };

    const fetchHistoria = async () => {
        try {
            const response = await api.get(`/historia-clinica/paciente/${id}`);
            setHistoria(response.data);
        } catch (error) {
            console.error('Error fetching historia:', error);
        }
    };

    const fetchProformas = async () => {
        try {
            const response = await api.get(`/proformas/paciente/${id}`);
            const data = response.data.data || response.data;
            setProformas(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching proformas:', error);
        }
    };

    const fetchMusicaTelevision = async () => {
        if (!id) return;
        try {
            const [musicasRes, televisionesRes, allMusicasRes, allTelevisionesRes] = await Promise.all([
                api.get(`/pacientes/${id}/musica`),
                api.get(`/pacientes/${id}/television`),
                api.get('/musica?limit=100'),
                api.get('/television?limit=100')
            ]);

            const selectedMusicaIds = musicasRes.data || [];
            const selectedTelevisionIds = televisionesRes.data || [];

            const allMusicas = allMusicasRes.data.data || allMusicasRes.data;
            const allTelevisiones = allTelevisionesRes.data.data || allTelevisionesRes.data;

            // Mapear IDs a nombres
            const musicaNames = allMusicas
                .filter((m: any) => selectedMusicaIds.includes(m.id))
                .map((m: any) => m.musica);
            const televisionNames = allTelevisiones
                .filter((t: any) => selectedTelevisionIds.includes(t.id))
                .map((t: any) => t.television);

            setMusicaPreferences(musicaNames);
            setTelevisionPreferences(televisionNames);
        } catch (error) {
            console.error('Error fetching música/televisión:', error);
        }
    };

    const handleVolver = () => {
        navigate('/pacientes');
    };

    const handleDelete = async (historiaId: number) => {
        const result = await Swal.fire({
            title: '¿Está seguro?',
            text: "No podrá revertir esta acción",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/historia-clinica/${historiaId}`);
                fetchHistoria();
                Swal.fire({
                    title: '¡Eliminado!',
                    text: 'El registro ha sido eliminado.',
                    icon: 'success',
                    showConfirmButton: false,
                    timer: 1500
                });
            } catch (error) {
                console.error('Error deleting historia:', error);
                Swal.fire(
                    'Error',
                    'Hubo un problema al eliminar el registro.',
                    'error'
                );
            }
        }
    };

    const handleEdit = (item: HistoriaClinicaType) => {
        setHistoriaToEdit(item);
        setShowForm(true);
        if (item.proformaId) {
            setSelectedProformaId(item.proformaId);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setHistoriaToEdit(null);
        setShowForm(false);
    };






    const filteredHistoria = selectedProformaId ? historia.filter(h => h.proformaId === selectedProformaId) : historia;


    const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src;
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(e);
        });
    };

    const handlePrintHistory = async () => {
        const doc = new jsPDF();

        try {
            const logo = await loadImage("/logo-clinica-dental.jpg");
            const targetHeight = 15;
            const targetWidth = (logo.width / logo.height) * targetHeight;
            doc.addImage(logo, 'JPEG', 14, 15, targetWidth, targetHeight);
        } catch (error) {
            console.warn('Could not load logo', error);
        }

        let centroDental: any = null;
        try {
            const resCentro = await api.get('/datos-centro-dental');
            if (resCentro.data && resCentro.data.length > 0) {
                centroDental = resCentro.data[0];
            }
        } catch (error) {
            console.error('Error fetching centro dental data:', error);
        }

        // Header
        const pageWidth = doc.internal.pageSize.width;
        doc.setDrawColor(52, 152, 219); // #3498db
        doc.setLineWidth(1);
        doc.line(15, 35, pageWidth - 15, 35);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(44, 62, 80); // #2c3e50
        doc.text('SEGUIMIENTO CLÍNICO', 105, 25, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        // Patient info box with blue border (matching Próxima Cita format)
        const boxY = 40;
        const boxHeight = selectedProformaId > 0 ? 18 : 12;

        // Gray background
        doc.setFillColor(248, 249, 250); // #f8f9fa
        doc.rect(15, boxY, pageWidth - 30, boxHeight, 'F');

        // Blue left border
        doc.setFillColor(52, 152, 219); // #3498db
        doc.rect(15, boxY, 2, boxHeight, 'F');

        // Patient info text
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('PACIENTE:', 20, boxY + 6);
        doc.setFont('helvetica', 'normal');
        const pacienteNombre = paciente
            ? formatFullName(paciente)
            : 'N/A';
        doc.text(pacienteNombre.toUpperCase(), 45, boxY + 6);

        // Plan de Tratamiento info
        if (selectedProformaId > 0) {
            const proforma = proformas.find(p => p.id === selectedProformaId);
            if (proforma) {
                doc.setFont('helvetica', 'bold');
                doc.text('PLAN DE TRATAMIENTO:', 20, boxY + 13);
                doc.setFont('helvetica', 'normal');
                doc.text(`Plan #${proforma.numero || proforma.id} - ${formatDate(proforma.fecha)}`, 70, boxY + 13);
            }
        }

        // Table
        if (filteredHistoria.length > 0) {
            const tableColumn = ["Fecha", "Pieza", "Tratamiento", "Observaciones", "Cant.", "Doctor", "Diagnóstico", "Estado"];
            const tableRows = filteredHistoria.map(item => [
                formatDate(item.fecha),
                item.pieza || '-',
                item.tratamiento || '-',
                item.observaciones || '-',
                item.cantidad,
                item.doctor ? formatFullName(item.doctor) : '-',
                item.diagnostico || '-',
                item.estadoTratamiento
            ]);

            const tableStartY = boxY + boxHeight + 5; // Start table 5 units after the box

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: tableStartY,
                theme: 'plain',
                margin: { left: 15, right: 15 },
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                },
                headStyles: {
                    fillColor: [52, 152, 219], // #3498db
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    lineWidth: 0,
                },
                columnStyles: {
                    0: { cellWidth: 20 },
                    1: { cellWidth: 12 },
                    2: { cellWidth: 30 },
                    3: { cellWidth: 'auto' }, // Observaciones takes remaining space
                    4: { cellWidth: 10 },
                    5: { cellWidth: 25 },
                    6: { cellWidth: 30 },
                    7: { cellWidth: 18 }
                },
                alternateRowStyles: {
                    fillColor: [248, 249, 250] // #f8f9fa
                }
            });
        }

        const historiaWithFirma = filteredHistoria.slice().reverse().find(h => h.firmaPaciente);
        if (historiaWithFirma && historiaWithFirma.firmaPaciente) {
            try {
                const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 150;
                let signatureY = finalY + 20;
                
                if (signatureY + 60 > doc.internal.pageSize.height) {
                    doc.addPage();
                    signatureY = 30;
                }

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(44, 62, 80);
                doc.text('CONFORMIDAD DEL PACIENTE', 105, signatureY, { align: 'center' });
                
                const sigImg = await loadImage(historiaWithFirma.firmaPaciente);
                doc.addImage(sigImg, 'PNG', 105 - 40, signatureY + 5, 80, 40);
                
                doc.setDrawColor(150);
                doc.setLineWidth(0.5);
                doc.line(105 - 35, signatureY + 45, 105 + 35, signatureY + 45);
                
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(100);
                doc.text('Firma o Rúbrica del Paciente', 105, signatureY + 50, { align: 'center' });
                doc.text(`Fecha de Firma: ${formatDate(historiaWithFirma.fecha)}`, 105, signatureY + 55, { align: 'center' });
            } catch (err) {
                console.warn('Error loading signature image for PDF', err);
            }
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
                const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
                
                doc.setDrawColor(221, 221, 221);
                doc.line(14, pageHeight - 16, 196, pageHeight - 16);
                
                doc.setFontSize(8);
                doc.setTextColor('#555555');
                doc.text(footerString, 105, pageHeight - 11, { align: 'center', maxWidth: 180 });
            }
        }

        doc.autoPrint();
        const blobUrl = doc.output('bloburl');
        window.open(String(blobUrl), '_blank');
    };



    return (
        <div className="p-6 bg-white dark:bg-gray-800 min-h-screen text-gray-800 dark:text-gray-200 transition-colors duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex flex-col">
                    <h2 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                        <Activity className="text-blue-500" size={28} />
                        Seguimiento Clínico
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Evolución y registro de tratamientos realizados</p>
                </div>
                <div className="flex items-center">
                    <button
                        onClick={() => setShowManual(true)}
                        className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm"
                        title="Ayuda / Manual"
                    >
                        ?
                    </button>
                </div>
            </div>

            {/* Proforma Selection Global */}
            <div className="mb-6 flex flex-wrap items-center gap-3 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                <label className="font-bold text-gray-700 dark:text-gray-300">Seleccione el Plan de Tratamiento:</label>
                <select
                    value={selectedProformaId}
                    onChange={(e) => setSelectedProformaId(Number(e.target.value))}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value={0}>-- Todos / Sin Plan --</option>
                    {proformas.map(p => {
                        // Check if this proforma is marked as terminado in Historia Clinica
                        const isCompleted = historia.some(h =>
                            h.proformaId === p.id && h.estadoPresupuesto === 'terminado'
                        );

                        return (
                            <option
                                key={p.id}
                                value={p.id}
                                style={isCompleted ? {
                                    textDecoration: 'line-through',
                                    color: '#16a34a',
                                    fontWeight: 'bold'
                                } : undefined}
                            >
                                Plan #{p.numero || p.id} - {formatDate(p.fecha)}
                            </option>
                        );
                    })}
                </select>
            </div>



            {/* Tab Contents */}
            <div className="animate-fade-in-up">
                {activeTab === 'seguimiento' ? (
                    <>
                        {selectedProformaId > 0 ? (
                            <>
                                {(showForm || historiaToEdit) && (
                                    <div className="mb-6">
                                        <HistoriaClinicaForm
                                            pacienteId={Number(id)}
                                            onSuccess={() => {
                                                fetchHistoria();
                                                setShowForm(false);
                                            }}
                                            historiaToEdit={historiaToEdit}
                                            onCancelEdit={handleCancelEdit}
                                            selectedProformaId={selectedProformaId}
                                            proformas={proformas}
                                        />
                                    </div>
                                )}

                                <HistoriaClinicaList
                                    historia={filteredHistoria}
                                    onDelete={handleDelete}
                                    onEdit={handleEdit}
                                    onNewHistoria={!showForm && !historiaToEdit ? () => setShowForm(true) : undefined}
                                    onPrint={handlePrintHistory}
                                    onViewPlan={() => setShowPlanModal(true)}
                                    onViewTimeline={() => setShowSeguimientoModal(true)}
                                    onReminder={(item) => {
                                        setSelectedReminderHistoria(item);
                                        setShowReminderModal(true);
                                    }}
                                />

                                <div className="mt-6 flex justify-end">
                                    {(() => {
                                        const selectedProforma = proformas.find(p => p.id === selectedProformaId);
                                        const totalPresupuesto = selectedProforma ? Number(selectedProforma.total || 0) : 0;
                                        const filteredPagos = pagos.filter(p => p.proformaId === selectedProformaId);
                                        const totalPagado = filteredPagos.reduce((acc, curr) => acc + Number(curr.monto), 0);
                                        const saldo = totalPagado - totalPresupuesto;
                                        const saldoFavor = saldo > 0 ? saldo : 0;
                                        const saldoContra = saldo < 0 ? Math.abs(saldo) : 0;

                                        return (
                                            <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600 flex gap-8">
                                                <div className="text-right">
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Plan de Tratamiento</div>
                                                    <div className="text-xl font-bold text-gray-800 dark:text-white">{formatNumber(totalPresupuesto)}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Pagado</div>
                                                    <div className="text-xl font-bold text-gray-800 dark:text-white">{formatNumber(totalPagado)}</div>
                                                </div>
                                                {saldoFavor > 0 && (
                                                    <div className="text-right text-green-600 dark:text-green-400">
                                                        <div className="text-sm">Saldo a Favor</div>
                                                        <div className="text-xl font-bold">{formatNumber(saldoFavor)}</div>
                                                    </div>
                                                )}
                                                {saldoContra > 0 && (
                                                    <div className="text-right text-red-600 dark:text-red-400">
                                                        <div className="text-sm">Saldo en Contra</div>
                                                        <div className="text-xl font-bold">{formatNumber(saldoContra)}</div>
                                                    </div>
                                                )}
                                                {saldo === 0 && (
                                                    <div className="text-right text-gray-500">
                                                        <div className="text-sm">Saldo</div>
                                                        <div className="text-xl font-bold">Bs. 0.00</div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </>
                        ) : (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-10 rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-800 flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                                    <Info size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-blue-800 dark:text-blue-300 mb-2">Seleccione un Plan de Tratamiento</h3>
                                <p className="text-blue-600 dark:text-blue-400 max-w-md">
                                    Para registrar tratamientos y seguimiento clínico, primero debe seleccionar un Plan de Tratamiento (Proforma) de la lista superior.
                                </p>
                            </div>
                        )}
                    </>
                ) : activeTab === 'odontograma' ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Historial de Odontogramas</h3>
                                <p className="text-sm text-gray-500 mt-1">Registre y visualice la evolución dental del paciente</p>
                            </div>
                            <div className="flex gap-4 items-center">
                                {odontogramas.length > 0 && !isEditingOdonto && (
                                    <select
                                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                                        value={selectedOdontoId || ''}
                                        onChange={(e) => {
                                            const id = Number(e.target.value);
                                            setSelectedOdontoId(id);
                                            const odonto = odontogramas.find(o => o.id === id);
                                            setOdontogramData(odonto?.mapa_dientes || {});
                                        }}
                                    >
                                        {odontogramas.map(o => (
                                            <option key={o.id} value={o.id}>
                                                Versión: {formatDate(o.createdAt)}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                <button
                                    onClick={() => {
                                        if (isEditingOdonto) {
                                            Swal.fire({
                                                title: '¿Guardar nueva versión?',
                                                text: "Se registrará el estado actual como una nueva evolución.",
                                                icon: 'question',
                                                showCancelButton: true,
                                                confirmButtonText: 'Sí, guardar',
                                                cancelButtonText: 'Cancelar'
                                            }).then(async (result) => {
                                                if (result.isConfirmed) {
                                                    try {
                                                        await api.post('/odontogramas', {
                                                            pacienteId: Number(id),
                                                            mapa_dientes: odontogramData,
                                                            notas: 'Evolución registrada desde seguimiento clínico'
                                                        });
                                                        await fetchOdontogramas();
                                                        setIsEditingOdonto(false);
                                                        Swal.fire({ icon: 'success', title: 'Guardado', timer: 1500, showConfirmButton: false });
                                                    } catch (error) {
                                                        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar el odontograma' });
                                                    }
                                                }
                                            });
                                        } else {
                                            setIsEditingOdonto(true);
                                        }
                                    }}
                                    className={`px-6 py-2 rounded-lg font-bold shadow-md transition-all flex items-center gap-2 ${isEditingOdonto
                                        ? 'bg-green-600 hover:bg-green-700 text-white'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                        }`}
                                >
                                    {isEditingOdonto ? (
                                        <><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Guardar Evolución</>
                                    ) : (
                                        <><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> Actualizar Odontograma</>
                                    )}
                                </button>
                                {isEditingOdonto && (
                                    <button
                                        onClick={() => setIsEditingOdonto(false)}
                                        className="px-4 py-2 bg-gray-500 text-white rounded-lg font-bold"
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className={`${!isEditingOdonto ? 'pointer-events-none opacity-90' : ''}`}>
                            <Odontogram
                                initialData={odontogramData}
                                onChange={(data) => setOdontogramData(data)}
                            />
                        </div>

                        {!isEditingOdonto && odontogramas.length === 0 && (
                            <div className="text-center py-20 bg-gray-50 dark:bg-gray-900/40 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                                <p className="text-gray-500">No hay registros de odontograma para este paciente.</p>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>



            {/* Plan Tratamiento Modal */}
            <PresupuestoViewModal
                isOpen={showPlanModal}
                onClose={() => setShowPlanModal(false)}
                id={id || ''}
                proformaId={selectedProformaId ? selectedProformaId.toString() : null}
            />

            {/* Seguimiento View Modal */}
            <SeguimientoViewModal
                isOpen={showSeguimientoModal}
                onClose={() => setShowSeguimientoModal(false)}
                historia={historia}
                paciente={paciente}
                selectedProformaId={selectedProformaId}
                proformas={proformas}
            />

            {/* Recordatorio Modal */}
            <RecordatorioTratamientoModal
                isOpen={showReminderModal}
                onClose={() => setShowReminderModal(false)}
                historia={selectedReminderHistoria}
                paciente={paciente}
            />

            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Seguimiento Clínico"
                sections={manualSections}
            />
        </div >
    );
};

export default HistoriaClinica;
