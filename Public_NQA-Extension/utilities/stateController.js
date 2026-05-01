/**
 * stateController.js
 * 
 * Máquina de estados vanilla para automatización de procesos.
 * Maneja: pausa/reanudación, checkpoints, control de timers y progreso.
 * 
 * Perfecto para:
 * - Automatización web (web scraping, bots)
 * - Procesos asíncrónos con pausas
 * - Sistemas de checkpoint/progreso
 * 
 * Autor: Miguel Ángel Fernández Ramírez
 * Licencia: MIT
 */

const StateController = (function () {
    // Estado interno
    let currentState = 'IDLE';
    let isPaused = false;
    let forceStop = false;
    let debugMode = false;

    // Timestamps para checkpoints
    let checkpoints = [];
    let startTime = null;

    // Control de timers (para poder cancelarlos)
    let activeTimers = {
        intervals: [],
        timeouts: [],
    };

    // Estados válidos
    const STATES = {
        IDLE: 'IDLE',
        RUNNING: 'RUNNING',
        PAUSED: 'PAUSED',
        ERROR: 'ERROR',
        COMPLETED: 'COMPLETED',
    };

    // =========================================================
    // CONTROL DE ESTADO BÁSICO
    // =========================================================

    /**
     * Cambia el estado actual
     * @param {string} newState - Nuevo estado
     * @returns {string} Estado anterior
     */
    function setState(newState) {
        if (!Object.values(STATES).includes(newState)) {
            console.warn(`[StateController] Invalid state: ${newState}`);
            return currentState;
        }

        const previousState = currentState;
        currentState = newState;

        if (debugMode) {
            console.log(`[StateController] State changed: ${previousState} → ${newState}`);
        }

        return previousState;
    }

    /**
     * Obtiene el estado actual
     * @returns {string} Estado actual
     */
    function getState() {
        return currentState;
    }

    /**
     * Verifica si estamos en un estado específico
     * @param {string} state - Estado a verificar
     * @returns {boolean}
     */
    function isInState(state) {
        return currentState === state;
    }

    // =========================================================
    // PAUSA Y REANUDACIÓN
    // =========================================================

    /**
     * Pausa la ejecución
     * Cualquier función que llame a `waitIfPaused()` se detendrá
     */
    function pause() {
        isPaused = true;
        setState(STATES.PAUSED);

        if (debugMode) {
            console.log('[StateController] ⏸️ Execution paused');
        }
    }

    /**
     * Reanuda la ejecución
     */
    function resume() {
        isPaused = false;
        setState(STATES.RUNNING);

        if (debugMode) {
            console.log('[StateController] ▶️ Execution resumed');
        }
    }

    /**
     * Alterna pausa/reanudación
     */
    function togglePause() {
        if (isPaused) {
            resume();
        } else {
            pause();
        }
        return isPaused;
    }

    /**
     * Verifica si está pausado
     * @returns {boolean}
     */
    function getPausedStatus() {
        return isPaused;
    }

    /**
     * Promise que se resuelve cuando se reanuda (tras pausa)
     * Úsalo en funciones asíncrona así: await StateController.waitIfPaused()
     * @returns {Promise<void>}
     */
    function waitIfPaused() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (!isPaused && !forceStop) {
                    clearInterval(checkInterval);
                    resolve();
                }

                if (forceStop) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);

            if (!isPaused && !forceStop) {
                clearInterval(checkInterval);
                resolve();
            }
        });
    }

    // =========================================================
    // CHECKPOINTS Y PROGRESO
    // =========================================================

    /**
     * Registra un checkpoint (milestone con descripción)
     * @param {string} label - Descripción del milestone
     * @param {number} progress - Porcentaje (0-100)
     */
    function recordCheckpoint(label, progress = 0) {
        const checkpoint = {
            label,
            progress,
            timestamp: Date.now(),
            duration: startTime ? Date.now() - startTime : 0,
        };

        checkpoints.push(checkpoint);

        if (debugMode) {
            console.log(
                `[StateController] 📍 Checkpoint: "${label}" (${progress}%) - ` +
                `${(checkpoint.duration / 1000).toFixed(2)}s`
            );
        }

        return checkpoint;
    }

    /**
     * Obtiene el historial completo de checkpoints
     * @returns {Array} Array de checkpoints
     */
    function getCheckpoints() {
        return [...checkpoints];
    }

    /**
     * Limpia el historial de checkpoints
     */
    function clearCheckpoints() {
        checkpoints = [];
        if (debugMode) {
            console.log('[StateController] Checkpoints cleared');
        }
    }

    /**
     * Obtiene el último checkpoint
     * @returns {Object|null}
     */
    function getLastCheckpoint() {
        return checkpoints.length > 0 ? checkpoints[checkpoints.length - 1] : null;
    }

    // =========================================================
    // CONTROL DE TIMERS
    // =========================================================

    /**
     * Delay manejado (que respeta pausas)
     * @param {number} ms - Milisegundos
     * @returns {Promise<void>}
     */
    function delay(ms) {
        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                const idx = activeTimers.timeouts.indexOf(timeoutId);
                if (idx > -1) activeTimers.timeouts.splice(idx, 1);
                resolve();
            }, ms);

            activeTimers.timeouts.push(timeoutId);
        });
    }

    /**
     * Delay inteligente que respeta pausas
     * @param {number} ms - Milisegundos
     * @returns {Promise<void>}
     */
    async function smartDelay(ms) {
        const start = Date.now();

        while (Date.now() - start < ms) {
            await waitIfPaused();

            if (forceStop) break;

            // Esperar un poco antes de volver a checar pausa
            await delay(50);
        }
    }

    /**
     * Crea un interval que respeta pausas
     * @param {Function} callback - Función a ejecutar
     * @param {number} ms - Intervalo en milisegundos
     * @returns {number} ID del interval (para cancelación)
     */
    function createManagedInterval(callback, ms) {
        const intervalId = setInterval(async () => {
            if (!isPaused && !forceStop) {
                try {
                    await callback();
                } catch (err) {
                    console.error('[StateController] Error en interval:', err);
                }
            }
        }, ms);

        activeTimers.intervals.push(intervalId);
        return intervalId;
    }

    /**
     * Cancela un interval
     * @param {number} intervalId
     */
    function cancelInterval(intervalId) {
        clearInterval(intervalId);
        const idx = activeTimers.intervals.indexOf(intervalId);
        if (idx > -1) {
            activeTimers.intervals.splice(idx, 1);
        }
    }

    /**
     * Limpia TODOS los timers activos
     */
    function clearAllTimers() {
        activeTimers.intervals.forEach(id => clearInterval(id));
        activeTimers.timeouts.forEach(id => clearTimeout(id));

        activeTimers = { intervals: [], timeouts: [] };

        if (debugMode) {
            console.log('[StateController] All timers cleared');
        }
    }

    // =========================================================
    // INICIO Y FINALIZACIÓN
    // =========================================================

    /**
     * Inicia el controlador
     */
    function start() {
        setState(STATES.RUNNING);
        isPaused = false;
        forceStop = false;
        startTime = Date.now();
        checkpoints = [];

        if (debugMode) {
            console.log('[StateController] 🚀 Started');
        }
    }

    /**
     * Detiene y limpia todo
     */
    function stop() {
        forceStop = true;
        setState(STATES.COMPLETED);
        clearAllTimers();

        if (debugMode) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`[StateController] ⏹️ Stopped (${duration}s)`);
        }

        forceStop = false;
    }

    /**
     * Reinicia completamente
     */
    function restart() {
        stop();
        clearCheckpoints();
        start();

        if (debugMode) {
            console.log('[StateController] 🔄 Restarted');
        }
    }

    /**
     * Obtiene estadísticas de ejecución
     * @returns {Object} Objeto con stats
     */
    function getStats() {
        const elapsed = startTime ? Date.now() - startTime : 0;

        return {
            state: currentState,
            isPaused,
            elapsed: Math.round(elapsed / 1000),
            checkpointCount: checkpoints.length,
            activeIntervals: activeTimers.intervals.length,
            activeTimeouts: activeTimers.timeouts.length,
            lastCheckpoint: getLastCheckpoint(),
        };
    }

    // =========================================================
    // CONFIGURACIÓN Y DEBUG
    // =========================================================

    /**
     * Activa/desactiva el modo debug
     * @param {boolean} debug
     */
    function setDebugMode(debug) {
        debugMode = debug;
    }

    /**
     * Obtiene el modo debug
     * @returns {boolean}
     */
    function getDebugMode() {
        return debugMode;
    }

    // =========================================================
    // API PÚBLICA
    // =========================================================

    return {
        // Constantes
        STATES,

        // Control de estado
        setState,
        getState,
        isInState,

        // Pausa/Reanudación
        pause,
        resume,
        togglePause,
        getPausedStatus,
        waitIfPaused,

        // Checkpoints
        recordCheckpoint,
        getCheckpoints,
        clearCheckpoints,
        getLastCheckpoint,

        // Timers
        delay,
        smartDelay,
        createManagedInterval,
        cancelInterval,
        clearAllTimers,

        // Ciclo de vida
        start,
        stop,
        restart,
        getStats,

        // Debug
        setDebugMode,
        getDebugMode,
    };
})();

// Para uso en Node.js o TypeScript
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateController;
}
