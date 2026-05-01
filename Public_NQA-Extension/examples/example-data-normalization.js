/**
 * EJEMPLO 1: Date & Text Normalization
 * 
 * Cómo usar DataTypeNormalizer para interpretar múltiples formatos de fechas
 * y sanitizar texto de entrada de usuario.
 * 
 * Caso de uso real:
 * - Usuario escribe "ayer" o "02/05/2026" en un input
 * - Tu app lo procesa y genera queries a una API
 */

// =========================================================
// SETUP
// =========================================================

// Asume que DataTypeNormalizer está cargado previamente
// <script src="utilities/dataTypeNormalizer.js"></script>

// Configurar zona horaria (opcional, default: America/Bogota)
DataTypeNormalizer.setTimezone('America/Bogota');
DataTypeNormalizer.setDebugMode(true);

// =========================================================
// EJEMPLO 1: Parsear múltiples formatos de fecha
// =========================================================

console.log('=== DATE PARSING EXAMPLES ===\n');

// Formato AM/PM
let timestamp1 = DataTypeNormalizer.parseFlexibleDate('03:45 p.m.');
console.log('Parsed "03:45 p.m.": ', DataTypeNormalizer.formatDateReadable(timestamp1, true));
// Output: 02/05/2026, 15:45

// Palabra clave "ayer"
let timestamp2 = DataTypeNormalizer.parseFlexibleDate('ayer');
console.log('Parsed "ayer": ', DataTypeNormalizer.formatDateReadable(timestamp2));
// Output: 01/05/2026

// Día de la semana
let timestamp3 = DataTypeNormalizer.parseFlexibleDate('lunes');
console.log('Parsed "lunes": ', DataTypeNormalizer.formatDateReadable(timestamp3));
// Output: 28/04/2026

// Fecha completa
let timestamp4 = DataTypeNormalizer.parseFlexibleDate('15/03/2026');
console.log('Parsed "15/03/2026": ', DataTypeNormalizer.formatDateReadable(timestamp4));
// Output: 15/03/2026

// =========================================================
// EJEMPLO 2: Filtrar y validar fechas
// =========================================================

console.log('\n=== DATE RANGE FILTERING ===\n');

// Simulemos que el usuario quiere ver datos entre dos fechas
function getDataInRange(startText, endText) {
    const startTs = DataTypeNormalizer.parseFlexibleDate(startText);
    const endTs = DataTypeNormalizer.parseFlexibleDate(endText);

    if (!startTs || !endTs) {
        console.error('Invalid date range');
        return null;
    }

    return {
        startDate: DataTypeNormalizer.formatDateReadable(startTs),
        endDate: DataTypeNormalizer.formatDateReadable(endTs),
        startTimestamp: startTs,
        endTimestamp: endTs,
        daysInRange: Math.ceil((endTs - startTs) / (1000 * 60 * 60 * 24)),
    };
}

let range = getDataInRange('ayer', '30/04/2026');
console.log('Date range:', range);
// Output:
// {
//   startDate: "01/05/2026",
//   endDate: "30/04/2026",
//   startTimestamp: ...,
//   endTimestamp: ...,
//   daysInRange: 1
// }

// =========================================================
// EJEMPLO 3: Sanitizar texto de entrada
// =========================================================

console.log('\n=== TEXT SANITIZATION ===\n');

// Texto "sucio" del usuario
const dirtyText = '   Hola   mundo    \n\n  foo@bar.com  ';

// Limpiar
const cleanText = DataTypeNormalizer.sanitizeText(dirtyText);
console.log('Before:', JSON.stringify(dirtyText));
console.log('After: ', JSON.stringify(cleanText));
// Output:
// Before: "   Hola   mundo    \n\n  foo@bar.com  "
// After:  "Hola mundo foo@bar.com"

// =========================================================
// EJEMPLO 4: Extraer datos de contacto
// =========================================================

console.log('\n=== CONTACT EXTRACTION ===\n');

const textWithContacts = `
    Por favor contacta a María García (maria.garcia@example.com)
    o llama al +57 301 234 5678 para más info.
`;

// Extraer emails
const emails = DataTypeNormalizer.extractEmails(textWithContacts);
console.log('Emails found:', emails);
// Output: ["maria.garcia@example.com"]

// Extraer teléfonos
const phones = DataTypeNormalizer.extractPhoneNumbers(textWithContacts);
console.log('Phones found:', phones);
// Output: ["+57 301 234 5678"]

// =========================================================
// EJEMPLO 5: Validar URLs
// =========================================================

console.log('\n=== URL VALIDATION ===\n');

const urls = [
    'https://www.example.com',
    'not-a-url',
    'http://localhost:3000/api',
    'ftp://invalid',
];

urls.forEach(url => {
    const isValid = DataTypeNormalizer.isValidURL(url);
    console.log(`${url}: ${isValid ? '✅ valid' : '❌ invalid'}`);
});

// =========================================================
// EJEMPLO 6: Procesamiento de entrada en formulario
// =========================================================

console.log('\n=== FORM PROCESSING ===\n');

// Simulemos un form de filtrado
function processFilterForm(formData) {
    // Limpiar inputs
    const botName = DataTypeNormalizer.sanitizeText(formData.botName);
    const startDate = DataTypeNormalizer.parseFlexibleDate(formData.dateStart);
    const endDate = DataTypeNormalizer.parseFlexibleDate(formData.dateEnd);

    // Validar
    if (!botName) {
        console.error('Bot name is required');
        return null;
    }

    if (!startDate || !endDate) {
        console.error('Invalid dates');
        return null;
    }

    if (startDate > endDate) {
        console.error('Start date must be before end date');
        return null;
    }

    // Retornar datos listos para API
    return {
        botName,
        startDate: DataTypeNormalizer.formatDateReadable(startDate),
        endDate: DataTypeNormalizer.formatDateReadable(endDate),
        startTimestamp: startDate,
        endTimestamp: endDate,
    };
}

const filterInput = {
    botName: '  Mi Bot Favorito  ',
    dateStart: 'lunes',
    dateEnd: 'hoy', // <- Esto no parseará, es un ejemplo fallido
};

const result = processFilterForm(filterInput);
console.log('Processed form:', result); // null porque 'hoy' no es un formato soportado

// Pero si arreglamos la fecha...
filterInput.dateEnd = '02/05/2026';
const resultFixed = processFilterForm(filterInput);
console.log('Processed form (fixed):', resultFixed);
// Output:
// {
//   botName: "Mi Bot Favorito",
//   startDate: "28/04/2026",
//   endDate: "02/05/2026",
//   startTimestamp: ...,
//   endTimestamp: ...
// }

// =========================================================
// EJEMPLO 7: Caso real - Procesar respuesta de API
// =========================================================

console.log('\n=== REAL-WORLD: PROCESS API RESPONSE ===\n');

// Simulemos datos de una API que necesitan limpieza
const apiResponse = [
    {
        id: 1,
        name: '   José María   ',
        email: 'jose@example.com',
        dateCreated: '01/05/2026',
    },
    {
        id: 2,
        name: 'Ana García',
        email: 'ana@example.com',
        dateCreated: '30/04/2026',
    },
];

// Procesar y normalizar
const normalized = apiResponse.map(item => ({
    ...item,
    name: DataTypeNormalizer.sanitizeText(item.name),
    dateCreated: DataTypeNormalizer.parseFlexibleDate(item.dateCreated),
    dateReadable: DataTypeNormalizer.formatDateReadable(
        DataTypeNormalizer.parseFlexibleDate(item.dateCreated)
    ),
}));

console.log('Normalized API response:', normalized);
