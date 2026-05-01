/**
 * EJEMPLO 3: Report Generation
 * 
 * Cómo usar ReportFormatter para exportar datos en múltiples formatos
 * (JSON, CSV, Excel).
 * 
 * Caso de uso real:
 * - Exportar datos de scraping
 * - Generar reportes automáticos
 * - Integración con Excel/Google Sheets
 */

// =========================================================
// SETUP
// =========================================================

// <script src="utilities/reportFormatter.js"></script>

ReportFormatter.setLocale('es-ES');
ReportFormatter.setDebugMode(true);

// =========================================================
// DATOS DE EJEMPLO
// =========================================================

const sampleData = [
    {
        id: 1,
        name: 'María García',
        email: 'maria@example.com',
        bot: 'CustomerBot',
        messagesCount: 45,
        creditUsed: 1250.75,
        date: Date.now() - 86400000, // Ayer
    },
    {
        id: 2,
        name: 'Juan López',
        email: 'juan@example.com',
        bot: 'SalesBot',
        messagesCount: 32,
        creditUsed: 890.50,
        date: Date.now() - 172800000, // Hace 2 días
    },
    {
        id: 3,
        name: 'Ana Martínez',
        email: 'ana@example.com',
        bot: 'CustomerBot',
        messagesCount: 58,
        creditUsed: 2100.30,
        date: Date.now(),
    },
];

// =========================================================
// EJEMPLO 1: Exportar a JSON
// =========================================================

console.log('=== JSON EXPORT ===\n');

const jsonString = ReportFormatter.toJSON(sampleData, {
    prettyPrint: true,
    includeMetadata: true,
});

console.log(jsonString);
// Output:
// {
//   "metadata": {
//     "generatedAt": "2026-05-02T10:30:00.000Z",
//     "timezone": "Europe/Madrid",
//     "dataFormat": "array",
//     "recordCount": 3
//   },
//   "data": [ ... ]
// }

// =========================================================
// EJEMPLO 2: Exportar a CSV
// =========================================================

console.log('\n=== CSV EXPORT ===\n');

const csvString = ReportFormatter.toCSV(sampleData, {
    headers: ['id', 'name', 'email', 'bot', 'messagesCount', 'creditUsed'],
    delimiter: ',',
    includeTimestamp: true,
});

console.log(csvString);
// Output:
// id,name,email,bot,messagesCount,creditUsed
// 1,"María García",maria@example.com,CustomerBot,45,1250.75
// 2,"Juan López",juan@example.com,SalesBot,32,890.50
// 3,"Ana Martínez",ana@example.com,CustomerBot,58,2100.30

// =========================================================
// EJEMPLO 3: Procesamiento antes de exportar
// =========================================================

console.log('\n=== DATA PROCESSING BEFORE EXPORT ===\n');

// Filtrar solo registros con más de 40 mensajes
const filtered = ReportFormatter.filterData(
    sampleData,
    item => item.messagesCount > 40
);

console.log('Filtered records:', filtered.length);
// Output: 2 (María y Ana)

// Transformar datos (agregar campos calculados)
const transformed = ReportFormatter.transformData(
    sampleData,
    item => ({
        ...item,
        dateReadable: ReportFormatter.formatDate(item.date),
        creditFormatted: ReportFormatter.formatNumber(item.creditUsed, 2),
        costPerMessage: ReportFormatter.formatNumber(item.creditUsed / item.messagesCount, 3),
    })
);

console.log('Transformed data:', JSON.stringify(transformed[0], null, 2));
// Output:
// {
//   "id": 1,
//   "name": "María García",
//   "dateReadable": "01/05/2026",
//   "creditFormatted": "1.250,75",
//   "costPerMessage": "27,750"
// }

// =========================================================
// EJEMPLO 4: Análisis y agregaciones
// =========================================================

console.log('\n=== DATA ANALYSIS ===\n');

// Agrupar por bot
const groupedByBot = ReportFormatter.groupByKey(sampleData, 'bot');

console.log('Grouped by bot:');
Object.entries(groupedByBot).forEach(([bot, records]) => {
    console.log(`  ${bot}: ${records.length} records`);
});
// Output:
//   CustomerBot: 2 records
//   SalesBot: 1 record

// Calcular totales
const totals = ReportFormatter.calculateTotals(sampleData, ['messagesCount', 'creditUsed']);
console.log('\nTotals:');
console.log(`  Total messages: ${totals.messagesCount}`);
console.log(`  Total credits: ${ReportFormatter.formatNumber(totals.creditUsed)}`);
// Output:
//   Total messages: 135
//   Total credits: 4.241,55

// =========================================================
// EJEMPLO 5: Exportar por grupo (múltiples hojas en Excel)
// =========================================================

