# AlfBot NQA Extension - Core Utilities

---

Este repositorio es un extracto de las **utilidades core** que construí para automatizar la extracción y análisis de datos desde plataformas web. Nada de código inflado, solo las soluciones reales que uso en producción.

Originalmente desarrollé esto para **AlfBot-NQA** (un sistema de automatización para extraer conversaciones de chatbots y correlacionar métricas de consumo en tiempo real). El código creció, se estabilizó, y pensé: *"Esto es útil para cualquiera que necesite automatizar procesos web sin depender de librerías pesadas"*.

Entonces extraje, limpié y documenté lo más modular. Aquí está.

---

## Technical Stack

| Layer | Technology |
|-------|-----------|
| **Language** | Vanilla JavaScript (ES6+) |
| **Runtime** | Browser (Chrome Extension compatible), Node.js compatible |
| **APIs** | Native DOM, Chrome Extensions API, Intl API |
| **Dependencies** | Zero core deps (XLSX optional for Excel export) |
| **Patterns** | IIFE Modules, Promise-based async, Observer patterns |

---

## Retos Superados

### 1. **Date Format Chaos**
Usuarios escriben fechas de mil formas: "ayer", "3:45 p.m.", "lunes", "02/05/2026". Sin normalización, cualquier query a la API falla.

**Solución:** `DataTypeNormalizer` parsea todo a timestamps sin romper. Incluso detecta zonas horarias automáticamente.

### 2. **Long-Running Processes**
Los scraping de datos masivos tardan minutos. Si el usuario pausa o el navegador se cierra, todo se pierde.

**Solución:** `StateController` implementa máquina de estados + checkpoints. Pausas, reanudaciones, reintentos—todo preserva el estado.

### 3. **Logging Hell**
Debuggear automatización web es un infierno sin una UI dedicada. Console.log no te muestra timeline, niveles, o contexto.

**Solución:** `VanillaDebugger` renderiza logs estructurados en el DOM en tiempo real. Levels, timestamps, export a JSON/CSV.

### 4. **Data Export Fragmentation**
"Dame los datos en Excel", "En CSV", "En JSON". Formateos diferentes para cada formato, y cada uno rompe de formas distintas.

**Solución:** `ReportFormatter` unifica: un método para JSON limpio, CSV escapado, Excel con estilos. Grouping, aggregation, flattening—todo en una línea.

### 5. **DOM Manipulation Boilerplate**
Inyectar componentes, hojas de estilo, SVGs cachéados... terminabas escribiendo 200 líneas de setup que no tenía nada que ver con tu lógica.

**Solución:** `DOMInjector` abstrae todo. Load+inject HTML, CSS dinámico, esperar elementos, manipular clases y atributos—APIs limpias, sin ruido.

---

## Included Utilities

### 📅 **DataTypeNormalizer**
Convierte strings sueltos en datos estructurados.

```javascript
// Parsear cualquier formato de fecha
DataTypeNormalizer.parseFlexibleDate("ayer");           // → timestamp
DataTypeNormalizer.parseFlexibleDate("03:45 p.m.");    // → timestamp
DataTypeNormalizer.parseFlexibleDate("lunes");         // → timestamp
DataTypeNormalizer.parseFlexibleDate("15/03/2026");    // → timestamp

// Sanitizar texto sucio
DataTypeNormalizer.sanitizeText("   Hola   mundo  "); // → "Hola mundo"

// Extraer datos de contacto
DataTypeNormalizer.extractEmails("email@example.com");     // → ["email@example.com"]
DataTypeNormalizer.extractPhoneNumbers("+57 301 234 5678"); // → ["+57 301 234 5678"]

// Validar URLs
DataTypeNormalizer.isValidURL("https://example.com");  // → true
```

**Ideal para:** Procesar entrada de usuario, normalizar respuestas de API, filtrar datos.

---

### 🎛️ **StateController**
Máquina de estados para procesos automatizados con pausas, reanudaciones y control granular.

```javascript
// Ciclo de vida básico
StateController.start();
StateController.pause();      // Respeta pausas en todo async/await
StateController.resume();
StateController.stop();

// Checkpoints (hitos con progreso)
StateController.recordCheckpoint("Iniciando scraping...", 0);
StateController.recordCheckpoint("Extrayendo datos...", 50);
StateController.recordCheckpoint("✅ Completado", 100);

// Delays inteligentes que respetan pausas
await StateController.smartDelay(2000);

// Intervals manejados
const id = StateController.createManagedInterval(() => {
    console.log("Esto respeta pausas");
}, 1000);

// Ver estadísticas
StateController.getStats();        // { state, isPaused, elapsed, checkpointCount, ... }
StateController.getCheckpoints();  // Array de hitos registrados
```

**Ideal para:** Web scraping con pausa/reanudación, procesos batch, automatización con interfaz de usuario.

---

### 🐛 **VanillaDebugger**
Sistema de logging estructurado que renderiza en UI en tiempo real.

```javascript
// Inicializar
VanillaDebugger.enable();
VanillaDebugger.initUI('#log-container');

// Loguear con niveles
VanillaDebugger.info("Información general");
VanillaDebugger.success("Operación exitosa");
VanillaDebugger.warn("Precaución");
VanillaDebugger.error("Algo falló");

// Checkpoints (hitos importantes)
VanillaDebugger.checkpoint("Extracción completa", 100);

// Inyectar SVGs con caché
VanillaDebugger.injectSVG('.icon-loader', 'assets/loader.svg');
VanillaDebugger.injectSVGBatch({
    '.icon-1': 'path/to/svg1.svg',
    '.icon-2': 'path/to/svg2.svg',
});

// Exportar logs
const json = VanillaDebugger.exportLogsAsJSON();
const csv = VanillaDebugger.exportLogsAsCSV();
```

**Ideal para:** Debugging de extensiones Chrome, monitoreo de procesos largos, auditoría de ejecución.

---

### 📊 **ReportFormatter**
Generador de reportes en JSON, CSV, Excel con procesamiento de datos integrado.

```javascript
const data = [
    { name: 'María', messages: 45, credits: 1250.75 },
    { name: 'Juan', messages: 32, credits: 890.50 },
];

// Exportar en formatos
const json = ReportFormatter.toJSON(data);
const csv = ReportFormatter.toCSV(data);
const excel = ReportFormatter.toExcel(data, { sheetName: 'Report' });

// Descarga automática
ReportFormatter.quickExportJSON(data, 'reporte.json');
ReportFormatter.quickExportCSV(data, 'reporte.csv');
ReportFormatter.quickExportExcel(data, 'reporte');

// Procesamiento
ReportFormatter.groupByKey(data, 'name');           // Agrupar
ReportFormatter.calculateTotals(data, ['credits']); // Sumar columnas
ReportFormatter.filterData(data, r => r.messages > 40);  // Filtrar
ReportFormatter.transformData(data, r => ({ ...r, formatted: true })); // Mapear

// Formateo regional
ReportFormatter.formatNumber(1234.56, 2);  // → "1.234,56" (es-ES)
ReportFormatter.formatDate(Date.now());    // → "02/05/2026"
```

**Ideal para:** Exportar datos de scraping, generar reportes consolidados, integración con Excel/Sheets.

---

### 🧩 **DOMInjector**
Inyección de componentes HTML, CSS y SVGs dinámicamente sin boilerplate.

