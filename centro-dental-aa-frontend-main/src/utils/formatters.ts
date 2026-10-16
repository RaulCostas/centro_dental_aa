
import api from '../services/api';

export const formatDateSpanish = (dateString: string): string => {
    // const date = new Date(dateString);
    // Adjust for timezone if necessary, but assuming dateString is YYYY-MM-DD or ISO
    // If it's YYYY-MM-DD, new Date() might treat it as UTC. 
    // The user input 04/12/2025 and saw 03/12/2025, so we are dealing with timezone issues.
    // Best to parse manually to avoid timezone shifts.
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);

    const months = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];

    const days = [
        'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'
    ];

    // Create date object using local time components to get the correct day of week
    const localDate = new Date(year, month - 1, day);
    const dayOfWeek = days[localDate.getDay()];

    return `La Paz ${dayOfWeek}, ${day} de ${months[month - 1]} de ${year}`;
};

export const formatDateUTC = (dateString: string): string => {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
};

export const numberToWords = (amount: number): string => {
    const units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const tens = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const teens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    const hundreds = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

    const convertGroup = (n: number): string => {
        let output = '';

        if (n === 100) return 'CIEN';

        if (n >= 100) {
            output += hundreds[Math.floor(n / 100)] + ' ';
            n %= 100;
        }

        if (n >= 20) {
            output += tens[Math.floor(n / 10)];
            if (n % 10 > 0) output += ' Y ' + units[n % 10];
        } else if (n >= 10) {
            output += teens[n - 10];
        } else if (n > 0) {
            output += units[n];
        }

        return output.trim();
    };

    const integerPart = Math.floor(amount);

    if (integerPart === 0) return 'CERO';

    let words = '';

    if (integerPart >= 1000000) {
        const millions = Math.floor(integerPart / 1000000);
        words += (millions === 1 ? 'UN MILLON' : convertGroup(millions) + ' MILLONES') + ' ';
        // Remainder
        const remainder = integerPart % 1000000;
        if (remainder > 0) {
            if (remainder >= 1000) {
                const thousands = Math.floor(remainder / 1000);
                words += (thousands === 1 ? 'MIL' : convertGroup(thousands) + ' MIL') + ' ';
                words += convertGroup(remainder % 1000);
            } else {
                words += convertGroup(remainder);
            }
        }
    } else if (integerPart >= 1000) {
        const thousands = Math.floor(integerPart / 1000);
        words += (thousands === 1 ? 'MIL' : convertGroup(thousands) + ' MIL') + ' ';
        words += convertGroup(integerPart % 1000);
    } else {
        words += convertGroup(integerPart);
    }

    return words.trim();
};

