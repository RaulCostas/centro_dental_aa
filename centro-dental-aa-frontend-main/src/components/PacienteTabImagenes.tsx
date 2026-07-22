import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';
import { formatDate } from '../utils/dateUtils';
import { 
    Image as ImageIcon, 
    Trash2, 
    Plus, 
    X, 
    Upload, 
    ArrowLeft, 
    ChevronLeft, 
    ChevronRight,
    Eye
} from 'lucide-react';
import ManualModal, { type ManualSection } from './ManualModal';
import Pagination from './Pagination';

interface Image {
    id: number;
    nombre_archivo: string;
    ruta: string;
    fecha_creacion: string;
    descripcion?: string;
}

interface Proforma {
    id: number;
    numero: number;
    fecha: string;
    total: number;
    estadoPresupuesto?: string;
    imageCount?: number;
}

interface PacienteTabImagenesProps {
    tipo?: 'particular' | 'seguro';
}

const PacienteTabImagenes: React.FC<PacienteTabImagenesProps> = ({ tipo = 'particular' }) => {
    const { id: pacienteId } = useParams<{ id: string }>();
    const [proformas, setProformas] = useState<Proforma[]>([]);
    const [generalImages, setGeneralImages] = useState<Image[]>([]);
    const [selectedProforma, setSelectedProforma] = useState<Proforma | null>(null);
    const [images, setImages] = useState<Image[]>([]);
    const [viewingImages, setViewingImages] = useState(false);
    const [viewingGeneral, setViewingGeneral] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeProformaIdForUpload, setActiveProformaIdForUpload] = useState<number | null>(null);
    const [isGeneralUpload, setIsGeneralUpload] = useState(false);
    const [filesToUpload, setFilesToUpload] = useState<{ file: File; descripcion: string }[]>([]);
    const [isUploadingMode, setIsUploadingMode] = useState(false);
    const [loading, setLoading] = useState(true);
    
    // Lightbox state
    const [showLightbox, setShowLightbox] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showManual, setShowManual] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const manualSections: ManualSection[] = [
        {
            title: 'Galería de Imágenes',
            content: 'En esta sección puede gestionar las fotos y estudios del paciente. Las imágenes pueden estar asociadas a un Plan de Tratamiento o ser de carácter General.'
        },
        {
            title: 'Subir Imágenes',
            content: 'Use el botón "+ Agregar" para seleccionar fotos. Puede añadir una descripción a cada una antes de hacer clic en "Subir Todo".'
        },
        {
            title: 'Visor de Imágenes',
            content: 'Haga clic en cualquier imagen para abrir el visor a pantalla completa. Puede navegar entre fotos usando las flechas del teclado o los controles en pantalla.'
        }
    ];

    useEffect(() => {
        if (pacienteId) {
            fetchProformas();
            fetchGeneralImages();
        }
    }, [pacienteId]);

    const fetchProformas = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/proformas/paciente/${pacienteId}`);
            setProformas(response.data);
        } catch (error) {
            console.error('Error fetching proformas:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchGeneralImages = async () => {
        if (!pacienteId) return;
        try {
            const response = await api.get(`/proformas/paciente/${pacienteId}/imagenes-generales?tipo=${tipo}`);
            setGeneralImages(response.data);
        } catch (error) {
            console.error('Error fetching general images:', error);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        if (!activeProformaIdForUpload && !isGeneralUpload) return;
        
        const files = Array.from(e.target.files).map(f => ({ file: f, descripcion: '' }));
        setFilesToUpload(files);
        setIsUploadingMode(true);
    };

    const handleUploadAll = async () => {
        if ((!activeProformaIdForUpload && !isGeneralUpload) || filesToUpload.length === 0) return;

        let successCount = 0;
        const errors: string[] = [];

        Swal.fire({
            title: 'Subiendo...',
            text: 'Por favor espere mientras se procesan las imágenes',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
        });

        for (const item of filesToUpload) {
            const fd = new FormData();
            fd.append('file', item.file);
            if (item.descripcion) fd.append('descripcion', item.descripcion);
            try {
                if (isGeneralUpload) {
                    await api.post(`/proformas/paciente/${pacienteId}/imagenes?tipo=${tipo}`, fd);
                } else {
                    await api.post(`/proformas/${activeProformaIdForUpload}/imagenes`, fd);
                }
                successCount++;
            } catch (error: any) {
                console.error('Error uploading file:', error);
                const errorMsg = error.response?.data?.message || error.message || 'Error desconocido';
                errors.push(`${item.file.name}: ${errorMsg}`);
            }
        }

        Swal.close();
        if (successCount > 0) {
            Swal.fire({ 
                icon: successCount === filesToUpload.length ? 'success' : 'warning', 
                title: successCount === filesToUpload.length ? '¡Éxito!' : 'Carga Parcial', 
                text: `${successCount} de ${filesToUpload.length} imágenes subidas correctamente`, 
                timer: 2000, 
                showConfirmButton: false 
            });
            setIsUploadingMode(false);
            setFilesToUpload([]);
            if (fileInputRef.current) fileInputRef.current.value = '';
            
            if (isGeneralUpload) {
                fetchGeneralImages();
                if (viewingGeneral) {
                    // Update current view if we are already viewing general images
                    setImages(prev => [...prev, ...Array(successCount).fill({})]); // Trigger refresh or refetch
                    fetchGeneralImagesAndShow();
                }
            } else if (viewingImages && selectedProforma?.id === activeProformaIdForUpload) {
                fetchImages(activeProformaIdForUpload);
            }
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error al subir',
                html: `<div class="text-left"><p class="mb-2">No se pudo subir ninguna imagen.</p><ul class="text-xs list-disc pl-4">${errors.map(e => `<li>${e}</li>`).join('')}</ul></div>`,
            });
        }
    };

    const fetchGeneralImagesAndShow = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/proformas/paciente/${pacienteId}/imagenes-generales?tipo=${tipo}`);
            setGeneralImages(response.data);
            setImages(response.data);
            setViewingImages(true);
            setViewingGeneral(true);
            setSelectedProforma(null);
        } catch (error) {
            console.error('Error fetching general images:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchImages = async (proformaId: number) => {
        setLoading(true);
        try {
            const response = await api.get(`/proformas/${proformaId}/imagenes`);
            setImages(response.data);
            setViewingImages(true);
            setViewingGeneral(false);
        } catch (error) {
            console.error('Error fetching images:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteImage = async (imageId: number) => {
        const result = await Swal.fire({ title: '¿Eliminar imagen?', icon: 'warning', showCancelButton: true });
        if (result.isConfirmed) {
            try {
                await api.delete(`/proformas/imagenes/${imageId}`);
                if (viewingGeneral) {
                    fetchGeneralImagesAndShow();
                } else if (selectedProforma) {
                    fetchImages(selectedProforma.id);
                }
                Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1500, showConfirmButton: false });
            } catch (error) {
                console.error('Error deleting image:', error);
            }
        }
    };

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const openLightbox = (index: number) => {
        setCurrentImageIndex(index);
        setShowLightbox(true);
    };

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const paginatedProformas = proformas.slice(indexOfFirstItem, indexOfLastItem);

    if (loading && proformas.length === 0 && generalImages.length === 0) return <div className="text-center py-10">Cargando...</div>;

    return (
        <div className="content-card bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6">
            <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*" />

            {isUploadingMode ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold">Subir Imágenes</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filesToUpload.map((item, index) => (
                            <div key={index} className="p-3 border border-gray-100 dark:border-gray-700 rounded-xl flex gap-3 items-center bg-gray-50 dark:bg-gray-700/30">
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <ImageIcon size={24} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate mb-1">{item.file.name}</p>
                                    <input
                                        type="text"
                                        placeholder="Descripción de la imagen..."
                                        className="w-full p-2 text-xs border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50/50 dark:bg-blue-900/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={item.descripcion}
                                        onChange={(e) => {
                                            const next = [...filesToUpload];
                                            next[index].descripcion = e.target.value;
                                            setFilesToUpload(next);
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-3 mt-2">
                        <button 
                            onClick={handleUploadAll} 
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all transform hover:-translate-y-0.5"
                        >
                            <Upload size={18} /> Subir Todo
                        </button>
                        <button 
                            onClick={() => { setIsUploadingMode(false); setFilesToUpload([]); }} 
                            className="bg-gray-500 hover:bg-gray-600 text-white py-2.5 px-8 rounded-xl font-bold shadow-md transition-all transform hover:-translate-y-0.5"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            ) : viewingImages ? (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setViewingImages(false)} 
                                className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-md transition-all transform hover:-translate-y-0.5"
                            >
                                <ArrowLeft size={18} /> Volver
                            </button>
                        </div>
                        <h3 className="text-lg font-bold uppercase tracking-tight">
                            {viewingGeneral ? 'Imágenes Generales' : `Plan #${selectedProforma?.numero}`} — {images.length} imágenes
                        </h3>
                        <button 
                            onClick={() => { 
                                if (viewingGeneral) {
                                    setIsGeneralUpload(true);
                                    setActiveProformaIdForUpload(null);
                                } else {
                                    setIsGeneralUpload(false);
                                    setActiveProformaIdForUpload(selectedProforma!.id);
                                }
                                fileInputRef.current?.click(); 
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                        >
                            <Plus size={18} /> Agregar
                        </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {images.map((img, index) => (
                            <div key={img.id} className="group relative bg-gray-50 dark:bg-gray-700 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600">
                                <img 
                                    src={img.ruta} 
                                    alt="" 
                                    className="w-full h-40 object-cover cursor-pointer hover:scale-105 transition-transform duration-300" 
                                    onClick={() => openLightbox(index)} 
                                />
                                <div className="p-2">
                                    <p className="text-[10px] text-gray-500 line-clamp-1">{img.descripcion || 'Sin descripción'}</p>
                                </div>
                                <button 
                                    onClick={() => handleDeleteImage(img.id)}
                                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <div className="flex flex-col">
                            <h2 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                                <ImageIcon className="text-blue-500" size={28} />
                                Imágenes y RBG
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">Archivo fotográfico y radiográfico del paciente</p>
                        </div>
                        <div className="flex gap-2">
                            {tipo !== 'particular' && (
                                <button
                                    onClick={() => { setIsGeneralUpload(true); setActiveProformaIdForUpload(null); fileInputRef.current?.click(); }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                                >
                                    <Plus size={18} /> Subir Imágenes Generales
                                </button>
                            )}
                            <button
                                onClick={() => setShowManual(true)}
                                className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[35px] h-[35px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm"
                                title="Ayuda / Manual"
                            >
                                ?
                            </button>
                        </div>
                    </div>

                    {/* Record Count */}
                    {proformas.length > 0 && (
                        <div className="mb-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                            Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, proformas.length)} de {proformas.length} registros
                        </div>
                    )}

                    <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Presupuesto</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {paginatedProformas.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">Presupuesto #{p.numero}</td>
                                        <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(p.fecha)}</td>
                                        <td className="px-5 py-4 whitespace-nowrap text-center">
                                            <div className="flex justify-center gap-2">
                                                <button 
                                                    onClick={() => { setIsGeneralUpload(false); setActiveProformaIdForUpload(p.id); fileInputRef.current?.click(); }}
                                                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5" 
                                                    title="Subir"
                                                >
                                                    <Upload size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => { setSelectedProforma(p); fetchImages(p.id); }}
                                                    className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2" 
                                                    title="Ver"
                                                >
                                                    <div className="relative flex items-center gap-2">
                                                        <Eye size={18} />
                                                        {p.imageCount !== undefined && p.imageCount > 0 && (
                                                            <span className="text-[10px] font-bold bg-white/20 px-1.5 rounded-md">
                                                                {p.imageCount}
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                 {proformas.length === 0 && (
                                     <tr><td colSpan={3} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                                         <div className="flex flex-col items-center justify-center">
                                             <ImageIcon size={48} className="mb-2 text-gray-300 dark:text-gray-600" />
                                             <p>No hay registros encontrados.</p>
                                         </div>
                                     </td></tr>
                                 )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {proformas.length > itemsPerPage && (
                        <div className="mt-4">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={Math.ceil(proformas.length / itemsPerPage)}
                                onPageChange={(page) => setCurrentPage(page)}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Lightbox */}
            {showLightbox && images.length > 0 && (
                <div 
                    className="fixed inset-0 z-[99999] bg-black/95 flex flex-col items-center justify-center animate-in fade-in duration-200"
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowLeft') prevImage();
                        if (e.key === 'ArrowRight') nextImage();
                        if (e.key === 'Escape') setShowLightbox(false);
                    }}
                    tabIndex={0}
                >
                    <div className="absolute top-0 w-full p-6 flex justify-between items-center text-white/70">
                        <div className="flex flex-col">
                            <span className="text-lg font-bold text-white">
                                {images[currentImageIndex].descripcion || 'Sin descripción'}
                            </span>
                            <span className="text-xs uppercase tracking-widest font-medium">
                                Imagen {currentImageIndex + 1} de {images.length}
                            </span>
                        </div>
                        <button 
                            onClick={() => setShowLightbox(false)}
                            className="p-3 hover:bg-white/10 rounded-full transition-colors text-white"
                        >
                            <X size={32} />
                        </button>
                    </div>

                    <button 
                        onClick={(e) => { e.stopPropagation(); prevImage(); }}
                        className="absolute left-6 p-4 hover:bg-white/10 rounded-full transition-all text-white/50 hover:text-white"
                    >
                        <ChevronLeft size={48} />
                    </button>

                    <div className="max-w-5xl max-h-[80vh] flex items-center justify-center p-4">
                        <img 
                            src={images[currentImageIndex].ruta} 
                            alt={images[currentImageIndex].descripcion}
                            className="max-w-full max-h-full object-contain shadow-2xl rounded-sm"
                        />
                    </div>

                    <button 
                        onClick={(e) => { e.stopPropagation(); nextImage(); }}
                        className="absolute right-6 p-4 hover:bg-white/10 rounded-full transition-all text-white/50 hover:text-white"
                    >
                        <ChevronRight size={48} />
                    </button>
                </div>
            )}

            <ManualModal 
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Imágenes y RBG"
                sections={manualSections}
            />
        </div>
    );
};

export default PacienteTabImagenes;
