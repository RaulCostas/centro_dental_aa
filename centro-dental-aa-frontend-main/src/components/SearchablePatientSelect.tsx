import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { formatFullName } from '../utils/formatters';
import type { Paciente } from '../types';

interface SearchablePatientSelectProps {
    onSelect: (type: 'particular' | 'seguro' | null, id: number) => void;
    selectedId?: number;
    selectedType?: 'particular' | 'seguro' | null;
    required?: boolean;
    placeholder?: string;
    className?: string;
    allowType?: 'particular' | 'seguro' | 'both';
}

const SearchablePatientSelect: React.FC<SearchablePatientSelectProps> = ({
    onSelect,
    selectedId,
    selectedType,
    required = false,
    placeholder = "-- Seleccione Paciente --",
    className = "",
    allowType = 'both'
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<{ type: 'particular' | 'seguro', data: any }[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedLabel, setSelectedLabel] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Initial label set if selectedId/Type provided
    useEffect(() => {
        if (selectedId && selectedType) {
            fetchInitialLabel(selectedType, selectedId);
        } else {
            setSelectedLabel('');
            setSearchTerm('');
        }
    }, [selectedId, selectedType]);

    const fetchInitialLabel = async (type: string, id: number) => {
        try {
            const endpoint = `/pacientes/${id}`;
            const response = await api.get(endpoint);
            const p = response.data;
            const label = formatFullName(p);
            setSelectedLabel(label);
        } catch (error) {
            console.error('Error fetching initial patient label:', error);
        }
    };

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Debounced search
    useEffect(() => {
        if (searchTerm.trim().length < 2) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const response = await api.get(`/pacientes?search=${searchTerm}&limit=10`);
                const particular = (response.data.data || []).map((p: any) => ({ type: 'particular' as const, data: p }));
                setResults(particular);
            } catch (error) {
                console.error('Error searching patients:', error);
            } finally {
                setLoading(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleSelect = (type: 'particular' | 'seguro', patient: any) => {
        const label = formatFullName(patient);
        setSelectedLabel(label);
        onSelect(type, patient.id);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <div className="relative">
                <input
                    type="text"
                    value={isOpen ? searchTerm : selectedLabel}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={() => {
                        setIsOpen(true);
                        setSearchTerm('');
                    }}
                    placeholder={selectedLabel || placeholder}
                    required={required && !selectedId}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </div>
                {!!selectedId && !isOpen && (
                    <button 
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(null, 0);
                            setSelectedLabel('');
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 bg-transparent hover:bg-transparent border-none p-0 min-h-0 min-w-0 shadow-none focus:outline-none focus:ring-0"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                )}
            </div>

            {isOpen && (
                <div className="absolute z-[1001] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                    {loading && <div className="p-3 text-sm text-gray-500 text-center">Buscando...</div>}
                    {!loading && searchTerm.length >= 2 && results.length === 0 && (
                        <div className="p-3 text-sm text-gray-500 text-center">No se encontraron pacientes</div>
                    )}
                    {!loading && searchTerm.length < 2 && !selectedId && (
                        <div className="p-3 text-sm text-gray-500 text-center">Escriba al menos 2 letras...</div>
                    )}
                    
                    {results.map((res, index) => (
                        <div
                            key={`${res.type}-${res.data.id}-${index}`}
                            onClick={() => handleSelect(res.type, res.data)}
                            className="p-3 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b border-gray-50 dark:border-gray-700 last:border-0"
                        >
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-sm text-gray-800 dark:text-gray-200">
                                    {formatFullName(res.data)}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                                    res.type === 'particular' 
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' 
                                        : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                }`}>
                                    {res.type === 'particular' ? 'PARTICULAR' : res.data.seguro?.nombre || 'SEGURO'}
                                </span>
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                CI: {res.data.ci || 'N/A'} {res.data.telefono_celular ? `| Cel: ${res.data.telefono_celular}` : ''}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SearchablePatientSelect;
