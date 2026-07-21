export const getFigureForConditionCode = (code: number): { type: string, color: string } | null => {
    switch (code) {
        case 10: return { type: 'tachar_ausente', color: '#3b82f6' }; // Azul
        case 11: return { type: 'tachar_extraccion', color: '#ef4444' }; // Rojo
        case 12: return { type: 'circulo_corona', color: '#3b82f6' };
        case 13: return { type: 'circulo_corona', color: '#ef4444' };
        case 18: return { type: 'fractura', color: '#ef4444' };
        case 20: return { type: 'puente', color: '#3b82f6' };
        case 21: return { type: 'puente', color: '#ef4444' };
        case 22: return { type: 'ortodoncia', color: '#8b5cf6' }; // Púrpura
        // We will add new codes for Implante, Perno, etc.
        case 30: return { type: 'implante', color: '#3b82f6' };
        case 31: return { type: 'perno', color: '#3b82f6' };
        case 32: return { type: 'endodoncia', color: '#3b82f6' };
        case 33: return { type: 'corona_provisoria', color: '#3b82f6' };
        case 34: return { type: 'protesis_removible', color: '#3b82f6' };
        default: return null;
    }
};

export const getColorForSurfaceCode = (code: number): string => {
    switch (code) {
        case 1: return '#ef4444'; // Caries
        case 14: return '#3b82f6'; // Obturación B
        case 15: return '#ef4444'; // Obturación M
        case 16: return '#3b82f6'; // Sellante B
        case 17: return '#ef4444'; // Sellante M
        case 23: return '#3b82f6'; // LCNC B
        case 24: return '#ef4444'; // LCNC M
        case 40: return '#3b82f6'; // Restauración (Nueva)
        default: return 'transparent';
    }
};
