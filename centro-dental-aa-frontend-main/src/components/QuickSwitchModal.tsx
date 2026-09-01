import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import { formatFullName, getImageUrl } from '../utils/formatters';
import type { User } from '../types';

interface QuickSwitchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSwitchComplete: () => void;
    currentUser: User | null;
}

const QuickSwitchModal: React.FC<QuickSwitchModalProps> = ({ isOpen, onClose, onSwitchComplete, currentUser }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [password, setPassword] = useState('');
    const [loggingIn, setLoggingIn] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
            setSelectedUser(null);
            setPassword('');
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectUser = (user: User) => {
        if (user.id === currentUser?.id) {
            onClose();
            return;
        }
        setSelectedUser(user);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser || !password) return;

        setLoggingIn(true);
        try {
            const response = await api.post('/auth/login', {
                email: selectedUser.email,
                password: password
            });

            const { access_token, user } = response.data;
            
            localStorage.setItem('token', access_token);
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('user_last_fetch', Date.now().toString());

            window.dispatchEvent(new Event('user-updated'));

            onSwitchComplete();
        } catch (error: any) {
            console.error('Login failed:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error de Autenticación',
                text: error.response?.data?.message || 'Contraseña incorrecta'
            });
        } finally {
            setLoggingIn(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {selectedUser ? 'Ingresa Contraseña' : 'Cambiar de Cuenta'}
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {!selectedUser ? (
                        loading ? (
                            <div className="text-center py-4 dark:text-gray-300">Cargando usuarios...</div>
                        ) : (
                            <div className="space-y-2">
                                {users.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleSelectUser(user)}
                                        className={`w-full flex items-center p-3 rounded-lg border transition-colors ${
                                            user.id === currentUser?.id 
                                                ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800' 
                                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        {user.foto ? (
                                            <img src={getImageUrl(user.foto)} alt={user.name} className="w-10 h-10 rounded-full object-cover mr-3" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold mr-3">
                                                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                            </div>
                                        )}
                                        <div className="text-left flex-1">
                                            <div className="font-semibold text-gray-900 dark:text-white">{formatFullName(user)}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{(user as any).rol || 'Usuario'}</div>
                                        </div>
                                        {user.id === currentUser?.id && (
                                            <span className="text-xs font-bold text-blue-500 dark:text-blue-400">Actual</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )
                    ) : (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4">
                                {selectedUser.foto ? (
                                    <img src={getImageUrl(selectedUser.foto)} alt={selectedUser.name} className="w-12 h-12 rounded-full object-cover mr-4" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-lg mr-4">
                                        {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                )}
                                <div>
                                    <div className="font-bold text-gray-900 dark:text-white">{formatFullName(selectedUser)}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{selectedUser.email}</div>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Contraseña
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Ingresa la contraseña..."
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedUser(null)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    Atrás
                                </button>
                                <button
                                    type="submit"
                                    disabled={loggingIn || !password}
                                    className="flex-1 flex items-center justify-center gap-2 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 font-medium"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                    </svg>
                                    {loggingIn ? 'Ingresando...' : 'Entrar'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuickSwitchModal;