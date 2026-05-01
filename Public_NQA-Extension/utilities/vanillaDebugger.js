/**
 * vanillaDebugger.js
 * 
 * Sistema de logging estructurado para debugging visual en aplicaciones JavaScript.
 * Incluye: buffering de logs, niveles de severidad, inyección de SVG, UI en tiempo real.
 * 
 * Ideal para:
 * - Extensiones de Chrome
 * - Aplicaciones web con automatización
 * - Depuración visual sin salir de la UI
 * 
 * Autor: Miguel Ángel Fernández Ramírez
 * Licencia: MIT
 */

const VanillaDebugger = (function () {
    // Estado privado
    let debugEnabled = false;
    let logBuffer = [];
    let checkpointHistory = [];
    let logContainer = null;
    let maxBufferSize = 500;

    // Color scheme (personalizable)
    const LogLevels = {
        INFO: { name: 'INFO', color: '#ebebebff', icon: 'ℹ️' },
        SUCCESS: { name: 'SUCCESS', color: '#6db14eff', icon: '✅' },
        WARN: { name: 'WARN', color: '#cca700', icon: '⚠️' },
        ERROR: { name: 'ERROR', color: '#680000ff', icon: '❌' },
        DEBUG: { name: 'DEBUG', color: '#00bfff', icon: '🐛' },
        CHECKPOINT: { name: 'CHECKPOINT', color: '#00bfff', icon: '📍' },
    };

    // SVG cache para evitar re-fetches
    const svgCache = {};

    // =========================================================
    // LOGGING
    // =========================================================

    /**
     * Registra un mensaje en el buffer
     * @param {string} message - Mensaje a loguear
     * @param {string} level - Nivel (INFO, SUCCESS, WARN, ERROR, DEBUG, CHECKPOINT)
     * @param {Object} metadata - Metadata adicional (opcional)
     */
    function log(message, level = 'INFO', metadata = {}) {
        if (!debugEnabled) return;

        const levelObj = LogLevels[level] || LogLevels.INFO;
        const entry = {
            timestamp: Date.now(),
            message,
            level,
            color: levelObj.color,
            icon: levelObj.icon,
            metadata,
        };

        logBuffer.push(entry);

        // Limitar tamaño del buffer
        if (logBuffer.length > maxBufferSize) {
            logBuffer.shift();
        }

        // Imprimir en consola también
        console.log(`[${level}] ${message}`, metadata);

        // Renderizar en UI si el contenedor está presente
        renderLogToUI(entry);
    }

    /**
     * Accesos rápidos para cada nivel
     */
    function info(msg, meta) { log(msg, 'INFO', meta); }
    function success(msg, meta) { log(msg, 'SUCCESS', meta); }
    function warn(msg, meta) { log(msg, 'WARN', meta); }
    function error(msg, meta) { log(msg, 'ERROR', meta); }
    function debug(msg, meta) { log(msg, 'DEBUG', meta); }

    /**
     * Registra un checkpoint (hito importante)
     * @param {string} label - Descripción del hito
     * @param {number} progress - Porcentaje (0-100)
     */
    function checkpoint(label, progress = 0) {
        const entry = {
            timestamp: Date.now(),
            label,
            progress,
        };

        checkpointHistory.push(entry);
        log(`${label} (${progress}%)`, 'CHECKPOINT');

        return entry;
    }

    /**
     * Obtiene todo el buffer de logs
     * @returns {Array}
     */
    function getLogBuffer() {
        return [...logBuffer];
    }

    /**
     * Obtiene el historial de checkpoints
     * @returns {Array}
     */
    function getCheckpointHistory() {
        return [...checkpointHistory];
    }

    /**
     * Limpia todos los logs
     */
    function clearLogs() {
        logBuffer = [];
        checkpointHistory = [];

        if (logContainer) {
            logContainer.innerHTML = '';
        }

        console.log('[VanillaDebugger] Logs cleared');
    }

    // =========================================================
    // RENDERIZACIÓN EN UI
    // =========================================================

    /**
     * Inicializa el contenedor de logs en el DOM
     * @param {string|Element} selector - Selector CSS o elemento
     */
    function initUI(selector) {
        if (typeof selector === 'string') {
            logContainer = document.querySelector(selector);
        } else {
            logContainer = selector;
        }

        if (!logContainer) {
            console.warn('[VanillaDebugger] Container not found:', selector);
            return;
        }

        // Estilos básicos si no existen
        if (!logContainer.style.maxHeight) {
            logContainer.style.maxHeight = '300px';
            logContainer.style.overflowY = 'auto';
            logContainer.style.backgroundColor = '#1a1a1a';
            logContainer.style.color = '#fff';
            logContainer.style.fontFamily = 'monospace';
            logContainer.style.fontSize = '12px';
            logContainer.style.padding = '10px';
            logContainer.style.borderRadius = '4px';
            logContainer.style.border = '1px solid #444';
        }

        // Renderizar logs existentes
        flushLogsToUI();

        console.log('[VanillaDebugger] UI initialized');
    }

    /**
     * Renderiza un log individual en el UI
     * @param {Object} entry - Entrada de log
     */
    function renderLogToUI(entry) {
        if (!logContainer) return;

        const logLine = document.createElement('div');
        logLine.style.color = entry.color;
        logLine.style.marginBottom = '4px';
        logLine.style.fontSize = '11px';
        logLine.style.fontFamily = 'monospace';
        logLine.style.wordBreak = 'break-word';
        logLine.style.whiteSpace = 'pre-wrap';

        const timestamp = new Date(entry.timestamp).toLocaleTimeString('es-ES', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });

        logLine.textContent = `[${timestamp}] ${entry.icon} ${entry.message}`;

        logContainer.appendChild(logLine);

        // Auto-scroll al final
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    /**
     * Renderiza todos los logs del buffer en el UI
     */
    function flushLogsToUI() {
        if (!logContainer) return;

        logContainer.innerHTML = '';

        logBuffer.forEach(entry => {
            renderLogToUI(entry);
        });

        logContainer.scrollTop = logContainer.scrollHeight;
    }

    // =========================================================
    // SVG INJECTION CON CACHÉ
    // =========================================================

    /**
     * Inyecta un SVG en elementos del DOM con caché
     * @param {string} selector - Selector CSS de los elementos
     * @param {string} svgPath - Ruta del SVG (relativa a chrome.runtime.getURL si es extensión)
     */
    async function injectSVG(selector, svgPath) {
        const elements = document.querySelectorAll(selector);
        if (!elements.length) return;

        // Verificar caché
        if (svgCache[svgPath]) {
            elements.forEach(el => el.innerHTML = svgCache[svgPath]);
            return;
        }

        // Si no está en caché, traer el SVG
        try {
            // Soporte para extensiones de Chrome
            const url = typeof chrome !== 'undefined' && chrome.runtime
                ? chrome.runtime.getURL(svgPath)
                : svgPath;

            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const svg = await response.text();

            // Guardar en caché
            svgCache[svgPath] = svg;

            // Inyectar en todos los elementos
            elements.forEach(el => el.innerHTML = svg);

            if (debugEnabled) {
                console.log(`[VanillaDebugger] SVG injected: ${svgPath}`);
            }
        } catch (err) {
            console.error(`[VanillaDebugger] Error loading SVG: ${svgPath}`, err);
        }
    }

    /**
     * Inyecta múltiples SVGs (mapa de selector → ruta)
     * @param {Object} svgMap - { '.selector1': 'path1.svg', '.selector2': 'path2.svg' }
     */
    async function injectSVGBatch(svgMap) {
        const promises = Object.entries(svgMap).map(([selector, path]) => {
            // Solo inyectar si el selector existe en el DOM
            if (document.querySelector(selector)) {
                return injectSVG(selector, path);
            }
            return Promise.resolve();
        });

        await Promise.all(promises);
    }

    /**
     * Limpia el caché de SVGs
     */
    function clearSVGCache() {
        Object.keys(svgCache).forEach(key => delete svgCache[key]);
        if (debugEnabled) {
            console.log('[VanillaDebugger] SVG cache cleared');
        }
    }

    // =========================================================
    // CONTROL Y CONFIGURACIÓN
    // =========================================================

    /**
     * Habilita debug mode
     */
    function enable() {
        debugEnabled = true;
        console.log('[VanillaDebugger] Enabled');
    }

    /**
     * Desactiva debug mode
     */
    function disable() {
        debugEnabled = false;
        console.log('[VanillaDebugger] Disabled');
    }

    /**
     * Alterna debug mode
     */
    function toggle() {
        debugEnabled ? disable() : enable();
        return debugEnabled;
    }

    /**
     * Obtiene estado actual
     * @returns {boolean}
     */
    function isEnabled() {
        return debugEnabled;
    }

    /**
     * Configura tamaño máximo del buffer
     * @param {number} size
     */
    function setMaxBufferSize(size) {
        maxBufferSize = size;
    }

    /**
     * Exporta todos los logs como JSON
     * @returns {string} JSON string
     */
    function exportLogsAsJSON() {
        return JSON.stringify({
            logs: logBuffer,
            checkpoints: checkpointHistory,
            exportedAt: new Date().toISOString(),
        }, null, 2);
    }

    /**
     * Exporta logs como CSV
     * @returns {string} CSV string
     */
    function exportLogsAsCSV() {
        let csv = 'timestamp,level,message,metadata\n';

        logBuffer.forEach(entry => {
            const timestamp = new Date(entry.timestamp).toISOString();
            const message = `"${entry.message.replace(/"/g, '""')}"`;
            const metadata = `"${JSON.stringify(entry.metadata).replace(/"/g, '""')}"`;

            csv += `${timestamp},${entry.level},${message},${metadata}\n`;
        });

        return csv;
    }

    // =========================================================
    // API PÚBLICA
    // =========================================================

    return {
        // Logging
        log,
        info,
        success,
        warn,
        error,
        debug,
        checkpoint,

        // Consultas
        getLogBuffer,
        getCheckpointHistory,
        clearLogs,

        // UI
        initUI,
        flushLogsToUI,

        // SVG
        injectSVG,
        injectSVGBatch,
        clearSVGCache,

        // Control
        enable,
        disable,
        toggle,
        isEnabled,
        setMaxBufferSize,

        // Exportación
        exportLogsAsJSON,
        exportLogsAsCSV,

        // Constantes
        LogLevels,
    };
})();

// Para uso en Node.js o TypeScript
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VanillaDebugger;
}
