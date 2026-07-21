import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import api from '../services/api';
import type { Paciente, Pago, Proforma, Agenda } from '../types';
import { formatFullName } from '../utils/formatters';
import {
    User, Calendar, FileText, CreditCard, Image as ImageIcon, ClipboardList,
    ArrowLeft, Edit, Activity, Heart, CheckCircle, Shield
} from 'lucide-react';

// --- Tab definition -----------------------------------------------------------
// --- Tab definition -----------------------------------------------------------
interface TabDef {
    id: string;
    label: string;
    icon: React.ReactNode;
    path: string; 
}

const TABS_PARTICULAR: TabDef[] = [
    { id: 'ficha',       label: 'Ficha Médica',         icon: <Heart size={15} />,           path: 'ficha' },
    { id: 'citas',       label: 'Citas',                icon: <Calendar size={15} />,       path: 'citas' },
    { id: 'planes',      label: 'Planes de Tratamiento',icon: <CreditCard size={15} />,      path: 'presupuestos' },
    { id: 'seguimiento', label: 'Seguimiento Clínico',  icon: <Activity size={15} />,        path: 'historia-clinica' },
    { id: 'pagos',       label: 'Pagos',                icon: <FileText size={15} />,        path: 'pagos' },
    { id: 'imagenes',    label: 'Imágenes',             icon: <ImageIcon size={15} />,       path: 'imagenes' },
    { id: 'recetario',   label: 'Recetario',            icon: <FileText size={15} />,        path: 'recetario' },
    { id: 'propuestas',  label: 'Propuestas',           icon: <ClipboardList size={15} />,   path: 'propuestas' },
    { id: 'consentimientos', label: 'Consentimientos',  icon: <FileText size={15} />,        path: 'consentimientos' },
    { id: 'informes',    label: 'Informes Odontológicos',     icon: <FileText size={15} />,        path: 'informes' },
    { id: 'estudios',    label: 'Estudios Comp.',       icon: <FileText size={15} />,        path: 'estudios' },
];

// --- Helpers ------------------------------------------------------------------
const calcEdad = (fecha?: string): string => {
    if (!fecha) return '—';
    const hoy = new Date();
    const nac = new Date(fecha);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return `${edad} años`;
};

const formatCelular = (celular: string | undefined) => {
    if (!celular) return '---';
    const countryCodes = ['+591', '+54', '+55', '+56', '+51', '+595', '+598', '+57', '+52', '+34', '+1'];
    const code = countryCodes.find(c => celular && celular.startsWith(c));
    if (code) {
        const number = celular.substring(code.length);
        return `(${code}) ${number}`;
    }
    // If no country code, assume +591
    if (celular.length === 8 && !celular.startsWith('+')) {
        return `(+591) ${celular}`;
    }
    return celular;
};

