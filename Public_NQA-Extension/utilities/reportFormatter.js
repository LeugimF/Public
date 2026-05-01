/**
 * reportFormatter.js
 * 
 * Generador de reportes en múltiples formatos:
 * - JSON (estructura limpia)
 * - CSV (datos tabulares)
 * - Excel (XLSX con estilos)
 * 
 * Requiere: XLSX library cargada (opcional, para Excel)
 * 
 * Autor: Miguel Ángel Fernández Ramírez
 * Licencia: MIT
 */

const ReportFormatter = (function () {
    // Configuración privada
    let debugMode = false;
    let dateFormat = 'es-ES';
    let decimalSeparator = ',';
    let thousandsSeparator = '.';

    // =========================================================
    // CONVERSIÓN DE DATOS A FORMATOS ESTÁNDAR
    // =========================================================

    /**
     * Convierte un objeto a formato plano (flattened) para CSV
     * @param {Object} obj - Objeto a flattear
     * @param {string} prefix - Prefijo para claves anidadas
     * @returns {Object} Objeto plano
     */
    function flattenObject(obj, prefix = '') {
        const flattened = {};

        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                const newKey = prefix ? `${prefix}.${key}` : key;

                if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                    Object.assign(flattened, flattenObject(value, newKey));
                } else if (Array.isArray(value)) {
                    flattened[newKey] = value.join('; ');
                } else {
                    flattened[newKey] = value;
                }
            }
        }

        return flattened;
    }

    /**
     * Escapa caracteres especiales para CSV
     * @param {string} value - Valor a escapar
     * @returns {string} Valor escapado
     */
    function escapeCSV(value) {
        if (value === null || value === undefined) return '';

        const stringValue = String(value);

        // Si contiene comillas, saltos de línea o comas, envolver en comillas
        if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }

        return stringValue;
    }

    /**
     * Formatea un número según configuración regional
     * @param {number} num - Número a formatear
     * @param {number} decimals - Decimales (default: 2)
     * @returns {string}
     */
    function formatNumber(num, decimals = 2) {
        if (num === null || num === undefined) return '';

        const parts = parseFloat(num).toFixed(decimals).split('.');
        const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
        const decimalPart = parts[1] || '00';

        return decimals > 0 ? `${integerPart}${decimalSeparator}${decimalPart}` : integerPart;
    }

    /**
     * Formatea una fecha según configuración
     * @param {number|Date} date - Timestamp o Date object
     * @returns {string} Fecha formateada
     */
    function formatDate(date) {
        if (!date) return '';

        const dateObj = typeof date === 'number' ? new Date(date) : date;

        return new Intl.DateTimeFormat(dateFormat, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(dateObj);
    }

    // =========================================================
    // GENERACIÓN DE REPORTES
    // =========================================================

    /**
     * Genera reporte en formato JSON
     * @param {Array|Object} data - Datos a reportear
     * @param {Object} options - Opciones { prettyPrint: true, includeMetadata: true }
     * @returns {string} JSON string
     */
    function toJSON(data, options = {}) {
        const {
            prettyPrint = true,
            includeMetadata = true,
        } = options;

        const report = {
            ...(includeMetadata && {
                metadata: {
                    generatedAt: new Date().toISOString(),
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    dataFormat: Array.isArray(data) ? 'array' : 'object',
                    recordCount: Array.isArray(data) ? data.length : 1,
                },
            }),
            data,
        };

        return JSON.stringify(report, null, prettyPrint ? 2 : 0);
    }

    /**
     * Genera reporte en formato CSV
     * @param {Array<Object>} data - Array de objetos
     * @param {Object} options - Opciones { headers: ['col1', 'col2'], flatten: true }
     * @returns {string} CSV string
     */
    function toCSV(data, options = {}) {
        if (!Array.isArray(data) || data.length === 0) {
            if (debugMode) console.warn('[ReportFormatter] CSV: No data to export');
            return '';
        }

        const {
            headers = null,
            flatten = true,
            delimiter = ',',
            includeTimestamp = false,
        } = options;

        // Flattear objetos si es necesario
        const flatData = flatten ? data.map(row => flattenObject(row)) : data;

        // Determinar headers
        let csvHeaders = headers;
        if (!csvHeaders) {
            csvHeaders = Object.keys(flatData[0] || {});
        }

        // Encabezados
        let csv = csvHeaders.map(escapeCSV).join(delimiter) + '\n';

        // Datos
        flatData.forEach(row => {
            const values = csvHeaders.map(header => escapeCSV(row[header]));
            csv += values.join(delimiter) + '\n';
        });

        // Metadata (comentario al final)
        if (includeTimestamp) {
            csv += `\n# Generated at ${new Date().toISOString()}\n`;
            csv += `# Total records: ${flatData.length}\n`;
        }

        if (debugMode) {
            console.log(`[ReportFormatter] CSV generated: ${flatData.length} rows`);
        }

        return csv;
    }

    /**
     * Genera reporte en formato Excel (requiere XLSX library)
     * @param {Array<Object>} data - Array de objetos
     * @param {Object} options - Opciones { sheetName: 'Data', styling: true }
     * @returns {Blob|null} Excel file blob o null si XLSX no está disponible
     */
    function toExcel(data, options = {}) {
        if (typeof XLSX === 'undefined') {
            console.error('[ReportFormatter] XLSX library not loaded');
            return null;
        }

        if (!Array.isArray(data) || data.length === 0) {
            console.warn('[ReportFormatter] No data to export to Excel');
            return null;
        }

        const {
            sheetName = 'Report',
            styling = false,
            columnWidths = null,
            freezePane = true,
        } = options;

        // Crear workbook
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        // Configurar ancho de columnas (si se proporciona)
        if (columnWidths && ws['!cols']) {
            ws['!cols'] = columnWidths.map(w => ({ wch: w }));
        }

        // Freeze primera fila
        if (freezePane) {
            ws['!freeze'] = { xSplit: 0, ySplit: 1 };
        }

        if (debugMode) {
            console.log(`[ReportFormatter] Excel generated: ${data.length} rows, sheet="${sheetName}"`);
        }

        return wb;
    }

    /**
     * Descarga un archivo (JSON, CSV o Excel)
     * @param {string} content - Contenido (string para JSON/CSV)
     * @param {string} filename - Nombre del archivo
     * @param {string} mimeType - MIME type
     */
    function downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        if (debugMode) {
            console.log(`[ReportFormatter] Downloaded: ${filename}`);
        }
    }

    /**
     * Descarga un Excel file (workbook de XLSX)
     * @param {Object} workbook - XLSX workbook object
     * @param {string} filename - Nombre del archivo
     */
    function downloadExcel(workbook, filename) {
        if (!filename.endsWith('.xlsx')) {
            filename += '.xlsx';
        }

        XLSX.writeFile(workbook, filename);

        if (debugMode) {
            console.log(`[ReportFormatter] Downloaded Excel: ${filename}`);
        }
    }

    // =========================================================
    // GENERADORES RÁPIDOS (HELPER FUNCTIONS)
    // =========================================================

    /**
     * Exporta datos a JSON y descarga automáticamente
     * @param {Array|Object} data
     * @param {string} filename
     */
    function quickExportJSON(data, filename = 'export.json') {
        const json = toJSON(data);
        downloadFile(json, filename, 'application/json');
    }

    /**
     * Exporta datos a CSV y descarga automáticamente
     * @param {Array<Object>} data
     * @param {string} filename
     */
    function quickExportCSV(data, filename = 'export.csv') {
        const csv = toCSV(data);
        downloadFile(csv, filename, 'text/csv');
    }

    /**
     * Exporta datos a Excel y descarga automáticamente
     * @param {Array<Object>} data
     * @param {string} filename
     */
    function quickExportExcel(data, filename = 'export') {
        const wb = toExcel(data, { sheetName: 'Report' });
        if (wb) {
            downloadExcel(wb, filename);
        }
    }

    // =========================================================
    // PROCESAMIENTO DE DATOS AVANZADO
    // =========================================================

    /**
     * Agrupa datos por una clave
     * @param {Array<Object>} data
     * @param {string} groupKey - Clave para agrupar
     * @returns {Object} { groupValue: [...items] }
     */
    function groupByKey(data, groupKey) {
        const grouped = {};

        data.forEach(item => {
            const key = item[groupKey];
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(item);
        });

        return grouped;
    }

    /**
     * Calcula totales para campos numéricos
     * @param {Array<Object>} data
     * @param {Array<string>} numericFields - Campos a sumar
     * @returns {Object} { field: total, ... }
     */
    function calculateTotals(data, numericFields) {
        const totals = {};

        numericFields.forEach(field => {
            totals[field] = data.reduce((sum, item) => {
                const value = parseFloat(item[field]) || 0;
                return sum + value;
            }, 0);
        });

        return totals;
    }

    /**
     * Filtra datos por condición
     * @param {Array<Object>} data
     * @param {Function} predicate - Función que retorna boolean
     * @returns {Array<Object>} Datos filtrados
     */
    function filterData(data, predicate) {
        return data.filter(predicate);
    }

    /**
     * Transforma datos aplicando función a cada fila
     * @param {Array<Object>} data
     * @param {Function} transformer - Función de transformación
     * @returns {Array<Object>} Datos transformados
     */
    function transformData(data, transformer) {
        return data.map(transformer);
    }

    // =========================================================
    // CONFIGURACIÓN
    // =========================================================

    /**
     * Configura el locale para formato de números y fechas
     * @param {string} locale - Ej: 'es-ES', 'en-US'
     */
    function setLocale(locale) {
        dateFormat = locale;
    }

    /**
     * Habilita modo debug
     * @param {boolean} debug
     */
    function setDebugMode(debug) {
        debugMode = debug;
    }

    // =========================================================
    // API PÚBLICA
    // =========================================================

    return {
        // Formatos
        toJSON,
        toCSV,
        toExcel,

        // Descargas
        downloadFile,
        downloadExcel,
        quickExportJSON,
        quickExportCSV,
        quickExportExcel,

        // Procesamiento
        groupByKey,
        calculateTotals,
        filterData,
        transformData,
        flattenObject,

        // Utilidades de formateo
        formatNumber,
        formatDate,
        escapeCSV,

        // Configuración
        setLocale,
        setDebugMode,
    };
})();

// Para uso en Node.js o TypeScript
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReportFormatter;
}
