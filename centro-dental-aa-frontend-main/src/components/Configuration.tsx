import React from 'react';
import { Settings } from 'lucide-react';

const Configuration: React.FC = () => {
    const hasAccess = (moduleId: string) => {
        const userStr = localStorage.getItem('user');
        if (!userStr) return false;
        try {
            const user = JSON.parse(userStr);
            const permisos = user.permisos || [];
            return !permisos.includes(moduleId);
        } catch {
            return false;
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 transition-colors duration-300">
            {/* Standardized Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 no-print">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl">
                        <Settings className="text-blue-600 dark:text-blue-400" size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
                            Configuración del Sistema
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Ajustes generales, parámetros administrativos y catálogos
                        </p>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 1. Área del Personal */}
                {hasAccess('config-area-personal') && (
                    <div
                        onClick={() => window.location.href = '/personal-tipo'}
                        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-orange-500"
                    >
                        <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-orange-600 dark:text-orange-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.282-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.282.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Área del Personal</h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">Configurar los tipos y áreas de personal de la clínica</p>
                    </div>
                )}

                {/* 2. Backup de BD */}
                {hasAccess('config-backup') && (
                    <div
                        onClick={() => window.location.href = '/backup'}
                        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-blue-500"
                    >
                        <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Backup de BD</h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">Crear, restaurar y gestionar copias de seguridad de la base de datos</p>
                    </div>
                )}

                {/* 3. Cambiar Contraseña */}
                {hasAccess('cambiar-password') && (
                <div
                    onClick={() => window.location.href = '/cambiar-password'}
                    className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-yellow-500"
                >
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600 dark:text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Cambiar Contraseña</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Actualizar la contraseña de seguridad de su cuenta</p>
                </div>
                )}

                {/* 4. Casos Clínicos */}
                {hasAccess('config-casos-clinicos') && (
                <div
                    onClick={() => window.location.href = '/casos-clinicos'}
                    className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-indigo-500"
                >
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600 dark:text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Casos Clínicos</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Gestionar biblioteca de casos clínicos con imágenes y videos demostrativos para pacientes</p>
                </div>
                )}

                {/* 5. Chatbot */}
                {hasAccess('config-chatbot') && (
                <div
                    onClick={() => window.location.href = '/configuration/chatbot'}
                    className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-green-500"
                >
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Chatbot</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Configurar el chatbot de WhatsApp y sus respuestas automáticas</p>
                </div>
                )}

                {/* 6. Comisión Tarjeta */}
                {hasAccess('config-comision') && (
                <div
                    onClick={() => window.location.href = '/comision-tarjeta'}
                    className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-red-500"
                >
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600 dark:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Comisión Tarjeta</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Gestionar las comisiones bancarias por pagos con tarjeta</p>
                </div>
                )}

                {/* 7. Consentimientos Informados */}
                {hasAccess('config-consentimientos') && (
                <div
                    onClick={() => window.location.href = '/consentimientos-plantillas'}
                    className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-purple-500"
                >
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600 dark:text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Consentimientos Informados</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Gestionar plantillas para los consentimientos de los pacientes</p>
                </div>
                )}

                {/* 8. Datos Centro Dental */}
                {hasAccess('config-datos-centro') && (
                <div
                    onClick={() => window.location.href = '/datos-centro'}
                    className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-blue-500"
                >
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Datos Centro Dental</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Configuración general de la clínica y ubicación</p>
                </div>
                )}

                {/* 9. Especialidades */}
                {hasAccess('config-especialidad') && (
                <div
                    onClick={() => window.location.href = '/especialidad'}
                    className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-teal-500"
                >
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-teal-100 dark:bg-teal-900 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-teal-600 dark:text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Especialidades</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Administrar las especialidades clínicas disponibles</p>
                </div>
                )}

                {/* 10. Formas de Pago */}
                {hasAccess('config-forma-pago') && (
                <div
                    onClick={() => window.location.href = '/forma-pago'}
                    className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-cyan-500"
                >
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-cyan-100 dark:bg-cyan-900 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-cyan-600 dark:text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Formas de Pago</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Configurar los métodos de pago aceptados en la clínica</p>
                </div>
                )}

                {/* 11. Grupos Inventario */}
                {hasAccess('config-grupos') && (
                <div
                    onClick={() => window.location.href = '/grupo-inventario'}
                    className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-pink-500"
                >
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-pink-100 dark:bg-pink-900 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-pink-600 dark:text-pink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Grupos Inventario</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Asignar categorías y grupos a los productos del inventario</p>
                </div>
                )}

                {/* 12. Recetas Pre-Diseñadas */}
                {hasAccess('config-recetas-predisenadas') && (
                <div
                    onClick={() => window.location.href = '/recetas-predisenadas'}
                    className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-teal-500"
                >
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-teal-100 dark:bg-teal-900 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-teal-600 dark:text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Recetas Pre-Diseñadas</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Configurar plantillas de recetas médicas pre-diseñadas por especialidad</p>
                </div>
                )}

                {/* 13. Seguros */}
                {hasAccess('config-seguros') && (
                <div
                    onClick={() => window.location.href = '/seguro'}
                    className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-emerald-500"
                >
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-600 dark:text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-7.618 3.04C4.407 7.535 4.63 9.607 5.148 11.41c.831 2.89 2.378 5.343 4.417 7.29a12.03 12.03 0 004.87 2.3 12.03 12.03 0 004.87-2.3c2.039-1.947 3.586-4.4 4.417-7.29.518-1.803.741-3.875.73-5.426z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Seguros</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Administrar tipos de seguros y convenios (Colores distintivos)</p>
                </div>
                )}

                {/* 14. Usuarios */}
                {hasAccess('usuarios') && (
                <div
                    onClick={() => window.location.href = '/users'}
                    className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-purple-500"
                >
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600 dark:text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Usuarios</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Gestionar usuarios del sistema y sus permisos</p>
                </div>
                )}
            </div>
        </div>
    );
};

export default Configuration;
