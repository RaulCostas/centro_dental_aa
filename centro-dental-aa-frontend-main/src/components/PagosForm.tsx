import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { formatDate, getLocalDateString } from '../utils/dateUtils';
import Swal from 'sweetalert2';
import type { Paciente, Proforma, Pago, ComisionTarjeta } from '../types';
import { formatFullName, formatNumber } from '../utils/formatters';
import ManualModal, { type ManualSection } from './ManualModal';

import FormaPagoForm from './FormaPagoForm';
import ComisionTarjetaForm from './ComisionTarjetaForm';
import { Printer } from 'lucide-react';


const PagosForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    
    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [proformas, setProformas] = useState<Proforma[]>([]);
    const [filteredProformas, setFilteredProformas] = useState<Proforma[]>([]);
    const [existingPagos, setExistingPagos] = useState<Pago[]>([]);
    const [allPagos, setAllPagos] = useState<Pago[]>([]); // New state for all payments

    const [comisiones, setComisiones] = useState<ComisionTarjeta[]>([]);
    const [formasPago, setFormasPago] = useState<any[]>([]); // Dynamic payment methods


    const [formData, setFormData] = useState({
        pacienteId: 0,
        fecha: getLocalDateString(),
        proformaId: 0,
        monto: '',
        moneda: 'Bolivianos',
        tc: 0,
        recibo: '',
        factura: '',
        formaPagoId: 0, // Add formaPagoId
        comisionTarjetaId: '',
        observaciones: ''
    });
    const [showManual, setShowManual] = useState(false);
    const [sendingWhatsapp, setSendingWhatsapp] = useState(false);

    // Modales y Permisos para creación rápida
    const [isFormaPagoModalOpen, setIsFormaPagoModalOpen] = useState(false);
    const [isComisionModalOpen, setIsComisionModalOpen] = useState(false);
    const [userPermisos, setUserPermisos] = useState<string[]>([]);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setUserPermisos(Array.isArray(user.permisos) ? user.permisos : []);
            } catch (error) {
                console.error('Error parseando usuario:', error);
            }
        }
    }, []);

    const puedeCrearAtributo = !userPermisos.includes('configuracion');

    const handleSendWhatsapp = async () => {
        if (!formData.pacienteId) return;

        setSendingWhatsapp(true);
        try {
            const response = await api.post('/pagos/whatsapp', {
                pacienteId: formData.pacienteId,
                proformaId: formData.proformaId > 0 ? formData.proformaId : undefined
            });

            if (response.data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Enviado',
                    text: 'El historial de pagos se envió por WhatsApp correctamente.',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: response.data.message || 'No se pudo enviar el mensaje.'
                });
            }
        } catch (error: any) {
            console.error('Error sending whatsapp:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al enviar por WhatsApp'
            });
        } finally {
            setSendingWhatsapp(false);
        }
    };

    const manualSections: ManualSection[] = [
        {
            title: 'Registrar Pagos',
            content: 'Registre los pagos de los pacientes asociados a sus planes de tratamiento. Puede aplicar pagos parciales o totales, y el sistema calcula automáticamente el saldo pendiente.'
        },
        {
            title: 'Formas de Pago',
            content: 'Seleccione la forma de pago (Efectivo, Tarjeta, Transferencia, etc.). Para pagos con tarjeta, puede aplicar comisiones configuradas previamente.'
        },
        {
            title: 'Saldo a Favor',
            content: 'Si el pago excede el monto del plan de tratamiento, se genera un saldo a favor que puede transferirse a otro plan de tratamiento del mismo paciente.'
        },
        {
            title: 'Historial de Pagos',
            content: 'Vea el historial completo de pagos del paciente y el estado de cada plan de tratamiento (pagado, pendiente, saldo).'
        }];

    useEffect(() => {
        fetchPacientes();
        fetchProformas();
        fetchComisiones();
        fetchFormasPago();
        if (id) {
            fetchPago(Number(id));
        }
    }, [id]);

    useEffect(() => {
        if (formData.pacienteId) {
            const filtered = proformas
                .filter(p => p.pacienteId === formData.pacienteId)
                .sort((a, b) => (Number(a.numero) || 0) - (Number(b.numero) || 0));
            setFilteredProformas(filtered);
            fetchExistingPagos(formData.pacienteId, formData.proformaId);

        } else {
            setFilteredProformas([]);
            setExistingPagos([]);
            setAllPagos([]);

        }
    }, [formData.pacienteId, formData.proformaId, proformas]);



    const fetchPacientes = async () => {
        try {
            const response = await api.get('/pacientes');
            setPacientes(response.data.data || []);
        } catch (error) {
            console.error('Error fetching pacientes:', error);
        }
    };

    const fetchProformas = async () => {
        try {
            const response = await api.get('/proformas');
            setProformas(response.data || []);
        } catch (error) {
            console.error('Error fetching proformas:', error);
        }
    };

    const fetchComisiones = async () => {
        try {
            const response = await api.get('/comision-tarjeta');
            const activeComisiones = (response.data.data || response.data || []).filter((com: any) => com.estado === 'activo');
            setComisiones(activeComisiones);
        } catch (error) {
            console.error('Error fetching comisiones:', error);
        }
    };

    const fetchFormasPago = async () => {
        try {
            const response = await api.get('/forma-pago?limit=100');
            // Check structure of response (paginated or array)
            const data = response.data.data ? response.data.data : response.data;
            setFormasPago(data || []);
            // Set default if exists
            if (data && data.length > 0 && !formData.formaPagoId) {
                // Logic to select 'Efectivo' by default if exists
                const efectivo = data.find((fp: any) => fp.forma_pago.toLowerCase() === 'efectivo');
                if (efectivo) {
                    setFormData(prev => ({ ...prev, formaPagoId: efectivo.id }));
                }
            }
        } catch (error) {
            console.error('Error fetching formas pago:', error);
        }
    };

    const fetchPago = async (pagoId: number) => {
        try {
            const response = await api.get(`/pagos/${pagoId}`);
            const pago = response.data;
            setFormData({
                pacienteId: pago.pacienteId,
                fecha: pago.fecha, // Assuming format YYYY-MM-DD
                proformaId: pago.proformaId || 0,
                monto: String(pago.monto),
                moneda: pago.moneda || 'Bolivianos',
                tc: Number(pago.tc),
                recibo: pago.recibo || '',
                factura: pago.factura || '',
                formaPagoId: pago.formaPagoId || (pago.formaPagoRel ? pago.formaPagoRel.id : 0),
                comisionTarjetaId: pago.comisionTarjetaId || '',
                observaciones: pago.observaciones || ''
            });
        } catch (error) {
            console.error('Error fetching pago:', error);
        }
    };

    const fetchExistingPagos = async (pacienteId: number, proformaId: number) => {
        try {
            const response = await api.get(`/pagos/paciente/${pacienteId}`);
            let pagos = response.data || [];
            setAllPagos(pagos); // Store all payments for the patient
            if (proformaId) {
                pagos = pagos.filter((p: Pago) => p.proformaId === proformaId);
            }
            console.log('Pagos fetching result:', pagos);
            setExistingPagos(pagos);
        } catch (error) {
            console.error('Error fetching existing pagos:', error);
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "No podrás revertir esto",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/pagos/${id}`);
                Swal.fire({
                    icon: 'success',
                    title: 'Eliminado',
                    text: 'Pago eliminado correctamente',
                    timer: 1500,
                    showConfirmButton: false
                });
                // Refresh data
                if (formData.pacienteId) {
                    fetchExistingPagos(formData.pacienteId, formData.proformaId);

                }
            } catch (error) {
                console.error('Error deleting pago:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al eliminar el pago'
                });
            }
        }
    };

    const handlePrint = () => {
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


        const pacienteNombre = pacientes.find(p => p.id === formData.pacienteId);
        const proformaNombre = proformas.find(p => p.id === formData.proformaId);

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Historial de Pagos</title>
                <style>
                    @page {
                        size: A4;
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
                    
                    .patient-info {
                        margin: 15px 0;
                        padding: 10px;
                        background-color: #f8f9fa;
                        border-left: 4px solid #3498db;
                    }
                    
                    .patient-info p {
                        margin: 5px 0;
                        font-size: 12px;
                    }
                    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                    }
                    
                    th {
                        background-color: #3498db;
                        color: white;
                        padding: 12px 8px;
                        text-align: left;
                        font-weight: bold;
                        border: 1px solid #2980b9;
                        font-size: 11px;
                    }
                    
                    td {
                        padding: 8px;
                        border: 1px solid #ddd;
                        font-size: 10px;
                    }
                    
                    tr:nth-child(even) {
                        background-color: #f8f9fa;
                    }
                    
                    
                    @media print {
                        body {
                            margin: 0;
                        }
                        
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
                        
                        .patient-info {
                            background-color: #f8f9fa !important;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="CENTRO DENTAL A&A" alt="Logo">
                    <h1>Historial de Pagos</h1>
                </div>
                
                <div class="patient-info">
                    <p><strong>Paciente:</strong> ${pacienteNombre ? formatFullName(pacienteNombre) : 'N/A'}</p>
                    ${proformaNombre ? `<p><strong>Plan de Tratamiento:</strong> No. ${proformaNombre.numero} - Total: ${formatNumber(proformaNombre.total)} Bs</p>` : ''}
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Monto</th>
                            <th>Moneda</th>
                            <th>Forma Pago</th>
                            <th>Recibo/Factura</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${existingPagos.map(pago => {
            const isDollar = pago.moneda === 'Dólares';
            const displayMonto = isDollar
                ? `${formatNumber(pago.monto)} (TC: ${formatNumber(pago.tc)})`
                : formatNumber(pago.monto);
            const displayMoneda = pago.moneda || 'Bolivianos';

            return `
                                <tr>
                                    <td>${formatDate(pago.fecha)}</td>
                                    <td>${displayMonto}</td>
                                    <td>${displayMoneda}</td>
                                    <td>${pago.formaPagoRel?.forma_pago || '-'}</td>
                                    <td>${pago.recibo ? `R: ${pago.recibo}` : pago.factura ? `F: ${pago.factura}` : '-'}</td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
                
                <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;">
                    <h3 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 16px; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Resumen Financiero</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div style="padding: 10px; background-color: white; border-radius: 4px; border-left: 4px solid #3498db;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 5px;">Total Plan de Tratamiento:</div>
                            <div style="font-size: 16px; font-weight: bold; color: #2c3e50;">Bs. ${formatNumber(totalPresupuesto)}</div>
                        </div>
                        <div style="padding: 10px; background-color: white; border-radius: 4px; border-left: 4px solid #27ae60;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 5px;">Pagado por Paciente:</div>
                            <div style="font-size: 16px; font-weight: bold; color: #27ae60;">Bs. ${formatNumber(totalPagado)}</div>
                        </div>
                        <div style="padding: 10px; background-color: white; border-radius: 4px; border-left: 4px solid #3498db;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 5px;">Saldo a Favor:</div>
                            <div style="font-size: 16px; font-weight: bold; color: #3498db;">Bs. ${formatNumber(saldoFavor)}</div>
                        </div>
                        <div style="padding: 10px; background-color: white; border-radius: 4px; border-left: 4px solid #e74c3c;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 5px;">Saldo en Contra:</div>
                            <div style="font-size: 16px; font-weight: bold; color: #e74c3c;">Bs. ${formatNumber(saldoContra)}</div>
                        </div>
                    </div>
                </div>
                
                

            </body>
            </html>
        `;

        doc.open();
        doc.write(printContent);
        doc.close();

        // Wait for images to load (like logo) before printing
        const logo = doc.querySelector('img');

        const doPrint = () => {
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            } catch (e) {
                console.error('Print error:', e);
            } finally {
                // Remove iframe after sufficient time
                setTimeout(() => {
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                    }
                }, 2000);
            }
        };

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
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name.includes('Id') ? Number(value) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let finalMonto = Number(formData.monto);
            let finalMoneda = formData.moneda;
            let finalObservaciones = formData.observaciones;

            if (formData.moneda === 'Dólares') {
                // finalMonto = finalMonto * Number(formData.tc); // REMOVED: Do not convert
                // finalMoneda = 'Bolivianos'; // REMOVED: Keep as Dólares
                const obsDetalle = `(Cancelado en Dólares: $${formData.monto} - TC: ${formData.tc})`;
                finalObservaciones = finalObservaciones ? `${finalObservaciones} ${obsDetalle}` : obsDetalle;
            }

            const payload = {
                pacienteId: formData.pacienteId,
                fecha: formData.fecha,
                monto: finalMonto,
                moneda: finalMoneda,
                tc: Number(formData.tc),
                recibo: formData.recibo,
                factura: formData.factura,
                formaPagoId: formData.formaPagoId > 0 ? formData.formaPagoId : undefined,
                observaciones: finalObservaciones,
                proformaId: formData.proformaId > 0 ? formData.proformaId : undefined,
                comisionTarjetaId:
                    formData.formaPagoId && formasPago.find(fp => fp.id === formData.formaPagoId)?.forma_pago?.toLowerCase() === 'tarjeta' && Number(formData.comisionTarjetaId) > 0
                        ? Number(formData.comisionTarjetaId)
                        : undefined,
                monto_comision:
                    formData.formaPagoId && formasPago.find(fp => fp.id === formData.formaPagoId)?.forma_pago?.toLowerCase() === 'tarjeta' && Number(formData.comisionTarjetaId) > 0
                        ? (finalMonto * (comisiones.find(c => c.id === Number(formData.comisionTarjetaId))?.monto || 0)) / 100
                        : undefined,
                usuarioId: (() => {
                    const userStr = localStorage.getItem('user');
                    if (userStr) {
                        try {
                            const user = JSON.parse(userStr);
                            return user.id ? Number(user.id) : undefined;
                        } catch (e) {
                            console.error("Error parsing user for auditing", e);
                        }
                    }
                    return undefined;
                })()
            };

            if (id) {
                await api.patch(`/pagos/${id}`, payload);
            } else {
                await api.post('/pagos', payload);
            }

            Swal.fire({
                icon: 'success',
                title: id ? 'Pago Actualizado' : 'Pago Registrado',
                text: id ? 'Pago actualizado correctamente' : 'Pago registrado exitosamente',
                timer: 1500,
                showConfirmButton: false
            });
            setTimeout(() => {
                navigate('/pagos');
            }, 1500);
        } catch (error: any) {
            console.error('Error saving pago:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Error al guardar el pago';
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage
            });
        }
    };


    // Calculation logic lifted for access
    const selectedProforma = proformas.find(p => p.id === formData.proformaId);
    const totalPresupuesto = selectedProforma ? Number(selectedProforma.total || 0) : 0;

    const totalPagado = allPagos
        .filter(p => !p.proformaId || p.proformaId === formData.proformaId)
        .reduce((acc, curr) => {
            let amount = Number(curr.monto);
            if (curr.moneda === 'Dólares') {
                amount = amount * Number(curr.tc);
            }
            return acc + amount;
        }, 0);

    const saldo = totalPagado - totalPresupuesto;
    const saldoFavor = saldo > 0 ? saldo : 0;
    const saldoContra = saldo < 0 ? Math.abs(saldo) : 0;

    // Transfer Modal States
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [targetPacienteId, setTargetPacienteId] = useState(0);
    const [targetProformas, setTargetProformas] = useState<Proforma[]>([]);
    const [targetProformaId, setTargetProformaId] = useState(0);
    const [transferAmount, setTransferAmount] = useState<number>(0);

    const handlePasarSaldo = () => {
        setTransferAmount(saldoFavor);
        setShowTransferModal(true);
    };

    const handleTargetPacienteChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const pId = Number(e.target.value);
        setTargetPacienteId(pId);
        setTargetProformaId(0);
        if (pId > 0) {
            try {
                // Reuse existing proforma fetch logic but filtered by this patient?
                // Or easier: fetch all proformas and filter in memory if not too large, or specific endpoint.
                // Since we already fetched all proformas in `proformas` state?
                // Yes, `proformas` contains all.
                const pProformas = proformas.filter(p => p.pacienteId === pId);
                setTargetProformas(pProformas);
            } catch (error) {
                console.error("Error setting target proformas", error);
            }
        } else {
            setTargetProformas([]);
        }
    };

    const confirmTransfer = async () => {
        if (!targetPacienteId) {
            Swal.fire({ icon: 'warning', title: 'Atención', text: 'Seleccione un paciente destino' });
            return;
        }
        if (transferAmount <= 0) {
            Swal.fire({ icon: 'warning', title: 'Atención', text: 'El monto debe ser mayor a 0' });
            return;
        }
        if (transferAmount > saldoFavor) {
            Swal.fire({ icon: 'warning', title: 'Atención', text: 'El monto no puede superar el saldo a favor' });
            return;
        }

        const sPid = Number(formData.pacienteId);
        const sProfId = Number(formData.proformaId) || 0;
        const tPid = Number(targetPacienteId);
        const tProfId = Number(targetProformaId) || 0;

        if (sPid === tPid && sProfId === tProfId) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se puede transferir al mismo plan de tratamiento del mismo paciente.' });
            return;
        }

        try {
            await api.post('/pagos/transferir-saldo', {
                sourcePacienteId: Number(formData.pacienteId),
                sourceProformaId: Number(formData.proformaId) || null,
                targetPacienteId: Number(targetPacienteId),
                targetProformaId: Number(targetProformaId) || null, // Optional?
                amount: Number(transferAmount),
                usuarioId: (() => {
                    const userStr = localStorage.getItem('user');
                    if (userStr) {
                        try {
                            const user = JSON.parse(userStr);
                            return user.id ? Number(user.id) : undefined;
                        } catch (e) {
                            console.error("Error parsing user for auditing", e);
                        }
                    }
                    return undefined;
                })()
            });

            Swal.fire({
                icon: 'success',
                title: 'Transferencia Exitosa',
                text: 'Transferencia realizada con éxito',
                timer: 1500,
                showConfirmButton: false
            });
            setShowTransferModal(false);
            // Refresh data
            await fetchExistingPagos(formData.pacienteId, formData.proformaId);
            // Optionally refresh balance calculation... it's derived from pagos, so fetching pagos updates it.
        } catch (error: any) {
            console.error("Error transferring balance", error);
            const msg = error.response?.data?.message || "Error al realizar la transferencia";
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: msg
            });
        }
    };

    return (
        <div className="content-card max-w-[1400px] mx-auto text-gray-800 dark:text-white bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                    <span className="p-2 bg-green-100 dark:bg-green-900 rounded-xl text-green-600 dark:text-green-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </span>
                    {id ? 'Editar Pago' : 'Nuevo Pago'}
                </h2>
                <button
                    type="button"
                    onClick={() => setShowManual(true)}
                    className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                    title="Ayuda / Manual"
                >
                    ?
                </button>
            </div>

            <div className="no-print flex flex-row gap-6 items-start">
                <form onSubmit={handleSubmit} className="flex-1 w-full">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">

                        {/* Paciente */}
                        <div className="md:col-span-2">
                            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Paciente:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <select
                                    name="pacienteId"
                                    value={formData.pacienteId}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-10 pr-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
                                ><option value={0}>-- Seleccione Paciente --</option>
                                    {pacientes.map(p => (
                                        <option key={p.id} value={p.id}>{formatFullName(p)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Plan de Tratamiento (Opcional):</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                    <polyline points="10 9 9 9 8 9"></polyline>
                                </svg>
                                <select
                                    name="proformaId"
                                    value={formData.proformaId}
                                    onChange={handleChange}
                                    disabled={!formData.pacienteId}
                                    className="w-full pl-10 pr-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:cursor-not-allowed text-sm"
                                ><option value={0}>-- Seleccione Plan de Tratamiento --</option>
                                    {filteredProformas.map(p => (
                                        <option key={p.id} value={p.id}>No. {p.numero} - Total: {formatNumber(p.total)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Fecha */}
                        <div>
                            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Fecha:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                <input
                                    type="date"
                                    name="fecha"
                                    value={formData.fecha}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-10 pr-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>
                        </div>

                        {/* Monto */}
                        <div>
                            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Monto:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <line x1="12" y1="1" x2="12" y2="23"></line>
                                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                </svg>
                                <input
                                    type="number"
                                    name="monto"
                                    value={formData.monto}
                                    onChange={handleChange}
                                    required
                                    step="0.01"
                                    placeholder="Ej: 150.00"
                                    className="w-full pl-10 pr-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>
                        </div>

                        {/* Moneda */}
                        <div>
                            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Moneda:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path>
                                    <line x1="12" y1="18" x2="12" y2="22"></line>
                                    <line x1="12" y1="2" x2="12" y2="6"></line>
                                </svg>
                                <select
                                    name="moneda"
                                    value={formData.moneda}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-10 pr-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
                                >
                                    <option value="" disabled>-- Seleccione --</option><option value="Bolivianos">Bolivianos</option>
                                    <option value="Dólares">Dólares</option>
                                </select>
                            </div>
                        </div>

                        {/* TC - Only show if Moneda is Dólares */}
                        {formData.moneda === 'Dólares' && (
                            <div>
                                <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm">Tipo de Cambio (TC):</label>
                                <div className="relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                        <polyline points="23 4 23 10 17 10"></polyline>
                                        <polyline points="1 20 1 14 7 14"></polyline>
                                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                    </svg>
                                    <input
                                        type="number"
                                        name="tc"
                                        value={formData.tc}
                                        onChange={handleChange}
                                        required
                                        step="0.01"
                                        placeholder="Ej: 6.96"
                                        className="w-full pl-10 pr-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Recibo */}
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm">No. Recibo:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                </svg>
                                <input
                                    type="text"
                                    name="recibo"
                                    value={formData.recibo}
                                    onChange={handleChange}
                                    placeholder="Ej: 987654"
                                    className="w-full pl-10 pr-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>
                        </div>

                        {/* Factura */}
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm">No. Factura:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                </svg>
                                <input
                                    type="text"
                                    name="factura"
                                    value={formData.factura}
                                    onChange={handleChange}
                                    placeholder="Ej: 123456"
                                    className="w-full pl-10 pr-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>
                        </div>

                        {/* Forma de Pago */}
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm">Forma de Pago:</label>
                            <div className="flex gap-2">
                                <div className="relative flex-grow">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                        <line x1="1" y1="10" x2="23" y2="10"></line>
                                    </svg>
                                    <select
                                        name="formaPagoId"
                                        value={formData.formaPagoId || ''}
                                        onChange={(e) => {
                                            const selectedId = Number(e.target.value);
                                            setFormData(prev => ({
                                                ...prev,
                                                formaPagoId: selectedId
                                            }));
                                        }}
                                        required
                                        className="w-full pl-10 pr-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
                                    >
                                        <option value="">-- Seleccione Forma de Pago --</option>
                                        {formasPago.map((fp: any) => (
                                            <option key={fp.id} value={fp.id}>{fp.forma_pago}</option>
                                        ))}
                                    </select>
                                </div>
                                {puedeCrearAtributo && (
                                    <button
                                        type="button"
                                        onClick={() => setIsFormaPagoModalOpen(true)}
                                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-3 py-1.5 rounded-xl flex items-center justify-center transform hover:-translate-y-0.5 transition-all active:scale-95 shadow-md"
                                        title="Añadir Forma de Pago"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Helper logic for Tarjeta check */}
                        {(() => {
                            const selectedFormaPago = formasPago.find(fp => fp.id === formData.formaPagoId);
                            const isTarjeta = selectedFormaPago && selectedFormaPago.forma_pago.toLowerCase() === 'tarjeta';

                            return isTarjeta && (
                                <div>
                                    <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm">Tipo de Tarjeta (Comisión): <span className="text-red-500">*</span></label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-grow">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                                <line x1="1" y1="10" x2="23" y2="10"></line>
                                            </svg>
                                            <select
                                                name="comisionTarjetaId"
                                                value={formData.comisionTarjetaId || ''}
                                                onChange={handleChange}
                                                required={true}
                                                className="w-full pl-10 pr-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
                                            >
                                                <option value="">-- Seleccione Tarjeta --</option>
                                                {comisiones.filter(c => c.estado === 'activo').map(comision => (
                                                    <option key={comision.id} value={comision.id}>
                                                        {comision.redBanco} - {comision.monto}%
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {puedeCrearAtributo && (
                                            <button
                                                type="button"
                                                onClick={() => setIsComisionModalOpen(true)}
                                                className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-3 py-1.5 rounded-xl flex items-center justify-center transform hover:-translate-y-0.5 transition-all active:scale-95 shadow-md"
                                                title="Añadir Comisión de Tarjeta"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Observaciones */}
                        <div className="md:col-span-3 lg:col-span-4">
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm">Observaciones:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-6 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                <textarea
                                    name="observaciones"
                                    value={formData.observaciones}
                                    onChange={handleChange}
                                    rows={3}
                                    placeholder="Ingrese una descripción..."
                                    className="w-full pl-10 pr-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>
                        </div>

                    </div>

                    <div className="mt-8 flex justify-start gap-4 p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
                        <button
                            type="submit"
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-xl flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                <polyline points="7 3 7 8 15 8"></polyline>
                            </svg>
                            {id ? 'Actualizar Pago' : 'Guardar Pago'}
                        </button>
                        {saldoFavor > 0 && (
                            <button
                                type="button"
                                onClick={handlePasarSaldo}
                                className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-xl flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                                    <polyline points="9 11 12 14 22 4"></polyline>
                                </svg>
                                Pasar Saldo
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => navigate('/pagos')}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            Cancelar
                        </button>
                    </div>
                </form >

                {/* Financial Summary Side Panel */}
                {
                    formData.proformaId > 0 && (
                        <div className="bg-white dark:bg-gray-700/50 rounded-xl shadow-md border border-gray-200 dark:border-gray-600 w-80 shrink-0 overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 text-white">
                                <h3 className="m-0 text-lg font-bold flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="1" x2="12" y2="23"></line>
                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                    </svg>
                                    Resumen Financiero
                                </h3>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-600 pb-3">
                                    <div className="text-gray-600 dark:text-gray-300 text-sm">Total Plan de Tratamiento:</div>
                                    <div className="font-bold text-lg text-gray-800 dark:text-white">
                                        Bs. {formatNumber(totalPresupuesto)}
                                    </div>
                                </div>

                                {/* Paid by Patient */}
                                <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-600 pb-3">
                                    <div className="text-gray-600 dark:text-gray-300 text-sm">Pagado por Paciente:</div>
                                    <div className="font-bold text-lg text-green-600 dark:text-green-400">
                                        Bs. {formatNumber(totalPagado)}
                                    </div>
                                </div>

                                {/* Saldo a Favor */}
                                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                                    <div className="text-blue-800 dark:text-blue-300 text-sm font-bold">Saldo a Favor:</div>
                                    <div className="font-bold text-lg text-blue-600 dark:text-blue-400">
                                        Bs. {formatNumber(saldoFavor)}
                                    </div>
                                </div>

                                {/* Saldo en Contra */}
                                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/30 rounded-xl">
                                    <div className="text-red-800 dark:text-red-300 text-sm font-bold">Saldo en Contra:</div>
                                    <div className="font-bold text-lg text-red-600 dark:text-red-400">
                                        Bs. {formatNumber(saldoContra)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div>

            {/* Existing Payments Table */}
            {
                formData.proformaId > 0 && (
                    <div style={{ marginTop: '40px', borderTop: '1px solid #ccc', paddingTop: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3>
                                Historial de Pagos
                                {formData.proformaId ? ` - Plan de Tratamiento No. ${proformas.find(p => p.id === formData.proformaId)?.numero} - Total: ${formatNumber(proformas.find(p => p.id === formData.proformaId)?.total)} Bs` : ''}
                            </h3>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleSendWhatsapp}
                                    disabled={sendingWhatsapp}
                                    className="bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold py-2 px-4 rounded-xl flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2 disabled:opacity-50 disabled:cursor-not-allowed no-print"
                                    title="Enviar por WhatsApp"
                                >
                                    {sendingWhatsapp ? (
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.505 2.197.961 2.642.961 3.111.912.492-.05 1.758-.718 2.006-1.412.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                            </svg>
                                            <span className="text-sm">Enviar</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handlePrint}
                                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-xl flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2 no-print"
                                    title="Imprimir"
                                >
                                    <Printer size={18} />
                                    <span className="text-sm">Imprimir</span>
                                </button>
                            </div>
                        </div>
                        {/* Tabla de Pagos Realizados */}
                        <div className="mt-8">
                            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                                Pagos Realizados
                            </h3>
                            <div className="overflow-x-auto shadow-md sm:rounded-xl">
                                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                        <tr>
                                            <th scope="col" className="px-6 py-3">Fecha</th>
                                            <th scope="col" className="px-6 py-3">Monto</th>
                                            <th scope="col" className="px-6 py-3">Moneda</th>
                                            <th scope="col" className="px-6 py-3">Forma Pago</th>
                                            <th scope="col" className="px-6 py-3">Recibo/Factura</th>
                                            <th scope="col" className="px-6 py-3 no-print">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {existingPagos.map((pago) => {
                                            const isDollar = pago.moneda === 'Dólares';
                                            const displayMonto = isDollar
                                                ? `${formatNumber(pago.monto)} (${formatNumber(pago.tc)})`
                                                : formatNumber(pago.monto);
                                            const displayMoneda = pago.moneda || 'Bolivianos';

                                            return (
                                                <tr key={pago.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                                        {formatDate(pago.fecha)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {displayMonto}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {displayMoneda}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {pago.formaPagoRel ? pago.formaPagoRel.forma_pago : ''}
                                                        {pago.formaPagoRel?.forma_pago?.toLowerCase() === 'tarjeta' && pago.comisionTarjeta && ` (${pago.comisionTarjeta.redBanco})`}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {pago.recibo ? `R: ${pago.recibo}` : ''}
                                                        {pago.recibo && pago.factura ? ' / ' : ''}
                                                        {pago.factura ? `F: ${pago.factura}` : ''}
                                                    </td>
                                                    <td className="px-6 py-4 flex gap-2 no-print">
                                                        <button
                                                            onClick={() => navigate(`/pagos/edit/${pago.id}`)}
                                                            className="p-2 bg-amber-400 hover:bg-amber-500 text-white rounded-xl shadow-md transition-all transform hover:-translate-y-0.5"
                                                            title="Editar"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(pago.id)}
                                                            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-md transition-all transform hover:-translate-y-0.5"
                                                            title="Eliminar"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {existingPagos.length === 0 && (
                                            <tr className="bg-white dark:bg-gray-800">
                                                <td colSpan={7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                                    No hay pagos registrados para esta selección.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                )
            }

            {/* Transfer Modal */}
            {
                showTransferModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[9999]">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-lg shadow-2xl transform transition-all">
                            <h3 className="text-xl font-bold mb-4 border-b border-gray-200 dark:border-gray-700 pb-2 text-gray-800 dark:text-white">
                                Transferir Saldo a Favor
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">De Paciente:</label>
                                    <input
                                        type="text"
                                        value={(() => {
                                            const p = pacientes.find(p => p.id === formData.pacienteId);
                                            return p ? formatFullName(p) : '';
                                        })()}
                                        disabled
                                        className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-not-allowed"
                                    />
                                    <p className="mt-1 text-sm font-bold text-green-600 dark:text-green-400">
                                        Saldo Disponible: Bs. {formatNumber(saldoFavor)}
                                    </p>
                                </div>

                                <div>
                                    <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">A Paciente:</label>
                                    <div className="relative">
                                        <select
                                            value={targetPacienteId}
                                            onChange={handleTargetPacienteChange}
                                            className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                        >
                                            <option value="" disabled>-- Seleccione --</option><option value={0}>-- Seleccionar Paciente Destino --</option>
                                            {pacientes.map(p => (
                                                <option key={p.id} value={p.id}>{formatFullName(p)}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Plan de Tratamiento Destino (Opcional):</label>
                                    <div className="relative">
                                        <select
                                            value={targetProformaId}
                                            onChange={(e) => setTargetProformaId(Number(e.target.value))}
                                            disabled={targetPacienteId === 0}
                                            className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                                        >
                                            <option value="" disabled>-- Seleccione --</option>
                                            <option value={0}>-- General (Sin Plan de Tratamiento) --</option>
                                            {targetProformas.map(p => (
                                                <option key={p.id} value={p.id}>No. {p.numero} - Total: {formatNumber(p.total)}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Monto a Traspasar:</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={transferAmount}
                                            onChange={(e) => setTransferAmount(Number(e.target.value))}
                                            max={saldoFavor}
                                            min={0.01}
                                            step="0.01"
                                            className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowTransferModal(false)}
                                    className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2">

                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg> Cancelar
                                </button>
                                <button
                                    onClick={confirmTransfer}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                                >
                                    Aceptar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual - Pagos"
                sections={manualSections}
            />

            {/* Modal de Creación Rápida de Forma de Pago */}
            {puedeCrearAtributo && (
                <div style={{ zIndex: 60 }} className="relative">
                    <FormaPagoForm
                        isOpen={isFormaPagoModalOpen}
                        onClose={() => setIsFormaPagoModalOpen(false)}
                        onSaveSuccess={() => {
                            fetchFormasPago();
                            setIsFormaPagoModalOpen(false);
                        }}
                    />
                </div>
            )}

            {/* Modal de Creación Rápida de Comisión de Tarjeta */}
            {puedeCrearAtributo && (
                <div style={{ zIndex: 60 }} className="relative">
                    <ComisionTarjetaForm
                        isOpen={isComisionModalOpen}
                        onClose={() => setIsComisionModalOpen(false)}
                        onSaveSuccess={() => {
                            fetchComisiones();
                            setIsComisionModalOpen(false);
                        }}
                    />
                </div>
            )}
        </div >
    );
};

export default PagosForm;
