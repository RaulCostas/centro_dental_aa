import Swal from 'sweetalert2';
import { getLocalDateString } from './dateUtils';

export interface PaymentPlanData {
    activo: boolean;
    meses: number;
    diaPago: number;
    cuotaInicial?: number;
    fechaInicio: string;
}

export type PaymentPlanModalResult =
    | { action: 'save'; plan: PaymentPlanData }
    | { action: 'delete' }
    | { action: 'cancel' };

const extractDateInputValue = (fechaInicio?: string): string => {
    if (fechaInicio && typeof fechaInicio === 'string') {
        const datePart = fechaInicio.split('T')[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
            return datePart;
        }
    }
    return getLocalDateString();
};

export const openPaymentPlanModal = async ({
    currentPlan,
    titleSuffix = '',
    descriptionSubject = 'del presupuesto',
}: {
    currentPlan?: Partial<PaymentPlanData> | null;
    titleSuffix?: string;
    descriptionSubject?: string;
}): Promise<PaymentPlanModalResult> => {
    const isActivo = Boolean(currentPlan?.activo);
    const initialDateValue = extractDateInputValue(currentPlan?.fechaInicio);

    const result = await Swal.fire({
        title: `${isActivo ? 'Editar Plan de Pagos' : 'Configurar Plan de Pagos'}${titleSuffix}`,
        html: `
            <div class="space-y-4 text-left">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de Inicio (Pago / Cuota Inicial)</label>
                    <input type="date" id="swal-fecha-inicio" class="swal2-input w-full mx-0 mt-1 !text-lg" value="${initialDateValue}">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Cuota Inicial (Opcional)</label>
                    <input type="number" id="swal-cuota-inicial" class="swal2-input w-full mx-0 mt-1 !text-lg" placeholder="Ej: 5000" value="${currentPlan?.cuotaInicial ?? ''}" min="0">
                    <div class="text-xs text-gray-500 mt-1">El monto restante se dividirá en cuotas.</div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Duración en meses</label>
                    <input type="number" id="swal-meses" class="swal2-input w-full mx-0 mt-1 !text-lg" value="${currentPlan?.meses || 6}" min="1" max="60">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Día de pago (del mes)</label>
                    <input type="number" id="swal-dia" class="swal2-input w-full mx-0 mt-1 !text-lg" value="${currentPlan?.diaPago || 15}" min="1" max="31">
                </div>
                <div class="pt-2 text-xs text-gray-500 dark:text-gray-400">
                    La cuota se calculará dividiendo el total ${descriptionSubject} (menos la cuota inicial) entre los meses.
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        showDenyButton: isActivo,
        confirmButtonText: 'Guardar Plan',
        cancelButtonText: 'Cancelar',
        denyButtonText: 'Eliminar Plan',
        preConfirm: () => {
            const fechaInicio = (document.getElementById('swal-fecha-inicio') as HTMLInputElement).value;
            const cuotaInicial = (document.getElementById('swal-cuota-inicial') as HTMLInputElement).value;
            const meses = (document.getElementById('swal-meses') as HTMLInputElement).value;
            const dia = (document.getElementById('swal-dia') as HTMLInputElement).value;

            if (!fechaInicio || !/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio)) {
                Swal.showValidationMessage('Seleccione una fecha de inicio válida');
                return false;
            }
            if (!meses || Number(meses) < 1) {
                Swal.showValidationMessage('Ingrese una cantidad válida de meses');
                return false;
            }
            if (!dia || Number(dia) < 1 || Number(dia) > 31) {
                Swal.showValidationMessage('El día debe estar entre 1 y 31');
                return false;
            }

            const cuotaInicialNum = cuotaInicial !== '' ? Number(cuotaInicial) : 0;

            return {
                fechaInicio: `${fechaInicio}T12:00:00`,
                meses: Number(meses),
                diaPago: Number(dia),
                cuotaInicial: cuotaInicialNum,
            };
        },
    });

    if (result.isConfirmed && result.value) {
        return {
            action: 'save',
            plan: {
                activo: true,
                meses: result.value.meses,
                diaPago: result.value.diaPago,
                cuotaInicial: result.value.cuotaInicial,
                fechaInicio: result.value.fechaInicio,
            },
        };
    }

    if (result.isDenied) {
        return { action: 'delete' };
    }

    return { action: 'cancel' };
};
