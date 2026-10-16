import Swal from 'sweetalert2';

export interface WhatsAppPromptOptions {
    defaultPhone?: string | number | null;
    title?: string;
    subtitle?: string;
    confirmButtonText?: string;
    cancelButtonText?: string;
}

/**
 * Muestra el modal estándar de SweetAlert2 para seleccionar el código de país
 * y editar el número de teléfono antes de enviar por WhatsApp.
 * Devuelve el número limpio con código de país (ej. "59172002180") o null si el usuario canceló.
 */
export const promptWhatsAppNumber = async (options?: WhatsAppPromptOptions): Promise<string | null> => {
    let raw = (options?.defaultPhone ?? '').toString().replace(/\+/g, '').replace(/\s/g, '');
    let defaultCode = '591';
    let defaultPhone = raw;

    if (defaultPhone.startsWith('591')) {
        defaultPhone = defaultPhone.substring(3);
    } else if (
        defaultPhone.length > 8 &&
        (defaultPhone.startsWith('54') || defaultPhone.startsWith('56') ||
         defaultPhone.startsWith('51') || defaultPhone.startsWith('55') ||
         defaultPhone.startsWith('57') || defaultPhone.startsWith('52') ||
         defaultPhone.startsWith('34'))
    ) {
        defaultCode = defaultPhone.substring(0, 2);
        defaultPhone = defaultPhone.substring(2);
    } else if (defaultPhone.length > 10 && defaultPhone.startsWith('1')) {
        defaultCode = '1';
        defaultPhone = defaultPhone.substring(1);
    }

    const isDark = document.documentElement.classList.contains('dark');
    const title = options?.title || 'Enviar por WhatsApp';
    const subtitle = options?.subtitle || 'Seleccione el código de país e ingrese el número:';
    const confirmButtonText = options?.confirmButtonText || 'Sí, enviar';
    const cancelButtonText = options?.cancelButtonText || 'Cancelar';

    const result = await Swal.fire({
        title,
        html: `
            <div style="text-align: left; margin-bottom: 8px; font-size: 14px; color: ${isDark ? '#d1d5db' : '#4b5563'};">
                ${subtitle}
            </div>
            <div style="display: flex; gap: 10px; align-items: center; justify-content: center;">
                <select id="country-code" class="swal2-select" style="margin: 0; width: 40%; font-size: 15px; padding: 5px;">
                    <option value="591" ${defaultCode === '591' ? 'selected' : ''}>BO +591</option>
                    <option value="54" ${defaultCode === '54' ? 'selected' : ''}>AR +54</option>
                    <option value="56" ${defaultCode === '56' ? 'selected' : ''}>CL +56</option>
                    <option value="51" ${defaultCode === '51' ? 'selected' : ''}>PE +51</option>
                    <option value="55" ${defaultCode === '55' ? 'selected' : ''}>BR +55</option>
                    <option value="57" ${defaultCode === '57' ? 'selected' : ''}>CO +57</option>
                    <option value="52" ${defaultCode === '52' ? 'selected' : ''}>MX +52</option>
                    <option value="34" ${defaultCode === '34' ? 'selected' : ''}>ES +34</option>
                    <option value="1" ${defaultCode === '1' ? 'selected' : ''}>US +1</option>
                </select>
                <input id="phone-number" class="swal2-input" placeholder="Número" type="number" style="margin: 0; width: 60%; font-size: 16px;" value="${defaultPhone}">
            </div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#25D366',
        confirmButtonText,
        cancelButtonText,
        background: isDark ? '#1f2937' : '#fff',
        color: isDark ? '#f3f4f6' : '#000',
        preConfirm: () => {
            const codeEl = document.getElementById('country-code') as HTMLSelectElement | null;
            const phoneEl = document.getElementById('phone-number') as HTMLInputElement | null;
            const code = codeEl?.value || '591';
            const rawNum = phoneEl?.value || '';

            if (!rawNum || rawNum.trim() === '') {
                Swal.showValidationMessage('¡Necesita escribir un número de celular!');
                return false;
            }
            let cleanNum = rawNum.replace(/\D/g, '');
            if (cleanNum.startsWith(code)) {
                cleanNum = cleanNum.substring(code.length);
            }
            return code + cleanNum;
        }
    });

    if (result.isConfirmed && result.value) {
        return (result.value as string).replace(/\D/g, '');
    }
    return null;
};
