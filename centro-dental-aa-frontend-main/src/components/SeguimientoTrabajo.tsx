import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { SeguimientoTrabajo, TrabajoLaboratorio } from '../types';
import Swal from 'sweetalert2';
import { formatDate, getLocalDateString } from '../utils/dateUtils';
import { formatFullName } from '../utils/formatters';

const SeguimientoTrabajoComponent: React.FC = () => {
    const { workId } = useParams<{ workId: string }>();
    const navigate = useNavigate();
    const [history, setHistory] = useState<SeguimientoTrabajo[]>([]);
    const [loading, setLoading] = useState(true);
    const [trabajoInfo, setTrabajoInfo] = useState<TrabajoLaboratorio | null>(null);

    const [formData, setFormData] = useState({
        fecha: getLocalDateString(),
        envio_retorno: 'Envio',
        observaciones: ''
    });

    const [editingId, setEditingId] = useState<number | null>(null);

    useEffect(() => {
        if (workId) {
            fetchData();
        }
    }, [workId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [historyRes, workRes] = await Promise.all([
                api.get<SeguimientoTrabajo[]>(`/seguimiento-trabajo?trabajoId=${workId}`),
                api.get<TrabajoLaboratorio>(`/trabajos-laboratorios/${workId}`)
            ]);
            setHistory(historyRes.data);
            setTrabajoInfo(workRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
            Swal.fire('Error', 'No se pudo cargar la información del seguimiento', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.patch(`/seguimiento-trabajo/${editingId}`, {
                    ...formData,
                    trabajoLaboratorioId: Number(workId)
                });
                await Swal.fire({
                    icon: 'success',
                    title: 'Actualizado',
                    text: 'Seguimiento actualizado exitosamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await api.post('/seguimiento-trabajo', {
                    ...formData,
                    trabajoLaboratorioId: Number(workId)
                });
                await Swal.fire({
                    icon: 'success',
                    title: 'Registrado',
                    text: 'Seguimiento registrado exitosamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            }

            setFormData({
                fecha: getLocalDateString(),
                envio_retorno: 'Envio',
                observaciones: ''
            });
            setEditingId(null);
            fetchData(); // Reload history
        } catch (error: any) {
            console.error('Error saving tracking:', error);
            const serverMessage = error.response?.data?.message || 'No se pudo guardar el seguimiento';
            Swal.fire('Error', serverMessage, 'error');
        }
    };

    const handleEdit = (item: SeguimientoTrabajo) => {
        setFormData({
            fecha: item.fecha,
            envio_retorno: item.envio_retorno,
            observaciones: item.observaciones
        });
        setEditingId(item.id);
    };

    const handleCancelEdit = () => {
        setFormData({
            fecha: getLocalDateString(),
            envio_retorno: 'Envio',
            observaciones: ''
        });
        setEditingId(null);
    };

    const handleDelete = async (id: number) => {
        if (await Swal.fire({
            title: '¿Eliminar registro?',
            text: "No podrás revertir esto",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then(result => result.isConfirmed)) {
            try {
                await api.delete(`/seguimiento-trabajo/${id}`);
                fetchData();
                Swal.fire('Eliminado', 'El registro ha sido eliminado.', 'success');
            } catch (error) {
                console.error('Error deleting:', error);
                Swal.fire('Error', 'No se pudo eliminar el registro', 'error');
            }
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando...</div>;

    return (
        <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                    <span className="p-2 bg-blue-100 dark:bg-blue-900 rounded-xl text-blue-600 dark:text-blue-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                    </span>
                    Seguimiento de Trabajo #{workId}
                </h2>
                <button
                    onClick={() => navigate('/trabajos-laboratorios')}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2 font-semibold"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Volver a la Lista
                </button>
            </div>

            {/* Info Card */}
            {trabajoInfo && (
                <div className="bg-blue-50 dark:bg-blue-900/30 p-5 rounded-xl border border-blue-100 dark:border-blue-800 flex flex-wrap gap-8 text-sm text-blue-900 dark:text-blue-100 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600 dark:text-blue-300">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        </div>
                        <div>
                            <span className="font-bold block text-[10px] uppercase tracking-wider text-blue-400 dark:text-blue-400 mb-0.5">Paciente</span>
                            <span className="font-bold text-base">{formatFullName(trabajoInfo.paciente)}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600 dark:text-blue-300">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 12h20"></path>
                                <path d="M12 2v20"></path>
                            </svg>
                        </div>
                        <div>
                            <span className="font-bold block text-[10px] uppercase tracking-wider text-blue-400 dark:text-blue-400 mb-0.5">Laboratorio</span>
                            <span className="font-bold text-base">{trabajoInfo.laboratorio?.laboratorio}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600 dark:text-blue-300">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                            </svg>
                        </div>
                        <div>
                            <span className="font-bold block text-[10px] uppercase tracking-wider text-blue-400 dark:text-blue-400 mb-0.5">Trabajo</span>
                            <span className="font-bold text-base">{trabajoInfo.precioLaboratorio?.detalle}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600 dark:text-blue-300">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="20" x2="18" y2="10"></line>
                                <line x1="12" y1="20" x2="12" y2="4"></line>
                                <line x1="6" y1="20" x2="6" y2="14"></line>
                            </svg>
                        </div>
                        <div>
                            <span className="font-bold block text-[10px] uppercase tracking-wider text-blue-400 dark:text-blue-400 mb-0.5">Estado</span>
                            <span className="font-bold text-base">{trabajoInfo.estado}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className="md:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 h-fit transition-all hover:shadow-xl">
                    <h3 className="text-lg font-bold mb-6 text-gray-800 dark:text-white border-b dark:border-gray-700 pb-3 flex items-center gap-2">
                        {editingId ? (
                            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                Editar Movimiento
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                Registrar Movimiento
                            </div>
                        )}
                    </h3>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <div className="relative">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Fecha</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                </div>
                                <input
                                    type="date"
                                    name="fecha"
                                    value={formData.fecha}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-gray-100 shadow-sm"
                                    required
                                />
                            </div>
                        </div>
                        <div className="relative">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Tipo de Movimiento</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                                </div>
                                <select
                                    name="envio_retorno"
                                    value={formData.envio_retorno}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-10 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all appearance-none text-gray-900 dark:text-gray-100 shadow-sm"
                                >
                                    <option value="" disabled>-- Seleccione --</option><option value="Envio">Envío (Al Laboratorio)</option>
                                    <option value="Retorno">Retorno (Del Laboratorio)</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="relative">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Observaciones</label>
                            <div className="relative">
                                <div className="absolute top-3 left-3 text-gray-400 dark:text-gray-500 pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                </div>
                                <textarea
                                    name="observaciones"
                                    value={formData.observaciones}
                                    onChange={handleChange}
                                    rows={4}
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all text-gray-900 dark:text-gray-100 shadow-sm"
                                    placeholder="Detalles adicionales..."
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button
                                type="submit"
                                className={`flex-1 font-bold py-2.5 rounded-xl transition-all shadow-md transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 ${editingId
                                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                    : 'bg-green-600 hover:bg-green-700 text-white'
                                    }`}
                            >
                                {editingId ? (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                        Actualizar
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                        Guardar
                                    </>
                                )}
                            </button>
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold py-2 px-4 rounded-xl transition-all shadow-sm border border-gray-200 dark:border-gray-600 transform hover:-translate-y-0.5 active:scale-95"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* History List Section */}
                <div className="md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 transition-all hover:shadow-xl">
                    <h3 className="text-lg font-bold mb-6 text-gray-800 dark:text-white border-b dark:border-gray-700 pb-3 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        Historial de Movimientos
                    </h3>

                    {history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 dark:bg-gray-900/20 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                            <div className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-sm mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-gray-600"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"></path></svg>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 font-semibold text-lg">No hay movimientos registrados.</p>
                            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Los registros de envío y retorno aparecerán aquí.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {history.map((item) => (
                                <div key={item.id} className="flex justify-between items-start p-5 rounded-2xl bg-white dark:bg-gray-700/40 border border-gray-100 dark:border-gray-600 shadow-sm hover:shadow-md transition-all group hover:border-blue-200 dark:hover:border-blue-800">
                                    <div className="flex gap-5 items-center">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner transition-transform group-hover:scale-105 ${item.envio_retorno === 'Envio'
                                            ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300'
                                            : 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-300'
                                            }`}>
                                            {item.envio_retorno === 'Envio' ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                                            )}
                                        </div>
                                        <div className="flex-grow">
                                            <div className="flex items-center gap-3 mb-1.5">
                                                <span className={`font-bold text-xl ${item.envio_retorno === 'Envio' ? 'text-orange-700 dark:text-orange-400' : 'text-green-700 dark:text-green-400'
                                                    }`}>
                                                    {item.envio_retorno === 'Envio' ? 'Envío' : 'Retorno'}
                                                </span>
                                                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-600 flex items-center gap-1.5 shadow-sm">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                                    {formatDate(item.fecha)}
                                                </span>
                                            </div>
                                            {item.observaciones ? (
                                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed max-w-lg font-medium">{item.observaciones}</p>
                                            ) : (
                                                <span className="text-sm text-gray-400 dark:text-gray-500 italic font-medium">Sin observaciones</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                        <button
                                            onClick={() => handleEdit(item)}
                                            className="bg-yellow-400 hover:bg-yellow-500 text-white p-2.5 rounded-xl transition-all shadow-md transform hover:-translate-y-0.5 active:scale-95"
                                            title="Editar registro"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-xl transition-all shadow-md transform hover:-translate-y-0.5 active:scale-95"
                                            title="Eliminar registro"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SeguimientoTrabajoComponent;
