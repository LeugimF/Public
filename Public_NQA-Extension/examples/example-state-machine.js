/**
 * EJEMPLO 2: State Machine & Flow Control
 * 
 * Cómo usar StateController para automatización con pausas,
 * checkpoints y control de progreso.
 * 
 * Caso de uso real:
 * - Web scraping con pausa/reanudación
 * - Automatización de procesos largos
 * - Procesamiento en batch con control granular
 */

// =========================================================
// SETUP
// =========================================================

// <script src="utilities/stateController.js"></script>

StateController.setDebugMode(true);

// =========================================================
// EJEMPLO 1: Control básico de estado
// =========================================================

console.log('=== BASIC STATE CONTROL ===\n');

StateController.start();
console.log('Current state:', StateController.getState());
// Output: "RUNNING"

StateController.pause();
console.log('After pause:', StateController.getState());
// Output: "PAUSED"

StateController.resume();
console.log('After resume:', StateController.getState());
// Output: "RUNNING"

StateController.stop();
console.log('After stop:', StateController.getState());
// Output: "COMPLETED"

// =========================================================
// EJEMPLO 2: Automatización con checkpoints
// =========================================================

console.log('\n=== AUTOMATION WITH CHECKPOINTS ===\n');

async function automatedScraping() {
    StateController.restart();
    StateController.recordCheckpoint('Iniciando scraping...', 0);

    // Simular pasos del proceso
    await StateController.smartDelay(500);
    StateController.recordCheckpoint('Autenticando...', 10);

    await StateController.smartDelay(500);
    StateController.recordCheckpoint('Navegando a datos...', 25);

    await StateController.smartDelay(500);
    StateController.recordCheckpoint('Extrayendo información...', 50);

    // Simular trabajo de procesamiento
    for (let i = 0; i < 5; i++) {
        await StateController.waitIfPaused(); // Respetar pausas
        await StateController.smartDelay(200);

        StateController.recordCheckpoint(`Procesando item ${i + 1}...`, 50 + (i * 10));

        if (StateController.getPausedStatus()) {
            console.log('⏸️ Paused during processing');
        }
    }

    StateController.recordCheckpoint('Generando reporte...', 90);
    await StateController.smartDelay(500);

    StateController.recordCheckpoint('✅ Completado', 100);
    StateController.stop();

    // Mostrar historial
    console.log('\n📊 Execution history:');
    StateController.getCheckpoints().forEach((cp, idx) => {
        console.log(`  ${idx + 1}. [${cp.progress}%] ${cp.label} (${cp.duration}ms)`);
    });

    // Estadísticas
    console.log('\n📈 Stats:', StateController.getStats());
}

// Ejecutar con pausa manual
(async () => {
    const scrapeTask = automatedScraping();

    // Simular pausa después de 2 segundos
    setTimeout(() => {
        console.log('\n⏸️ User pressed pause...');
        StateController.pause();
    }, 2000);

    // Simular reanudación después de 3 segundos
    setTimeout(() => {
        console.log('▶️ User pressed resume...');
        StateController.resume();
    }, 3000);

    await scrapeTask;
})();

// =========================================================
// EJEMPLO 3: Intervals manejados (respetan pausas)
// =========================================================

console.log('\n\n=== MANAGED INTERVALS ===\n');

function setupMonitoring() {
    StateController.start();

    let counter = 0;

    // Crear un interval que respeta pausas
    const monitorId = StateController.createManagedInterval(async () => {
        counter++;
        console.log(`Monitor tick #${counter}, state: ${StateController.getState()}`);

        if (counter >= 5) {
            StateController.cancelInterval(monitorId);
            console.log('Monitor stopped');
        }
    }, 1000);

    // Simular pausa
    setTimeout(() => {
        StateController.pause();
        console.log('Monitor paused');
    }, 2500);

    // Simular reanudación
    setTimeout(() => {
        StateController.resume();
        console.log('Monitor resumed');
    }, 4000);
}

// setupMonitoring(); // Descomentar para ejecutar

// =========================================================
// EJEMPLO 4: Retries con delays inteligentes
// =========================================================

console.log('\n\n=== RETRY LOGIC WITH SMART DELAYS ===\n');

async function fetchWithRetry(url, maxRetries = 3) {
    let attempts = 0;

    while (attempts < maxRetries) {
        try {
            // Espera que respete pausas
            if (attempts > 0) {
                const delayMs = Math.pow(2, attempts) * 1000; // Exponential backoff
                console.log(`Retrying after ${delayMs}ms...`);
                await StateController.smartDelay(delayMs);
            }

            attempts++;

            StateController.recordCheckpoint(`Attempt ${attempts}: Fetching ${url}`, Math.floor((attempts / maxRetries) * 100));

            // Simular fetch
            console.log(`✓ Request successful on attempt ${attempts}`);
            return { success: true, attempt: attempts };

        } catch (error) {
            if (attempts >= maxRetries) {
                console.error(`✗ Failed after ${maxRetries} attempts`);
                throw error;
            }
        }
    }
}

// fetchWithRetry('https://api.example.com/data');

// =========================================================
// EJEMPLO 5: Máquina de estados más compleja
// =========================================================

console.log('\n\n=== COMPLEX STATE MACHINE ===\n');

class ProcessAutomation {
    constructor(name) {
        this.name = name;
        this.progress = 0;
    }

    async execute() {
        StateController.restart();

        const steps = [
            { name: 'Initialize', duration: 500, progress: 10 },
            { name: 'Validate', duration: 800, progress: 25 },
            { name: 'Fetch Data', duration: 1500, progress: 50 },
            { name: 'Process', duration: 1000, progress: 75 },
            { name: 'Finalize', duration: 500, progress: 100 },
        ];

        for (const step of steps) {
            // Respetar pausas en cada paso
            await StateController.waitIfPaused();

            // Si fue detenido a la fuerza, salir
            if (StateController.isInState(StateController.STATES.COMPLETED)) {
                break;
            }

            StateController.recordCheckpoint(`${this.name}: ${step.name}`, step.progress);
            await StateController.smartDelay(step.duration);

            console.log(`✓ ${step.name} done (${step.progress}%)`);
        }

        StateController.stop();
        return StateController.getStats();
    }
}

// // Usar la clase
// const automation = new ProcessAutomation('DataPipeline');
// automation.execute().then(stats => {
//     console.log('\n✅ Process completed:', stats);
// });

// =========================================================
// EJEMPLO 6: Cancelación y limpieza
// =========================================================

console.log('\n\n=== CLEANUP & CANCELLATION ===\n');

async function robustProcess() {
    StateController.restart();

    // Crear varios timers
    const interval1 = StateController.createManagedInterval(() => {
        console.log('Background task 1');
    }, 500);

    const interval2 = StateController.createManagedInterval(() => {
        console.log('Background task 2');
    }, 700);

    console.log('Timers active:', StateController.getStats());

    // Esperar y luego limpiar
    await StateController.smartDelay(3000);

    console.log('Cleaning up...');
    StateController.clearAllTimers();
    StateController.stop();

    console.log('Final state:', StateController.getStats());
}

// robustProcess();

// =========================================================
// EJEMPLO 7: Progreso visual (para UI)
// =========================================================

console.log('\n\n=== PROGRESS VISUALIZATION ===\n');

function renderProgressBar(stats) {
    const percent = stats.lastCheckpoint?.progress || 0;
    const filled = Math.floor(percent / 5); // 20 caracteres de ancho
    const empty = 20 - filled;

    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    console.log(`[${bar}] ${percent}%`);
}

async function processWithProgressBar() {
    StateController.restart();

    for (let i = 0; i <= 100; i += 10) {
        StateController.recordCheckpoint(`Processing... (${i}%)`, i);

        renderProgressBar(StateController.getStats());

        await StateController.smartDelay(300);
    }

    StateController.stop();
}

// processWithProgressBar();