export const formatFullName = (person: any): string => {
    if (!person) return '-';
    
    // If it's a User object which has 'name' and potentially 'apellido'
    if (person.name && !person.paterno && !person.nombre) {
        if (person.apellido) {
            return `${person.apellido} ${person.name}`.trim();
        }
        return person.name;
    }

    const { paterno, materno, nombre } = person;
    
    const parts = [
        paterno?.trim(),
        materno?.trim(),
        nombre?.trim()
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(' ') : '-';
};

export const formatNumber = (amount: number | string | undefined | null): string => {
    const val = Number(amount);
    if (isNaN(val)) return '0,00';
    return new Intl.NumberFormat('es-BO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(val);
};

export const formatCurrency = (amount: number | string | undefined | null, currency: string = 'Bs'): string => {
    const formattedNumber = formatNumber(amount);
    return `${currency} ${formattedNumber}`;
};

export const getImageUrl = (url?: string): string => {
    if (!url) return '';
    if (url.startsWith('data:image')) return url; // Base64 image data

    const backendUrl = import.meta.env.VITE_API_URL || api.defaults.baseURL || '';
    const origin = backendUrl.replace(/\/api\/?$/, '');

    // Si la URL contiene '/uploads/', forzamos a que use el origin correcto (backend actual)
    // Esto previene errores de Mixed Content (HTTP en HTTPS) o IPs antiguas
    if (url.includes('/uploads/')) {
        const urlParts = url.split('/uploads/');
        return `${origin}/uploads/${urlParts[1]}`;
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return origin ? `${origin}${cleanPath}` : url;
};

/**
 * Limpia y normaliza el HTML de consentimientos informados:
 * - Une guiones o viñetas que quedaron en párrafos aislados (<p>-</p>) al inicio del párrafo de texto siguiente.
 * - Une líneas de introducción partidas ("Yo ...") con la continuación del párrafo ("con CI...").
 */
export const cleanConsentimientoHtml = (rawHtml: string): string => {
    if (!rawHtml) return '';
    try {
        // 1. Reemplazar espacios de no-separación (&nbsp; / \u00a0) por espacios normales para evitar que Chromium corte palabras por la mitad
        let sanitized = rawHtml
            .replace(/&nbsp;/g, ' ')
            .replace(/\u00a0/g, ' ')
            // Limpiar glifos corruptos de fuentes de viñetas Word (Wingdings/Webdings, ej. Ø=Üæ, Ø=ÜÈ, º™mb, etc.)
            .replace(/[Øø]\s*=\s*[Üü][^\s<]*/g, '')
            .replace(/[Øø][=][^\s<]*/g, '')
            .replace(/[º°]™[a-zA-Z0-9]*/g, '')
            .replace(/[\uE000-\uF8FF]/g, '')
            .replace(/\uFFFD/g, '');

        const parser = new DOMParser();
        const doc = parser.parseFromString(sanitized, 'text/html');
        const elements = Array.from(doc.body.children) as HTMLElement[];

        for (let i = 0; i < elements.length; i++) {
            const el = elements[i];
            if (!el) continue;
            const text = (el.textContent || '').trim();

            // 2. Detectar si el elemento solo contiene un guión, viñeta o punto aislado
            if (/^[-–—•\*\.]+$/.test(text)) {
                let nextIdx = i + 1;
                while (nextIdx < elements.length && !(elements[nextIdx]?.textContent || '').trim()) {
                    elements[nextIdx]?.remove();
                    nextIdx++;
                }
                const nextEl = elements[nextIdx];
                if (nextEl) {
                    const nextClean = nextEl.innerHTML.trim().replace(/^[-–—•\*]\s*/, '');
                    nextEl.innerHTML = `- ${nextClean}`;
                    el.remove();
                } else {
                    el.remove();
                }
                continue;
            }

            // 3. Normalizar párrafos que empiezan pegados al guión ej: "-Declaro" -> "- Declaro"
            if (/^[-–—•\*][^\s<]/.test(text)) {
                el.innerHTML = el.innerHTML.replace(/^([-–—•\*])\s*/, '$1 ');
            }

            // 4. Detectar si el elemento empieza con "Yo" y se cortó antes de "con CI..." o del apellido
            if (/^Yo\b/i.test(text) && !/[.:;]$/.test(text)) {
                const nextEl = elements[i + 1];
                if (nextEl) {
                    const nextText = (nextEl.textContent || '').trim();
                    if (/^(?:con\s+CI|[a-záéíóúñ]|,|por\s+medio|[A-ZÁÉÍÓÚÑ\s]+\s+con\s+CI)/i.test(nextText)) {
                        el.innerHTML = `${el.innerHTML.trim()} ${nextEl.innerHTML.trim()}`;
                        nextEl.remove();
                        i--;
                    }
                }
            }
        }

        // Convertir espacios dobles no deseados pero conservar etiquetas HTML
        return doc.body.innerHTML
            .replace(/&nbsp;/g, ' ')
            .replace(/\u00a0/g, ' ');
    } catch (e) {
        console.error('cleanConsentimientoHtml error:', e);
        return rawHtml.replace(/&nbsp;/g, ' ').replace(/\u00a0/g, ' ');
    }
};