```javascript
// Cargar y inyectar componentes
await DOMInjector.loadAndInject('body', 'components/panel.html', 'append');

// Inyectar estilos
DOMInjector.injectCSS('styles/panel.css', 'panel-styles');
DOMInjector.injectInlineCSS('.my-class { color: red; }', 'inline-1');

// Manipulación de clases y atributos
DOMInjector.addClasses('.button', ['active', 'highlight']);
DOMInjector.removeClasses('.button', 'disabled');
DOMInjector.toggleClass('.button', 'focus');
DOMInjector.setAttributes('.button', { disabled: 'true', 'data-id': '123' });

// Estilos inline
DOMInjector.setStyles('.container', {
    backgroundColor: '#f0f0f0',
    display: 'flex',
    padding: '20px',
});

// Esperar elementos dinámicamente
const element = await DOMInjector.waitForElement('#loaded-element', 5000);

// Limpiar
DOMInjector.removeElement('.old-panel');
DOMInjector.clearAllInjectedStyles();
DOMInjector.clearComponentCache();
```

**Ideal para:** Extensiones de Chrome, inyección dinámica de UI, componentes cargados bajo demanda.

---

## Quick Start


### 1. Usar en HTML

```html
<!DOCTYPE html>
<html>
<head>
    <title>My App</title>
</head>
<body>
    <div id="app"></div>

    <!-- Cargar utilities en el orden que prefieras -->
    <script src="utilities/dataTypeNormalizer.js"></script>
    <script src="utilities/stateController.js"></script>
    <script src="utilities/vanillaDebugger.js"></script>
    <script src="utilities/reportFormatter.js"></script>
    <script src="utilities/domInjector.js"></script>

    <!-- Tu código -->
    <script src="app.js"></script>
</body>
</html>
```

### 2. Usar en Node.js

```javascript
// Requiere que los módulos exporten a module.exports (ya lo hacen)
const DataTypeNormalizer = require('./utilities/dataTypeNormalizer.js');
const ReportFormatter = require('./utilities/reportFormatter.js');

// Usar normalmente
const date = DataTypeNormalizer.parseFlexibleDate('02/05/2026');
```

### 3. Ejemplos en `/examples`

Mira los archivos en la carpeta `examples/` para casos de uso reales:

- `example-data-normalization.js` - Parsear fechas, sanitizar texto, extraer contactos
- `example-state-machine.js` - Automatización con pausas, checkpoints, manejo de tiempos
- `example-report-generation.js` - Exportar a JSON/CSV/Excel, procesar datos, agregaciones

---

## API Documentation

Cada módulo está **fully documented** con:

- Comentarios JSDoc en cada función
- Ejemplos de uso en los archivos de ejemplo
- Parámetros y tipos claramente especificados
- Manejo de errores incluido

Abre cualquier archivo `.js` en `utilities/` para ver la documentación completa.

---

## Philosophy

Este código sigue estos principios:

- **Vanilla JavaScript:** Sin dependencias externas (salvo XLSX opcional). IIFE modules, patrones nativos.
- **Modular:** Cada utilidad es independiente. Úsalas todas o solo la que necesites.
- **Clean Code:** Nombres descriptivos, funciones pequeñas, responsabilidad única.
- **Real-world tested:** Todo fue usado en producción para AlfBot. No es teoría.
- **Humanized:** Comentarios en español técnico/spanglish, código que lee como prosa.

---

## Performance Notes

- **Memory:** Cada módulo maneja su propio estado privado. No hay leaks conocidos.
- **Timers:** `StateController` limpia timers automáticamente en `stop()`.
- **SVG Cache:** `VanillaDebugger` cachea SVGs para evitar fetches repetidos.
- **CSV Parsing:** `ReportFormatter` maneja correctamente escapado de caracteres especiales.

---

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

(Usa ES6+ features como `Promise`, arrow functions, destructuring. Requiere JS moderno).

---
---

## Autor

**Miguel Ángel Fernández Ramírez**  
Desarrollador Full-Stack autodidacta | Colombia 🇨🇴

Si te gusta lo que ves, échale un ojo a mi LinkedIn para más proyectos o prueba el código en tu setup. Nada de hype, solo código que funciona.
[LinkedIn](https://www.linkedin.com/in/miguel-angel-fernandez-ramirez-67654a1aa) | [GitHub](https://github.com/LeugimF/Public)