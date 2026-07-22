import api from './api';
import type { RecetaPredisenada } from '../types';

const STORAGE_KEY = 'centro_dental_recetas_predisenadas_v1';

const DEFAULT_TEMPLATES: RecetaPredisenada[] = [
    {
        id: 1,
        nombre: 'Tratamiento Post-Extracción Dental',
        especialidadId: 1,
        diagnostico: 'Extracción dental simple / quirúrgica',
        indicaciones: 'Mantener la gasa presionada por 45 minutos. No escupir ni usar sorbetes. Aplicar hielo local por 15 min.',
        estado: 'activo',
        detalles: [
            {
                medicamento: 'Amoxicilina 500mg',
                cantidad: '1 caja (21 tabletas)',
                indicacion: 'Tomar 1 tableta cada 8 horas por 7 días.'
            },
            {
                medicamento: 'Ibuprofeno 600mg',
                cantidad: '1 caja (10 tabletas)',
                indicacion: 'Tomar 1 tableta cada 8 horas en caso de dolor o inflamación.'
            },
            {
                medicamento: 'Paracetamol 500mg',
                cantidad: '1 caja (10 tabletas)',
                indicacion: 'Tomar 1 tableta cada 8 horas como refuerzo analgésico si hay dolor persistente.'
            }
        ]
    },
    {
        id: 2,
        nombre: 'Infección Aguda / Endodoncia',
        especialidadId: 2,
        diagnostico: 'Pulpitis irreversible / Absceso periapical',
        indicaciones: 'Completar el ciclo de antibióticos sin suspender. Evitar masticar alimentos duros por el lado afectado.',
        estado: 'activo',
        detalles: [
            {
                medicamento: 'Amoxicilina + Ácido Clavulánico 875/125mg',
                cantidad: '1 caja (14 tabletas)',
                indicacion: 'Tomar 1 tableta cada 12 horas por 7 días con los alimentos.'
            },
            {
                medicamento: 'Ketorolaco 10mg',
                cantidad: '1 caja (10 tabletas)',
                indicacion: 'Tomar 1 tableta sublingual cada 8 horas por máximo 5 días.'
            }
        ]
    },
    {
        id: 3,
        nombre: 'Profilaxis Antibiótica Pre-Procedimiento',
        especialidadId: 1,
        diagnostico: 'Prevención de endocarditis infecciosa / Paciente de alto riesgo',
        indicaciones: 'Tomar la dosis única 1 hora antes de la cita odontológica.',
        estado: 'activo',
        detalles: [
            {
                medicamento: 'Amoxicilina 500mg',
                cantidad: '4 cápsulas',
                indicacion: 'Tomar 2g (4 cápsulas de 500mg) en dosis única 1 hora antes del tratamiento.'
            }
        ]
    }
];

const getLocalTemplates = (): RecetaPredisenada[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TEMPLATES));
            return DEFAULT_TEMPLATES;
        }
        return JSON.parse(stored);
    } catch {
        return DEFAULT_TEMPLATES;
    }
};

const saveLocalTemplates = (templates: RecetaPredisenada[]) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch (e) {
        console.error('Error saving local predesigned recipes:', e);
    }
};

export const recetasPredisenadasService = {
    async getAll(params?: { search?: string; especialidadId?: number; estado?: string }): Promise<RecetaPredisenada[]> {
        try {
            const queryParams = new URLSearchParams();
            if (params?.search) queryParams.append('search', params.search);
            if (params?.especialidadId) queryParams.append('especialidadId', params.especialidadId.toString());
            if (params?.estado) queryParams.append('estado', params.estado);

            const res = await api.get(`/recetas-predisenadas?${queryParams.toString()}`);
            if (res.data && Array.isArray(res.data.data)) {
                return res.data.data;
            }
            if (res.data && Array.isArray(res.data)) {
                return res.data;
            }
        } catch {
            // Fallback to localStorage if API is not yet endpoint-enabled
        }

        let list = getLocalTemplates();
        if (params?.especialidadId) {
            list = list.filter(t => t.especialidadId === Number(params.especialidadId));
        }
        if (params?.estado) {
            list = list.filter(t => t.estado === params.estado);
        }
        if (params?.search) {
            const searchLower = params.search.toLowerCase();
            list = list.filter(t => 
                t.nombre.toLowerCase().includes(searchLower) ||
                (t.diagnostico && t.diagnostico.toLowerCase().includes(searchLower))
            );
        }
        return list;
    },

    async getById(id: number): Promise<RecetaPredisenada | null> {
        try {
            const res = await api.get(`/recetas-predisenadas/${id}`);
            if (res.data) return res.data;
        } catch {
            // Fallback
        }
        const list = getLocalTemplates();
        return list.find(t => t.id === id) || null;
    },

    async create(data: Partial<RecetaPredisenada>): Promise<RecetaPredisenada> {
        try {
            const res = await api.post('/recetas-predisenadas', data);
            if (res.data) {
                return res.data;
            }
        } catch {
            // Fallback
        }

        const list = getLocalTemplates();
        const newId = list.length > 0 ? Math.max(...list.map(t => t.id)) + 1 : 1;
        const newTemplate: RecetaPredisenada = {
            id: newId,
            nombre: data.nombre || 'Nueva Receta Pre-Diseñada',
            especialidadId: data.especialidadId || 1,
            diagnostico: data.diagnostico || '',
            indicaciones: data.indicaciones || '',
            estado: data.estado || 'activo',
            detalles: data.detalles || [],
            createdAt: new Date().toISOString()
        };
        const updated = [newTemplate, ...list];
        saveLocalTemplates(updated);
        return newTemplate;
    },

    async update(id: number, data: Partial<RecetaPredisenada>): Promise<RecetaPredisenada> {
        try {
            const res = await api.patch(`/recetas-predisenadas/${id}`, data);
            if (res.data) return res.data;
        } catch {
            // Fallback
        }

        const list = getLocalTemplates();
        const updated = list.map(t => {
            if (t.id === id) {
                return { ...t, ...data, updatedAt: new Date().toISOString() };
            }
            return t;
        });
        saveLocalTemplates(updated);
        return updated.find(t => t.id === id)!;
    },

    async delete(id: number): Promise<void> {
        try {
            await api.delete(`/recetas-predisenadas/${id}`);
            return;
        } catch {
            // Fallback
        }

        const list = getLocalTemplates();
        const filtered = list.filter(t => t.id !== id);
        saveLocalTemplates(filtered);
    }
};
