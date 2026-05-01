/**
 * dataTypeNormalizer.js
 * 
 * Módulo standalone para normalización de tipos de datos comunes:
 * - Fechas (múltiples formatos: AM/PM, "ayer", día de semana, dd/mm/yyyy)
 * - Texto plano (limpieza de caracteres especiales)
 * - Markdown parsing
 * - Extracción de contactos (emails, teléfonos)
 * 
 * Autor: Miguel Ángel Fernández Ramírez
 * Licencia: MIT
 */

const DataTypeNormalizer = (function () {
    // Configuración privada
    let timezone = 'America/Bogota';
    let debugMode = false;

    // =========================================================
    // NORMALIZACIÓN DE FECHAS
    // =========================================================

    /**
     * Obtiene la hora actual en la zona horaria configurada
     * @param {string} tz - Timezone (ej: America/Bogota)
     * @returns {Date} Objeto Date en la zona horaria especificada
     */
    function getCurrentTimeInTimezone(tz = timezone) {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        });

        const parts = formatter.formatToParts(new Date());
        const values = Object.fromEntries(parts.map(p => [p.type, p.value]));

        const year = parseInt(values.year);
        const month = parseInt(values.month) - 1;
        const day = parseInt(values.day);
        const hour = parseInt(values.hour);
        const minute = parseInt(values.minute);
        const second = parseInt(values.second);

        return new Date(year, month, day, hour, minute, second);
    }

    /**
     * Interpreta una fecha en múltiples formatos comunes
     * Soporta: AM/PM, "ayer", día de semana, dd/mm/yyyy
     * @param {string} dateText - Texto con la fecha a interpretar
     * @returns {number|null} Timestamp en milisegundos o null si no se puede interpretar
     */
    function parseFlexibleDate(dateText) {
        if (!dateText) return null;

        // Limpieza inicial
        let cleaned = sanitizeText(dateText);
        const now = getCurrentTimeInTimezone();

        // [1] Formato: HH:MM a.m./p.m.
        const timeRegex = /^(\d{1,2}):(\d{2})\s*(a\.\s*m\.|p\.\s*m\.)$/i;
        const timeMatch = cleaned.match(timeRegex);
        if (timeMatch) {
            let hours = parseInt(timeMatch[1], 10);
            const minutes = parseInt(timeMatch[2], 10);
            const ampm = timeMatch[3];

            if (ampm.toLowerCase().includes('p') && hours < 12) hours += 12;
            if (ampm.toLowerCase().includes('a') && hours === 12) hours = 0;

            now.setHours(hours, minutes, 0, 0);

            if (debugMode) {
                console.log(`[DataTypeNormalizer] Parsed time: "${dateText}" → ${now.toLocaleString()}`);
            }
            return now.getTime();
        }

        // [2] Palabra clave: "ayer"
        if (cleaned.toLowerCase() === 'ayer') {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);

            if (debugMode) {
                console.log(`[DataTypeNormalizer] Parsed "ayer" → ${yesterday.toLocaleDateString()}`);
            }
            return yesterday.getTime();
        }

        // [3] Día de la semana en español
        const weekdayNames = [
            'domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'
        ];
        const cleanedLower = cleaned.toLowerCase();

        if (weekdayNames.includes(cleanedLower)) {
            const todayWeekday = now.getDay();
            const targetWeekday = weekdayNames.indexOf(cleanedLower);

            let daysDiff = todayWeekday - targetWeekday;
            if (daysDiff <= 0) daysDiff += 7;
            if (daysDiff > 6) {
                if (debugMode) {
                    console.warn(`[DataTypeNormalizer] Weekday "${dateText}" is out of range (>6 days).`);
                }
                return null;
            }

            now.setDate(now.getDate() - daysDiff);
            now.setHours(0, 0, 0, 0);

            if (debugMode) {
                console.log(`[DataTypeNormalizer] Parsed weekday: "${dateText}" → ${now.toLocaleDateString()}`);
            }
            return now.getTime();
        }

        // [4] Formato completo: dd/mm/yyyy o dd-mm-yyyy
        const dateRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
        const dateMatch = cleaned.match(dateRegex);
        if (dateMatch) {
            const day = parseInt(dateMatch[1], 10);
            const month = parseInt(dateMatch[2], 10);
            const year = parseInt(dateMatch[3], 10);

            if (day < 1 || day > 31 || month < 1 || month > 12) {
                if (debugMode) {
                    console.error(`[DataTypeNormalizer] Invalid date: "${dateText}"`);
                }
                return null;
            }

            const dateObj = new Date(year, month - 1, day, 0, 0, 0, 0);

            if (debugMode) {
                console.log(`[DataTypeNormalizer] Parsed date: "${dateText}" → ${dateObj.toLocaleDateString()}`);
            }
            return dateObj.getTime();
        }

        // Fallback: intentar parsear como ISO string
        const isoDate = new Date(dateText);
        if (!isNaN(isoDate.getTime())) {
            return isoDate.getTime();
        }

        if (debugMode) {
            console.warn(`[DataTypeNormalizer] Could not parse date: "${dateText}"`);
        }
        return null;
    }

    /**
     * Formatea un timestamp a formato legible
     * @param {number} timestamp - Milisegundos desde epoch
     * @param {boolean} includeTime - Si incluye hora o solo fecha
     * @returns {string} Fecha formateada
     */
    function formatDateReadable(timestamp, includeTime = false) {
        if (!timestamp) return '';

        const date = new Date(timestamp);
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            ...(includeTime && {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            }),
        };

        return new Intl.DateTimeFormat('es-ES', options).format(date);
    }

    // =========================================================
    // NORMALIZACIÓN DE TEXTO
    // =========================================================

    /**
     * Limpia caracteres especiales, espacios raros y normaliza espacios en blanco
     * @param {string} text - Texto a limpiar
     * @returns {string} Texto sanitizado
     */
    function sanitizeText(text) {
        if (!text) return '';

        return String(text)
            .trim()
            // Normalizar espacios en blanco (múltiples a uno)
            .replace(/\s+/g, ' ')
            // Remover caracteres de control invisibles
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
            // Remover caracteres Unicode raros que se cuelan en copypaste
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .trim();
    }

    /**
     * Detecta si una cadena contiene caracteres "sospechosos"
     * (inyección HTML, scripts, etc.)
     * @param {string} text - Texto a verificar
     * @returns {boolean} true si parece seguro
     */
    function isSafeText(text) {
        if (!text) return true;

        // Patrón simple para detectar intentos comunes
        const dangerPattern = /<script|javascript:|onerror|onclick|<iframe|eval\(/gi;
        return !dangerPattern.test(text);
    }

    /**
     * Extrae direcciones de email de un texto
     * @param {string} text - Texto a buscar
     * @returns {string[]} Array de emails encontrados
     */
    function extractEmails(text) {
        if (!text) return [];

        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        return text.match(emailRegex) || [];
    }

    /**
     * Extrae números de teléfono (formato flexible)
     * @param {string} text - Texto a buscar
     * @returns {string[]} Array de teléfonos encontrados
     */
    function extractPhoneNumbers(text) {
        if (!text) return [];

        // Patrón flexible: +57 301 234 5678, (301) 234-5678, 3012345678, etc.
        const phoneRegex = /(\+\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}/g;
        return text.match(phoneRegex) || [];
    }

    /**
     * Valida si un string es una URL válida
     * @param {string} url - URL a validar
     * @returns {boolean}
     */
    function isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    // =========================================================
    // MARKDOWN Y DOM PARSING
    // =========================================================

    /**
     * Convierte contenido HTML simple a Markdown
     * Soporta: <a>, <img>, <video>, <br>, <strong>, <em>, etc.
     * @param {Element} element - Elemento del DOM a convertir
     * @returns {Promise<string>} Markdown formateado
     */
    async function elementToMarkdown(element) {
        const tag = element.tagName?.toLowerCase();
        if (!tag) return '';

        if (tag === 'br') return '\n';

        if (tag === 'img') {
            const src = element.getAttribute('src');
            const alt = element.getAttribute('alt') || 'Image';
            return src ? `![${alt}](${src})` : '';
        }

        if (tag === 'video') {
            const src = element.getAttribute('src');
            return src ? `[Video](${src})` : '';
        }

        if (tag === 'a') {
            const href = element.getAttribute('href');
            let text = element.textContent.trim();

            // Manejo especial para mailto:
            if (href?.startsWith('mailto:')) {
                const email = href.replace('mailto:', '');
                return text && text !== email ? `[${text}](${href})` : email;
            }

            return href ? `[${text || 'Link'}](${href})` : text;
        }

        if (tag === 'strong' || tag === 'b') {
            return `**${element.textContent}**`;
        }

        if (tag === 'em' || tag === 'i') {
            return `*${element.textContent}*`;
        }

        if (tag === 'code') {
            return `\`${element.textContent}\``;
        }

        // Para etiquetas genéricas, procesar contenido recursivamente
        let markdown = '';
        for (const child of element.childNodes) {
            if (child.nodeType === Node.ELEMENT_NODE) {
                markdown += await elementToMarkdown(child);
            } else if (child.nodeType === Node.TEXT_NODE) {
                const text = child.textContent.trim();
                if (text && !/^[\.\-\s]*$/.test(text)) {
                    markdown += text + ' ';
                }
            }
        }
        return markdown.trim();
    }

    // =========================================================
    // API PÚBLICA
    // =========================================================

    return {
        // Configuración
        setTimezone: (tz) => { timezone = tz; },
        setDebugMode: (debug) => { debugMode = debug; },

        // Fechas
        getCurrentTimeInTimezone,
        parseFlexibleDate,
        formatDateReadable,

        // Texto
        sanitizeText,
        isSafeText,

        // Extracción
        extractEmails,
        extractPhoneNumbers,
        isValidURL,

        // Markdown
        elementToMarkdown,
    };
})();

// Para uso en Node.js o TypeScript
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataTypeNormalizer;
}
