import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import type { Paciente } from '../types';
import { formatDate } from '../utils/dateUtils';
import { formatFullName } from '../utils/formatters';
import Swal from 'sweetalert2';
import { Heart, User, Stethoscope, Shield, Info, Printer } from 'lucide-react';
import ManualModal, { type ManualSection } from './ManualModal';

const PacienteTabFicha: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [paciente, setPaciente] = useState<Paciente | null>(null);
    const [loading, setLoading] = useState(true);
    const [showManual, setShowManual] = useState(false);

    const manualSections: ManualSection[] = [
        {
            title: 'Historia Clínica del Paciente',
            content: 'Aquí se muestran los datos personales, de contacto y los antecedentes médicos del paciente registrados durante su inscripción.'
        },
        {
            title: 'Antecedentes Patológicos',
            content: 'Si el paciente tiene condiciones médicas especiales (alergias, diabetes, cirugías, etc.), aparecerán resaltadas en rojo para alertar al personal clínico.'
        },
        {
            title: 'Editar Información',
            content: 'Para modificar estos datos, debe utilizar el botón "Editar Paciente" en la cabecera del perfil.'
        }
    ];

    useEffect(() => {
        if (!id) return;
        const url = `/pacientes/${id}`;
        api.get(url)
            .then(r => setPaciente(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id]);
    if (loading) return (
        <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

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
                            line-height: 1.35; 
                            font-size: 10pt; 
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
                            margin-bottom: 12px; 
                            border-bottom: 2px solid #3b82f6; 
                            padding-bottom: 8px; 
                        }
                        .header-left {
                            display: flex;
                            align-items: center;
                            gap: 12px;
                        }
                        .header-logo {
                            height: 56px;
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
                        h1 { color: #1e3a8a; margin: 0; font-size: 16pt; text-transform: uppercase; }
                        h2 { 
                            background: #eff6ff; 
                            color: #1e40af; 
                            padding: 4px 8px; 
                            margin-top: 12px; 
                            margin-bottom: 8px;
                            font-size: 11pt; 
                            text-transform: uppercase; 
                            border-left: 4px solid #3b82f6; 
                        }
                        .info-grid { 
                            display: grid; 
                            grid-template-columns: repeat(4, 1fr); 
                            gap: 8px; 
                            margin-top: 4px; 
                        }
                        .field { border-bottom: 1px solid #f3f4f6; padding: 3px 0; }
                        .label { font-weight: bold; color: #6b7280; font-size: 8.5pt; text-transform: uppercase; display: block; }
                        .value { font-size: 10pt; color: #111827; min-height: 12px; font-weight: 500; }
                        
                        .section-grid { 
                            display: grid; 
                            grid-template-columns: 1fr 1fr; 
                            gap: 16px; 
                            margin-top: 6px; 
                        }
                        .checkbox-table { width: 100%; border-collapse: collapse; }
                        .checkbox-table td { padding: 3px 2px; border-bottom: 1px solid #f9fafb; font-size: 10pt; }
                        .checkbox-icon { font-size: 12pt; margin-right: 5px; color: #3b82f6; font-weight: bold; }
                        
                        .signature-section {
                            margin-top: 25px;
                            padding-top: 15px;
                            display: flex;
                            justify-content: center;
                            width: 100%;
                        }
                        .signature-box { 
                            text-align: center; 
                            width: 250px; 
                        }
                        .sig-line { border-top: 1px solid #374151; margin-top: 0px; }
                        
                        .footer { 
                            margin-top: 20px;
                            font-size: 8.5pt; 
                            color: #9ca3af; 
                            border-top: 1px solid #e5e7eb; 
                            padding-top: 6px; 
                            display: flex; 
                            justify-content: space-between; 
                        }
                        .detail-text {
                            font-size: 9.5pt;
                            color: #4b5563;
                            margin-top: 2px;
                            font-style: italic;
                        }
                        @media print {
                            .page-container { min-height: auto; }
                            h2 { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            .page-break { page-break-before: always; break-before: page; }
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
                                    <div style="font-size: 11pt; font-weight: bold; color: #1e40af; text-transform: uppercase; margin-top: 1px;">Historia Clínica Odontológica</div>
                                    <div style="font-size: 9pt; color: #666; margin-top: 1px;">Fecha de Registro: ${formatDate(fullPaciente.fecha_ingreso)}</div>
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
                            <div class="field"><span class="label">Edad</span><div class="value">${calcEdad(fullPaciente.fecha_nacimiento)}</div></div>
                            <div class="field"><span class="label">Género</span><div class="value">${fullPaciente.genero === 'M' ? 'Masculino' : 'Femenino'}</div></div>
                            <div class="field"><span class="label">C.I. / Extensión</span><div class="value">${fullPaciente.ci || '-'}${fullPaciente.ci_extension ? ` - ${fullPaciente.ci_extension}` : ''}</div></div>
                            
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

                        <h2 class="page-break">Antecedentes Bucodentales e Higiene Oral</h2>
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
                                <div style="font-size: 9pt; color: #666;">Firma del Paciente</div>
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


    if (!paciente) return <div className="text-center py-10 text-gray-400">No se pudo cargar la ficha.</div>;

    const ficha = paciente.fichaClinica;

    function calcEdad(fecha?: string) {
        if (!fecha) return '—';
        const hoy = new Date(); const nac = new Date(fecha);
        let edad = hoy.getFullYear() - nac.getFullYear();
        const m = hoy.getMonth() - nac.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
        return `${edad} años`;
    };

    const Field = ({ label, value }: { label: string; value?: string | number | null | boolean }) => (
        <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</span>
            <span className="text-sm text-gray-800 dark:text-gray-100 font-medium border-b border-dashed border-gray-200 dark:border-gray-700 pb-1 min-h-[22px]">
                {value === true ? 'SÍ' : value === false ? 'NO' : (value ?? <span className="text-gray-400 font-normal italic">—</span>)}
            </span>
        </div>
    );

    const CheckBadge = ({ label, value }: { label: string; value?: boolean }) => (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${value
            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
            : 'bg-gray-50 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 border-gray-100 dark:border-gray-700'
        }`}>
            <span>{value ? '☑' : '☐'}</span> {label}
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 no-print">
                <div className="flex flex-col">
                    <h2 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                        <User className="text-blue-500" size={28} />
                        Historia Clínica
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Datos personales y antecedentes médicos</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowManual(true)}
                        className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm"
                        title="Ayuda / Manual"
                    >
                        ?
                    </button>
                    <button
                        onClick={() => paciente && handlePrintPaciente(paciente)}
                        className="flex items-center justify-center gap-2 bg-gray-500 hover:bg-gray-600 text-white font-bold py-1.5 px-4 rounded-xl transition-all shadow-md transform hover:-translate-y-0.5 active:scale-95"
                        title="Imprimir Ficha"
                    >
                        <Printer size={18} />
                        <span className="hidden sm:inline">Imprimir</span>
                    </button>
                </div>
            </div>
            
            <div className="content-card bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6 transition-colors">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* — FILIACIÓN Y DATOS PERSONALES — */}
                    <div>
                        <h3 className="text-base font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2 border-b dark:border-gray-700 pb-2">
                            <User size={16} className="text-blue-500" /> Datos Personales
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Fecha Ingreso" value={paciente.fecha_ingreso ? formatDate(paciente.fecha_ingreso) : undefined} />
                            <Field label="Ap. Paterno" value={paciente.paterno} />
                            <Field label="Ap. Materno" value={paciente.materno} />
                            <Field label="Nombres" value={paciente.nombre} />
                            <Field label="Fecha Nacimiento" value={paciente.fecha_nacimiento ? `${formatDate(paciente.fecha_nacimiento)} (${calcEdad(paciente.fecha_nacimiento)})` : undefined} />
                            <Field label="Género" value={paciente.genero === 'M' ? 'Masculino' : 'Femenino'} />
                            <Field label="C.I. / Documento" value={paciente.ci ? `${paciente.ci}${paciente.ci_extension ? ` - ${paciente.ci_extension}` : ''}` : undefined} />
                            <Field label="Estado Civil" value={paciente.estado_civil} />
                            <Field label="Grado de Instrucción" value={paciente.grado_instruccion} />
                            <Field label="Seguro / Convenio" value={paciente.seguro?.nombre || 'Particular'} />
                        </div>

                        <h3 className="text-base font-bold text-gray-700 dark:text-gray-300 mt-6 mb-4 flex items-center gap-2 border-b dark:border-gray-700 pb-2">
                            <User size={16} className="text-blue-500" /> Contacto
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Field label="Dirección" value={paciente.direccion} />
                            </div>
                            <Field label="Celular" value={paciente.telefono_celular} />
                            <Field label="Teléfono Fijo" value={undefined} />
                            <Field label="Email" value={paciente.email} />
                            <Field label="Ocupación" value={paciente.ocupacion} />
                        </div>

                        {paciente.tutor_nombre && (
                            <>
                                <h3 className="text-base font-bold text-gray-700 dark:text-gray-300 mt-6 mb-4 flex items-center gap-2 border-b dark:border-gray-700 pb-2">
                                    <User size={16} className="text-amber-500" /> Tutor / Responsable
                                </h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <Field label="Nombre Tutor" value={paciente.tutor_nombre} />
                                    <Field label="CI Tutor" value={paciente.tutor_ci} />
                                    <Field label="Celular Tutor" value={paciente.tutor_celular} />
                                </div>
                            </>
                        )}
                    </div>

                    {/* — FICHA MÉDICA / CLÍNICA — */}
                    <div className="space-y-6">
                        <h3 className="text-base font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2 border-b dark:border-gray-700 pb-2">
                            <Heart size={16} className="text-red-500" /> Cuestionario Médico (Ficha Médica)
                        </h3>
                        
                        {ficha ? (
                            <div className="space-y-6">
                                {/* Motivo de Consulta */}
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Motivo de Consulta</h4>
                                    <div className="text-sm text-gray-800 dark:text-gray-200">
                                        {ficha.motivo_consulta || <span className="text-gray-400 italic">No especificado</span>}
                                    </div>
                                </div>

                                {/* Antecedentes Familiares */}
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Antecedentes Familiares</h4>
                                    <div className="text-sm text-gray-800 dark:text-gray-200">
                                        {ficha.ant_pat_familiares || <span className="text-gray-400 italic">No registra enfermedades hereditarias familiares</span>}
                                    </div>
                                </div>

                                {/* Antecedentes Patológicos */}
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Antecedentes Personales Patológicos</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                                        <CheckBadge label="Anemia" value={ficha.ant_pat_anemia} />
                                        <CheckBadge label="Cardiopatías" value={ficha.ant_pat_cardiopatias} />
                                        <CheckBadge label="Enf. Gástricas" value={ficha.ant_pat_gastricas} />
                                        <CheckBadge label="Hepatitis" value={ficha.ant_pat_hepatitis} />
                                        <CheckBadge label="Tuberculosis" value={ficha.ant_pat_tuberculosis} />
                                        <CheckBadge label="Asma" value={ficha.ant_pat_asma} />
                                        <CheckBadge label="Diabetes" value={ficha.ant_pat_diabetes} />
                                        <CheckBadge label="Epilepsia" value={ficha.ant_pat_epilepsia} />
                                        <CheckBadge label="Hipertensión" value={ficha.ant_pat_hipertension} />
                                        <CheckBadge label="VIH" value={ficha.ant_pat_vih} />
                                        <CheckBadge label="Ninguno" value={ficha.ant_pat_ninguno} />
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 border-t dark:border-gray-700 pt-3">
                                        <Field label="¿Tuvo cirugías?" value={ficha.ant_pat_cirugia ? `SÍ - ${ficha.ant_pat_cirugia_detalle || ''}` : 'NO'} />
                                        <Field label="Alergias" value={ficha.ant_pat_alergias ? `SÍ - ${ficha.ant_pat_alergias_detalle || ''}` : 'NO'} />
                                        {paciente.genero === 'F' && (
                                            <Field label="Estado Gestación (Embarazo)" value={ficha.ant_pat_embarazo ? `SÍ - Semanas: ${ficha.ant_pat_embarazo_semanas || ''}` : 'NO'} />
                                        )}
                                        <Field label="Tratamiento Médico Activo" value={ficha.ant_pat_tratamiento_medico ? `SÍ - ${ficha.ant_pat_tratamiento_medico_detalle || ''}` : 'NO'} />
                                        <Field label="¿Esta tomado algún medicamento?" value={ficha.ant_pat_toma_medicamentos ? `SÍ - ${ficha.ant_pat_toma_medicamentos_detalle || ''}` : 'NO'} />
                                        <Field label="Hemorragias anormales" value={ficha.ant_pat_hemorragias ? `SÍ - Tipo: ${ficha.ant_pat_hemorragias_tipo || ''}` : 'NO'} />
                                        <Field label="Otros antecedentes patológicos" value={ficha.ant_pat_otros} />
                                    </div>
                                </div>

                                {/* Examen Físico Clínico */}
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Exámenes Clínicos</h4>
                                    
                                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2">Examen Extra Oral</p>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <Field label="A.T.M." value={ficha.exam_extra_atm} />
                                        <Field label="Ganglios Linfáticos" value={ficha.exam_extra_ganglios} />
                                        <Field label="Tipo Respirador" value={ficha.exam_extra_respirador} />
                                        <Field label="Otros hallazgos" value={ficha.exam_extra_otros} />
                                    </div>

                                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2 border-t dark:border-gray-700 pt-2">Examen Intra Oral</p>
                                    <div className="grid grid-cols-2 gap-4 mb-2">
                                        <Field label="Labios" value={ficha.exam_intra_labios} />
                                        <Field label="Lengua" value={ficha.exam_intra_lengua} />
                                        <Field label="Paladar" value={ficha.exam_intra_paladar} />
                                        <Field label="Piso de la boca" value={ficha.exam_intra_piso_boca} />
                                        <Field label="Mucosa Yugal" value={ficha.exam_intra_mucosa_yugal} />
                                        <Field label="Encías" value={ficha.exam_intra_encias} />
                                        <div className="col-span-2">
                                            <Field label="Prótesis Dental" value={ficha.exam_intra_protesis ? 'SÍ (Utiliza prótesis)' : 'NO'} />
                                        </div>
                                    </div>
                                </div>

                                {/* Antecedentes Bucodentales e Higiene */}
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Hábitos e Higiene Bucal</h4>
                                    
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <Field label="Última visita Odontólogo" value={ficha.ant_buco_ultima_visita} />
                                        <Field label="Otros Hábitos Orales" value={ficha.habito_otros} />
                                        <Field label="Hábito de Fumar" value={ficha.habito_fuma ? 'SÍ (Fuma)' : 'NO'} />
                                        <Field label="Hábito de Beber" value={ficha.habito_bebe ? 'SÍ (Consume alcohol)' : 'NO'} />
                                    </div>

                                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2 border-t dark:border-gray-700 pt-2">Elementos de Higiene Bucal</p>
                                    <div className="flex flex-wrap gap-4 mb-4">
                                        <CheckBadge label="Cepillo" value={ficha.hig_cepillo} />
                                        <CheckBadge label="Hilo Dental" value={ficha.hig_hilo} />
                                        <CheckBadge label="Enjuague Bucal" value={ficha.hig_enjuague} />
                                        <CheckBadge label="Waterpik" value={ficha.hig_waterpik} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Field label="Frecuencia Cepillado" value={ficha.hig_frecuencia_cepillado} />
                                        <Field label="Estado General de Higiene" value={ficha.hig_bucal_estado} />
                                        <div className="col-span-2">
                                            <Field label="Sangrado de Encías" value={ficha.hig_sangrado_encias ? 'SÍ (Presenta sangrado al cepillar)' : 'NO'} />
                                        </div>
                                    </div>
                                </div>

                                {/* Observaciones de Ficha */}
                                {ficha.observaciones_ficha && (
                                    <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Observaciones Clínicas Adicionales</h4>
                                        <div className="text-sm text-gray-800 dark:text-gray-250 italic">
                                            "{ficha.observaciones_ficha}"
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-400">
                                <Stethoscope size={36} className="mx-auto mb-3 opacity-30" />
                                <p className="font-medium">No se ha registrado ficha médica.</p>
                                <p className="text-sm mt-1">Edite el paciente para completar la ficha médica.</p>
                            </div>
                        )}
                    </div>
                </div>
                
                <ManualModal 
                    isOpen={showManual}
                    onClose={() => setShowManual(false)}
                    title="Manual de Usuario - Ficha Clínica"
                    sections={manualSections}
                />
            </div>
        </div>
    );
};

export default PacienteTabFicha;
