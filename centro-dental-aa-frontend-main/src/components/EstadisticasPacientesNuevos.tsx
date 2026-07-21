import React, { useState, useEffect } from 'react';
import ManualModal, { type ManualSection } from './ManualModal';
import api from '../services/api';
import { Users } from 'lucide-react';


interface MonthlyStat {
    month: number;
    count: number;
    countParticular: number;
    countSeguro: number;
}

const EstadisticasPacientesNuevos: React.FC = () => {
    const currentYear = new Date().getFullYear();

    const [year, setYear] = useState<number>(currentYear);
    const [loading, setLoading] = useState<boolean>(false);
    const [stats, setStats] = useState<MonthlyStat[]>([]);
    const [showManual, setShowManual] = useState(false);

    const manualSections: ManualSection[] = [
        {
            title: 'Pacientes Nuevos',
            content: 'Evolución mensual de la captación de nuevos pacientes en el año seleccionado.'
        },
        {
            title: 'Tipos de Pacientes',
            content: 'Se muestran por separado los pacientes Particulares (Azul) y de Seguro (Naranja) para analizar el origen del crecimiento.'
        },
        {
            title: 'Tendencias',
            content: 'El gráfico de barras vertical permite visualizar rápidamente los picos de crecimiento o baja captación durante el año.'
        }];

    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await api.get('/pacientes/statistics', {
                params: { year }
            });
            setStats(response.data);
        } catch (error) {
            console.error("Error fetching statistics:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const totalPacientes = stats.reduce((acc, curr) => acc + curr.count, 0);
    const totalParticular = stats.reduce((acc, curr) => acc + (curr.countParticular || 0), 0);
    const totalSeguro = stats.reduce((acc, curr) => acc + (curr.countSeguro || 0), 0);
    
    const maxCount = Math.max(...stats.flatMap(s => [s.countParticular, s.countSeguro]), 0);

    return (
        <div className="p-6">

            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <Users className="text-blue-600" size={32} />
                        Estadísticas de Pacientes Nuevos
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Crecimiento mensual de la base de pacientes</p>
                </div>
                <button
                    onClick={() => setShowManual(true)}
                    className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm no-print"
                    title="Ayuda / Manual"
                >
                    ?
                </button>
            </div>

            {/* Filters and Summary */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
                <div className="flex flex-wrap gap-4 items-end mb-4 border-b border-gray-100 dark:border-gray-700 pb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Año</label>
                        <div className="relative">
                            <select
                                value={year}
                                onChange={(e) => setYear(Number(e.target.value))}
                                className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 pl-10 min-w-[100px] w-full appearance-none bg-white dark:bg-gray-700 text-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="" disabled>-- Seleccione --</option>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                        </div>
                    </div>

                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none h-[42px] flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Generando...
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                Generar Estadística
                            </>
                        )}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                        <span className="text-sm text-blue-600 dark:text-blue-400 font-bold block mb-1">PARTICULARES</span>
                        <span className="text-2xl font-black text-blue-800 dark:text-blue-200">{totalParticular}</span>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-100 dark:border-orange-800">
                        <span className="text-sm text-orange-600 dark:text-orange-400 font-bold block mb-1">SEGUROS</span>
                        <span className="text-2xl font-black text-orange-800 dark:text-orange-200">{totalSeguro}</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-bold block mb-1">TOTAL GENERAL</span>
                        <span className="text-2xl font-black text-gray-800 dark:text-white">{totalPacientes}</span>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-6 mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Particulares</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-500 rounded"></div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Seguros</span>
                </div>
            </div>

            {/* Chart Area - Vertical Bar Chart */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow h-[500px] flex items-end justify-between gap-1 md:gap-4">
                {stats.length === 0 ? (
                    <div className="w-full text-center text-gray-500 dark:text-gray-400 py-10 self-center">No hay datos para los filtros seleccionados.</div>
                ) : (
                    months.map((monthName, index) => {
                        const stat = stats.find(s => s.month === index + 1) || { countParticular: 0, countSeguro: 0, count: 0 };
                        
                        const hParticular = maxCount > 0 ? (stat.countParticular / maxCount) * 100 : 0;
                        const hSeguro = maxCount > 0 ? (stat.countSeguro / maxCount) * 100 : 0;

                        return (
                            <div key={index} className="flex-1 flex flex-col items-center group h-full justify-end">
                                <div className="flex items-end gap-[2px] w-full h-full justify-center">
                                    {/* Particular Bar */}
                                    <div className="flex flex-col items-center flex-1 max-w-[30px] h-full justify-end group/bar">
                                        <div className="mb-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {stat.countParticular}
                                        </div>
                                        <div
                                            className="w-full bg-blue-500 rounded-t-sm transition-all duration-500 relative hover:bg-blue-600 shadow-sm"
                                            style={{ height: `${Math.max(hParticular, 1)}%` }}
                                            title={`Particular: ${stat.countParticular}`}
                                        >
                                            {hParticular > 15 && (
                                                <div className="absolute top-1 w-full text-center text-white text-[10px] font-bold rotate-[-90deg]">
                                                    {stat.countParticular}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Seguro Bar */}
                                    <div className="flex flex-col items-center flex-1 max-w-[30px] h-full justify-end group/bar">
                                        <div className="mb-1 text-[10px] font-bold text-orange-600 dark:text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {stat.countSeguro}
                                        </div>
                                        <div
                                            className="w-full bg-orange-500 rounded-t-sm transition-all duration-500 relative hover:bg-orange-600 shadow-sm"
                                            style={{ height: `${Math.max(hSeguro, 1)}%` }}
                                            title={`Seguro: ${stat.countSeguro}`}
                                        >
                                            {hSeguro > 15 && (
                                                <div className="absolute top-1 w-full text-center text-white text-[10px] font-bold rotate-[-90deg]">
                                                    {stat.countSeguro}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-2 text-[10px] md:text-xs text-gray-600 dark:text-gray-400 font-bold uppercase">
                                    {monthName.substring(0, 3)}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>


            {/* Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Pacientes Nuevos"
                sections={manualSections}
            />
        </div >
    );
};

export default EstadisticasPacientesNuevos;