console.log('\n=== GROUPED REPORT ===\n');

const grouped = ReportFormatter.groupByKey(sampleData, 'bot');

// Para cada grupo, crear un CSV
Object.entries(grouped).forEach(([botName, records]) => {
    const csv = ReportFormatter.toCSV(records);
    console.log(`\n${botName} Report:`);
    console.log(csv);
});

// =========================================================
// EJEMPLO 6: Descarga de archivos (en navegador)
// =========================================================

console.log('\n=== FILE DOWNLOADS (BROWSER ONLY) ===\n');

// Estas funciones solo funcionan en un navegador con DOM

function downloadReports() {
    // JSON
    ReportFormatter.quickExportJSON(sampleData, 'reporte_chats.json');

    // CSV
    ReportFormatter.quickExportCSV(sampleData, 'reporte_chats.csv');

    // Excel (requiere XLSX cargado)
    ReportFormatter.quickExportExcel(sampleData, 'reporte_chats');
}

// downloadReports(); // Descomentar en navegador

// =========================================================
// EJEMPLO 7: Caso real - Reporte consolidado
// =========================================================

console.log('\n\n=== REAL-WORLD: CONSOLIDATED REPORT ===\n');

function generateConsolidatedReport(rawData) {
    // 1. Limpiar y transformar
    const processed = ReportFormatter.transformData(
        rawData,
        item => ({
            ...item,
            dateReadable: ReportFormatter.formatDate(item.date),
            creditFormatted: ReportFormatter.formatNumber(item.creditUsed),
            isHighUser: item.messagesCount > 50,
        })
    );

    // 2. Calcular agregados
    const grouped = ReportFormatter.groupByKey(processed, 'bot');
    const summary = {};

    Object.entries(grouped).forEach(([bot, records]) => {
        summary[bot] = {
            recordCount: records.length,
            totalMessages: records.reduce((sum, r) => sum + r.messagesCount, 0),
            totalCredits: records.reduce((sum, r) => sum + r.creditUsed, 0),
            avgCreditPerMessage: records.reduce((sum, r) => sum + r.creditUsed, 0) /
                records.reduce((sum, r) => sum + r.messagesCount, 0),
        };
    });

    // 3. Formatear para visualización
    const report = {
        generatedAt: new Date().toISOString(),
        summary,
        details: processed,
        csv: ReportFormatter.toCSV(processed),
        json: ReportFormatter.toJSON(processed),
    };

    return report;
}

const consolidatedReport = generateConsolidatedReport(sampleData);

console.log('Summary:');
Object.entries(consolidatedReport.summary).forEach(([bot, stats]) => {
    console.log(`\n  ${bot}:`);
    console.log(`    Records: ${stats.recordCount}`);
    console.log(`    Total Messages: ${stats.totalMessages}`);
    console.log(`    Total Credits: ${ReportFormatter.formatNumber(stats.totalCredits)}`);
    console.log(`    Avg per message: ${ReportFormatter.formatNumber(stats.avgCreditPerMessage, 3)}`);
});

// =========================================================
// EJEMPLO 8: Formateo numérico personalizado
// =========================================================

console.log('\n\n=== NUMBER FORMATTING ===\n');

ReportFormatter.setLocale('es-ES'); // Español: 1.234,56

const numbers = [1234.5678, 42, 999999.99, 0.5];

numbers.forEach(num => {
    console.log(`${num} → ${ReportFormatter.formatNumber(num, 2)}`);
});
// Output (Spanish locale):
// 1234.5678 → 1.234,57
// 42 → 42,00
// 999999.99 → 999.999,99
// 0.5 → 0,50

// =========================================================
// EJEMPLO 9: Flattening de objetos anidados
// =========================================================

console.log('\n\n=== FLATTENING NESTED OBJECTS ===\n');

const nestedData = [
    {
        id: 1,
        user: {
            name: 'María',
            email: 'maria@example.com',
            profile: {
                role: 'admin',
            },
        },
        metrics: {
            messages: 45,
            credits: 1250.75,
        },
    },
];

const flattened = ReportFormatter.transformData(
    nestedData,
    item => ReportFormatter.flattenObject(item)
);

console.log('Flattened:', JSON.stringify(flattened[0], null, 2));
// Output:
// {
//   "id": 1,
//   "user.name": "María",
//   "user.email": "maria@example.com",
//   "user.profile.role": "admin",
//   "metrics.messages": 45,
//   "metrics.credits": 1250.75
// }

// Perfecto para exportar a CSV/Excel
const flatCSV = ReportFormatter.toCSV(flattened);
console.log('\nFlattened CSV:');
console.log(flatCSV);
