import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import type { Paciente, ConsentimientoPlantilla, ConsentimientoPaciente } from '../types';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';

import { FileText, Printer, Trash2 } from 'lucide-react';

const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = src;
    });
};

const PacienteTabConsentimientos: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [paciente, setPaciente] = useState<Paciente | null>(null);
    const [plantillas, setPlantillas] = useState<ConsentimientoPlantilla[]>([]);
    const [historial, setHistorial] = useState<ConsentimientoPaciente[]>([]);

    // Form state
    const [selectedPlantillaId, setSelectedPlantillaId] = useState<number | ''>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (id) {
            fetchData();
        }
    }, [id]);

    const fetchData = async () => {
        try {
            const [pacRes, plantillasRes, historialRes] = await Promise.all([
                api.get(`/pacientes/${id}`),
                api.get('/consentimientos-plantillas?page=1&limit=9999'),
                api.get(`/consentimientos-pacientes/paciente/${id}`)
            ]);
            setPaciente(pacRes.data);
            setPlantillas(plantillasRes.data.data); // data is now paginated response
            setHistorial(historialRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
            Swal.fire('Error', 'No se pudieron cargar los datos', 'error');
        }
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPlantillaId || !paciente) return;

        const plantilla = plantillas.find(p => p.id === Number(selectedPlantillaId));
        if (!plantilla) return;

        setLoading(true);

        const fechaActual = new Date().toLocaleDateString('es-ES');
        let texto = plantilla.contenido;

        // Reemplazar variables
        const nombreCompleto = `${paciente.nombre || ''} ${paciente.paterno || ''} ${paciente.materno || ''}`.replace(/\s+/g, ' ').trim();
        texto = texto.replace(/{{NOMBRE_PACIENTE}}/g, nombreCompleto || '_____________');
        texto = texto.replace(/{{CI_PACIENTE}}/g, paciente.ci || '_____________');
        texto = texto.replace(/{{FECHA_ACTUAL}}/g, new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }));

        try {
            // Guardar historial
            const dataToSave = {
                pacienteId: Number(id),
                titulo: plantilla.titulo,
                contenido_generado: texto
            };

            await api.post('/consentimientos-pacientes', dataToSave);
            
            // Generar PDF
            await generatePDF(plantilla.titulo, texto);
            
            // Reset form
            setSelectedPlantillaId('');
            
            // Recargar historial
            const historialRes = await api.get(`/consentimientos-pacientes/paciente/${id}`);
            setHistorial(historialRes.data);

        } catch (error) {
            console.error('Error:', error);
            Swal.fire('Error', 'Ocurrió un error al generar el consentimiento', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (conId: number) => {
        const result = await Swal.fire({
            title: '¿Eliminar del historial?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/consentimientos-pacientes/${conId}`);
                setHistorial(historial.filter(h => h.id !== conId));
                Swal.fire({ icon: 'success', title: 'Eliminado', showConfirmButton: false, timer: 1500 });
            } catch (error) {
                console.error('Error:', error);
                Swal.fire('Error', 'No se pudo eliminar', 'error');
            }
        }
    };

    const handleReprint = async (con: ConsentimientoPaciente) => {
        await generatePDF(con.titulo, con.contenido_generado);
    };

    const generatePDF = async (titulo: string, contenidoReemplazado: string) => {
        const doc = new jsPDF('p', 'mm', 'letter');
        
        let centroDental: any = null;
        try {
            const resCentro = await api.get('/datos-centro-dental');
            if (resCentro.data && resCentro.data.length > 0) {
                centroDental = resCentro.data[0];
            }
        } catch (error) {
            console.error('Error fetching centro dental data:', error);
        }

        // Load logo
        try {
            const logo = await loadImage('/logo-clinica-dental.jpg');
            // Add logo: x=14, y=10, width=40 (approx based on aspect ratio)
            const targetHeight = 15;
            const targetWidth = (logo.width / logo.height) * targetHeight;
            doc.addImage(logo, 'JPEG', 14, 10, targetWidth, targetHeight);
        } catch (error) {
            console.warn('Could not load logo for PDF', error);
        }

        let currentY = 40;

        // Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        
        // Center title
        const titleLines = doc.splitTextToSize(titulo.toUpperCase(), 180);
        titleLines.forEach((line: string) => {
            const textWidth = doc.getStringUnitWidth(line) * doc.getFontSize() / doc.internal.scaleFactor;
            const textOffset = (doc.internal.pageSize.width - textWidth) / 2;
            doc.text(line, textOffset, currentY);
            currentY += 7;
        });

        currentY += 5;

        // Content
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        
        // Handle line breaks properly and split text
        const paragraphs = contenidoReemplazado.split('\n');
        
        paragraphs.forEach(p => {
            if (p.trim() === '') {
                currentY += 5;
            } else {
                const lines = doc.splitTextToSize(p, 180);
                doc.text(lines, 14, currentY, { align: 'justify', maxWidth: 180 });
                currentY += (lines.length * 5) + 3;
            }
            
            // Check page break
            if (currentY > 230) {
                doc.addPage();
                currentY = 20;
            }
        });

        // Add extra space for signatures
        if (currentY > 200) {
            doc.addPage();
            currentY = 40;
        } else {
            currentY += 40;
        }

        doc.setFontSize(10);
        
        // First row of signatures (Paciente, Testigo)
        doc.text('________________________________', 50, currentY, { align: 'center' });
        doc.text('________________________________', 160, currentY, { align: 'center' });
        currentY += 5;
        doc.text('FIRMA DEL PACIENTE', 50, currentY, { align: 'center' });
        doc.text('FIRMA DEL TESTIGO / TUTOR', 160, currentY, { align: 'center' });

        currentY += 35;

        // Second row of signatures (Doctor)
        doc.text('________________________________', 105, currentY, { align: 'center' });
        currentY += 5;
        doc.text('FIRMA DEL PROFESIONAL TRATANTE', 105, currentY, { align: 'center' });

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

        // Generate BLOB and open
        window.open(doc.output('bloburl'), '_blank');
    };

    return (
        <div className="space-y-6">
            {/* Formulario Nueva Generación */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <FileText className="text-blue-500" />
                    Generar Nuevo Consentimiento
                </h3>
                
                <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Seleccionar Plantilla
                        </label>
                        <select
                            required
                            value={selectedPlantillaId}
                            onChange={(e) => setSelectedPlantillaId(e.target.value ? Number(e.target.value) : '')}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">-- Seleccione un consentimiento --</option>
                            {plantillas.map(p => (
                                <option key={p.id} value={p.id}>{p.titulo}</option>
                            ))}
                        </select>
                    </div>

                    <div className="md:col-span-2 flex justify-end mt-2">
                        <button
                            type="submit"
                            disabled={loading || !selectedPlantillaId}
                            className="bg-[#3498db] hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Printer size={18} />
                            Generar PDF e Imprimir
                        </button>
                    </div>
                </form>
            </div>

            {/* Historial */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                    Historial de Consentimientos
                </h3>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                                <th className="p-3 font-semibold text-gray-700 dark:text-gray-300">Fecha</th>
                                <th className="p-3 font-semibold text-gray-700 dark:text-gray-300">Título</th>
                                <th className="p-3 font-semibold text-gray-700 dark:text-gray-300">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {historial.map((h) => (
                                <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="p-3 text-gray-600 dark:text-gray-400">
                                        {new Date(h.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    </td>
                                    <td className="p-3 font-medium text-gray-800 dark:text-gray-200">
                                        {h.titulo}
                                    </td>
                                    <td className="p-3">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleReprint(h)}
                                                title="Reimprimir"
                                                className="p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                            >
                                                <Printer size={20} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(h.id)}
                                                title="Eliminar"
                                                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {historial.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                        No hay consentimientos registrados para este paciente.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PacienteTabConsentimientos;