// --- Main Layout Component ----------------------------------------------------
const PacientePerfil: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const [paciente, setPaciente] = useState<Paciente | null>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ citas: 0, planes: 0, pagos: 0, totalPagado: 0 });

    // --- Filter Tabs based on permissions -----------------------------------------
    const [allowedTabs, setAllowedTabs] = useState<TabDef[]>(TABS_PARTICULAR);

    useEffect(() => {
        const userString = localStorage.getItem('user');
        if (userString) {
            try {
                const user = JSON.parse(userString);
                // CENTRO DENTAL A&A uses 'permisos' as restricted modules
                const restricted = Array.isArray(user.permisos) ? user.permisos : [];
                
                const tabToModuleMap: Record<string, string> = {
                    'ficha': 'pacientes',
                    'odontograma': 'pacientes',
                    'citas': 'agenda',
                    'planes': 'presupuestos',
                    'seguimiento': 'pacientes',
                    'pagos': 'pagos',
                    'imagenes': 'pacientes',
                    'recetario': 'recetario',
                    'propuestas': 'presupuestos',
                    'consentimientos': 'pacientes',
                    'informes': 'pacientes',
                    'estudios': 'pacientes'
                };

                setAllowedTabs(TABS_PARTICULAR.filter(tab => !restricted.includes(tabToModuleMap[tab.id])));
            } catch (e) {
                console.error("Error parsing user for tabs permissions", e);
            }
        }
    }, []);

    // Determine active tab from current URL path
    const activeTab = allowedTabs.find(t =>
        location.pathname.endsWith(`/${t.path}`) || 
        location.pathname.includes(`/${t.path}/`) ||
        (location.pathname.includes('/historia-clinica') && t.id === 'seguimiento')
    ) ?? null;

    useEffect(() => {
        if (!id) return;
        const load = async () => {
            setLoading(true);
            try {
                const baseUrl = '/pacientes';
                const agendaUrl = `/agenda?pacienteId=${id}`;
                const pagosUrl = `/pagos/paciente/${id}`;
                const proformasUrl = `/proformas/paciente/${id}`;

                const [pacRes, agendaRes, pagosRes, proformasRes] = await Promise.allSettled([
                    api.get(`${baseUrl}/${id}`),
                    api.get(`${agendaUrl}&limit=1000`),
                    api.get(pagosUrl),
                    api.get(proformasUrl),
                ]);

                if (pacRes.status === 'fulfilled') setPaciente(pacRes.value.data);
                
                const citasData = agendaRes.status === 'fulfilled' ? agendaRes.value.data : null;
                const citasCount = Array.isArray(citasData) ? citasData.length : (citasData?.data?.length || 0);
                
                const pagosData = pagosRes.status === 'fulfilled' ? pagosRes.value.data : [];
                const pagosArray = Array.isArray(pagosData) ? pagosData : [];
                
                const proformasData = proformasRes.status === 'fulfilled' ? proformasRes.value.data : [];
                const proformasCount = Array.isArray(proformasData) ? proformasData.length : 0;

                setStats({
                    citas: citasCount,
                    planes: proformasCount,
                    pagos: pagosArray.length,
                    totalPagado: pagosArray.reduce((s: number, p: Pago) => s + Number(p.monto), 0),
                });
            } catch (error) {
                console.error("Error loading patient profile stats:", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    // If we're exactly at the root profile path, redirect to ficha tab
    useEffect(() => {
        if (!loading && id) {
            const rootPath = `/pacientes/${id}`;
            const isRootProfile = location.pathname === rootPath || location.pathname === `${rootPath}/`;
            if (isRootProfile) {
                navigate(`${rootPath}/ficha`, { replace: true });
            }
        }
    }, [loading, id, location.pathname, navigate]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                    <p className="text-gray-500 dark:text-gray-400">Cargando perfil...</p>
                </div>
            </div>
        );
    }

    if (!paciente) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4">
                    <p className="text-lg text-gray-500 dark:text-gray-400">Paciente no encontrado</p>
                    <button onClick={() => navigate('/pacientes')}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg">
                        Volver a Pacientes
                    </button>
                </div>
            </div>
        );
    }

    const nombreCompleto = formatFullName(paciente);
    const basePath = `/pacientes/${id}`;

    return (
        <div className="flex flex-col min-h-full">

            {/* ── Navigation bar ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-4 px-1">
                <button
                    onClick={() => navigate('/pacientes')}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2 text-sm"
                >
                    <ArrowLeft size={16} /> Volver a Pacientes
                </button>
                <button
                    onClick={() => navigate(`/pacientes/edit/${id}`)}
                    className="bg-amber-400 hover:bg-amber-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2 text-sm"
                >
                    <Edit size={16} /> Editar Paciente
                </button>
            </div>

            {/* ── Patient Header ──────────────────────────────────────────────── */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-5 mb-4 text-white shadow-lg">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner flex-shrink-0">
                            <User size={28} className="text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-xl font-black tracking-tight leading-tight uppercase">{nombreCompleto}</h1>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-blue-100 text-xs">
                                {paciente.fecha_nacimiento && <span>🎂 {calcEdad(paciente.fecha_nacimiento)}</span>}
                                
                                <>
                                    {(paciente as Paciente).telefono_celular && <span>📱 {formatCelular((paciente as Paciente).telefono_celular)}</span>}
                                    {paciente.email && <span>✉️ {paciente.email}</span>}
                                </>

                                <span className={`px-2 py-0.5 rounded-full font-bold ${
                                    paciente.estado === 'activo' ? 'bg-emerald-500/30' : 'bg-red-500/30'
                                }`}>
                                    {paciente.estado === 'activo' ? '● Activo' : '● Inactivo'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="md:ml-auto md:self-start">
                        <span className="bg-white/20 px-3 py-1.5 rounded-lg text-lg font-bold border border-white/30 shadow-sm whitespace-nowrap">
                            {paciente.paterno?.charAt(0).toUpperCase() || ''}-{paciente.id}
                        </span>
                    </div>
                </div>

                {/* Quick stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 pt-4 border-t border-white/20">
                    {[
                        { label: 'Citas', value: stats.citas, Icon: Calendar },
                        { label: 'Planes', value: stats.planes, Icon: CreditCard },
                        { label: 'Pagos', value: stats.pagos, Icon: FileText },
                        { label: 'Total Pagado', value: `Bs. ${stats.totalPagado.toFixed(0)}`, Icon: CheckCircle },
                    ].map(({ label, value, Icon }) => (
                        <div key={label} className="bg-white/10 rounded-xl p-2 text-center hover:bg-white/20 transition-colors">
                            <Icon size={14} className="mx-auto mb-0.5 text-blue-200" />
                            <div className="text-base font-black leading-tight">{value}</div>
                            <div className="text-[9px] text-blue-200 uppercase tracking-wider">{label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Tab Bar ─────────────────────────────────────────────────────── */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600 mb-4 overflow-x-auto no-scrollbar">
                {allowedTabs.map(tab => {
                    const isActive = activeTab?.id === tab.id;
                    return (
                        <Link
                            key={tab.id}
                            to={`${basePath}/${tab.path}`}
                            className={`flex-shrink-0 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${
                                isActive
                                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-gray-200 dark:ring-gray-600'
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </Link>
                    );
                })}
            </div>

            {/* ── Tab Content (Outlet renders the matched child route) ──────── */}
            <div className="flex-1">
                <Outlet />
            </div>
        </div>
    );
};

export default PacientePerfil;
