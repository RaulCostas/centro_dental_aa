/**
 * Odontogram Merger Utility
 * Combines the baseline Initial Odontogram (`tipo: 'inicial'`) with all completed
 * clinical history treatments (`estadoTratamiento === 'terminado'`) for a patient.
 * 
 * Attaches origin tags ('inicial' vs 'seguimiento') and originLabels to clearly
 * distinguish initial baseline diagnoses from completed follow-up treatments.
 * 
 * Enforces Rule: Initial baseline figures ALWAYS render first (at the top / index 0),
 * followed by completed follow-up treatment figures below.
 */

export const mergeOdontogramaWithTratamientos = (
    inicialMapa: Record<string, any> = {},
    historiaList: any[] = [],
    arancelesList: any[] = []
): Record<string, any> => {
    // Deep clone initial mapa_dientes baseline
    const merged: Record<string, any> = JSON.parse(JSON.stringify(inicialMapa || {}));

    // Tag initial figures with origin: 'inicial'
    Object.keys(merged).forEach(toothKey => {
        const tooth = merged[toothKey];
        if (tooth && Array.isArray(tooth.activeFigures)) {
            tooth.activeFigures = tooth.activeFigures.map((f: any) => ({
                ...f,
                origin: f.origin || 'inicial',
                originLabel: f.originLabel || 'Diagnóstico Inicial'
            }));
        }
    });

    if (Array.isArray(historiaList) && historiaList.length > 0) {
        historiaList.forEach(item => {
            // Only merge treatments with estadoTratamiento = 'terminado'
            const estado = String(item.estadoTratamiento || '').toLowerCase().trim();
            if (estado !== 'terminado') return;
            if (!item.pieza) return;

            // Extract tooth numbers (handles comma-separated e.g. "11, 12" or single "11")
            const toothKeys = String(item.pieza)
                .split(/[,;\s]+/)
                .map(t => t.trim())
                .filter(Boolean);

            // Extract arancel configuration if present
            let arancel = item.proformaDetalle?.arancel || item.arancel;

            // If arancel not directly linked on item, search in arancelesList by treatment name
            if (!arancel && item.tratamiento && Array.isArray(arancelesList)) {
                const trName = String(item.tratamiento).toLowerCase().trim();
                arancel = arancelesList.find((a: any) => a.detalle && String(a.detalle).toLowerCase().trim() === trName);
            }

            let figType = arancel?.odontogramaFigura || '';
            let figColor = arancel?.odontogramaColor || '#3b82f6';

            // Infer figure type if not explicitly set on the arancel
            if (!figType && item.tratamiento) {
                const tr = String(item.tratamiento).toLowerCase();
                if (tr.includes('corona')) { figType = 'circulo_corona'; figColor = '#f59e0b'; }
                else if (tr.includes('implante')) { figType = 'implante'; figColor = '#14b8a6'; }
                else if (tr.includes('endo') || tr.includes('conducto')) { figType = 'conducto'; figColor = '#10b981'; }
                else if (tr.includes('perno')) { figType = 'perno'; figColor = '#6b7280'; }
                else if (tr.includes('puente')) { figType = 'puente'; figColor = '#8b5cf6'; }
                else if (tr.includes('prótesis') || tr.includes('protesis')) { figType = 'protesis_removible'; figColor = '#a855f7'; }
                else if (tr.includes('sellante')) { figType = 'sellante'; figColor = '#10b981'; }
                else if (tr.includes('extracción') || tr.includes('extraccion')) { figType = 'tachar_extraccion'; figColor = '#ef4444'; }
                else if (tr.includes('ausente')) { figType = 'tachar_ausente'; figColor = '#3b82f6'; }
                else if (tr.includes('obturaci') || tr.includes('resina') || tr.includes('amalgama')) { figType = 'cara_rellena'; figColor = '#3b82f6'; }
                else if (tr.includes('caries')) { figType = 'caries'; figColor = '#ef4444'; }
            }

            if (!figType) return;

            const tratamientoLabel = `Tratamiento Terminado: ${item.tratamiento || 'Tratamiento'}`;

            toothKeys.forEach(toothKey => {
                if (!merged[toothKey]) {
                    merged[toothKey] = { activeFigures: [], surfaceColors: {} };
                }

                const currentTooth = merged[toothKey];
                if (!currentTooth.activeFigures) currentTooth.activeFigures = [];
                if (!currentTooth.surfaceColors) currentTooth.surfaceColors = {};

                // Add figure tagged with origin: 'seguimiento'
                const exists = currentTooth.activeFigures.some((f: any) => f.type === figType && f.origin === 'seguimiento');
                if (!exists) {
                    currentTooth.activeFigures.push({
                        type: figType,
                        color: figColor,
                        origin: 'seguimiento',
                        originLabel: tratamientoLabel
                    });
                }

                // Handle surface coloring if cara is specified
                if (item.cara) {
                    const surfaces = String(item.cara).toUpperCase().split(/[,;\s]+/);
                    surfaces.forEach(s => {
                        if (s) {
                            currentTooth.surfaceColors[s] = figColor;
                        }
                    });
                } else if (figType === 'caries' || figType === 'cara_rellena') {
                    currentTooth.surfaceColors['O'] = figColor;
                }
            });
        });
    }

    // MANDATORY RULE: Sort activeFigures on each tooth so 'inicial' figures ALWAYS come FIRST (at index 0/top),
    // followed by 'seguimiento' completed treatment figures below.
    Object.keys(merged).forEach(toothKey => {
        const tooth = merged[toothKey];
        if (tooth && Array.isArray(tooth.activeFigures)) {
            tooth.activeFigures.sort((a: any, b: any) => {
                const aOrigin = a.origin || 'inicial';
                const bOrigin = b.origin || 'inicial';
                if (aOrigin === 'inicial' && bOrigin !== 'inicial') return -1;
                if (aOrigin !== 'inicial' && bOrigin === 'inicial') return 1;
                return 0;
            });
        }
    });

    return merged;
};
