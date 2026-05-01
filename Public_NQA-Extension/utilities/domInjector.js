/**
 * domInjector.js
 * 
 * Utilidad para inyectar componentes HTML, CSS y JS dinámicamente en el DOM.
 * Perfecto para extensiones de Chrome o aplicaciones web que necesitan
 * cargar componentes sobre la marcha sin contaminar el HTML base.
 * 
 * Características:
 * - Carga componentes desde HTML externo
 * - Inyecta CSS dinamicamente
 * - Control del ciclo de vida (mount/unmount)
 * - Soporte para templates con variables
 * 
 * Autor: Miguel Ángel Fernández Ramírez
 * Licencia: MIT
 */

const DOMInjector = (function () {
    // Estado privado
    let debugMode = false;
    const componentCache = {};
    const injectedStyles = new Set();

    // =========================================================
    // INYECCIÓN DE COMPONENTES HTML
    // =========================================================

    /**
     * Carga un componente HTML desde una URL
     * @param {string} url - URL del archivo HTML
     * @returns {Promise<string>} HTML content
     */
    async function loadHTMLComponent(url) {
        try {
            // Si es una ruta de extensión de Chrome
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                url = chrome.runtime.getURL(url);
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${url}`);
            }

            const html = await response.text();

            // Cachear para usos posteriores
            componentCache[url] = html;

            if (debugMode) {
                console.log(`[DOMInjector] Loaded component: ${url}`);
            }

            return html;
        } catch (err) {
            console.error(`[DOMInjector] Error loading component: ${url}`, err);
            throw err;
        }
    }

    /**
     * Inyecta un componente HTML en el DOM
     * @param {string|Element} container - Selector CSS o elemento
     * @param {string} htmlContent - Contenido HTML
     * @param {string} position - 'replace' | 'append' | 'prepend' | 'before' | 'after'
     * @returns {Element} Elemento inyectado
     */
    function injectHTML(container, htmlContent, position = 'append') {
        let targetElement;

        if (typeof container === 'string') {
            targetElement = document.querySelector(container);
        } else {
            targetElement = container;
        }

        if (!targetElement) {
            throw new Error(`[DOMInjector] Container not found`);
        }

        const wrapper = document.createElement('div');
        wrapper.innerHTML = htmlContent.trim();

        const injected = wrapper.firstElementChild || wrapper;

        switch (position.toLowerCase()) {
            case 'replace':
                targetElement.replaceWith(injected);
                break;
            case 'append':
                targetElement.appendChild(injected);
                break;
            case 'prepend':
                targetElement.insertBefore(injected, targetElement.firstChild);
                break;
            case 'before':
                targetElement.parentNode.insertBefore(injected, targetElement);
                break;
            case 'after':
                targetElement.parentNode.insertBefore(injected, targetElement.nextSibling);
                break;
            default:
                throw new Error(`[DOMInjector] Invalid position: ${position}`);
        }

        if (debugMode) {
            console.log(`[DOMInjector] Injected HTML (${position})`);
        }

        return injected;
    }

    /**
     * Carga y luego inyecta un componente HTML en una sola llamada
     * @param {string|Element} container - Selector CSS o elemento
     * @param {string} componentUrl - URL del archivo HTML
     * @param {string} position - Posición de inyección
     * @returns {Promise<Element>}
     */
    async function loadAndInject(container, componentUrl, position = 'append') {
        try {
            const html = await loadHTMLComponent(componentUrl);
            return injectHTML(container, html, position);
        } catch (err) {
            console.error(`[DOMInjector] Error in loadAndInject:`, err);
            throw err;
        }
    }

    // =========================================================
    // INYECCIÓN DE ESTILOS CSS
    // =========================================================

    /**
     * Inyecta un archivo CSS dinámicamente en el documento
     * @param {string} cssPath - Ruta del archivo CSS (puede ser URL de extensión)
     * @param {string} id - ID único para evitar duplicados
     * @returns {HTMLLinkElement} Elemento link creado
     */
    function injectCSS(cssPath, id = null) {
        // Evitar inyectar el mismo CSS dos veces
        if (injectedStyles.has(cssPath)) {
            if (debugMode) {
                console.log(`[DOMInjector] CSS already injected: ${cssPath}`);
            }
            return document.querySelector(`link[href*="${cssPath}"]`);
        }

        let href = cssPath;

        // Si es una ruta de extensión de Chrome
        if (typeof chrome !== 'undefined' && chrome.runtime && !cssPath.startsWith('http')) {
            href = chrome.runtime.getURL(cssPath);
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;

        if (id) {
            link.id = id;
            link.setAttribute('data-injected', 'true');
        }

        document.head.appendChild(link);
        injectedStyles.add(cssPath);

        if (debugMode) {
            console.log(`[DOMInjector] CSS injected: ${cssPath}`);
        }

        return link;
    }

    /**
     * Inyecta CSS inline directamente
     * @param {string} cssContent - Contenido CSS
     * @param {string} id - ID único del style tag
     * @returns {HTMLStyleElement}
     */
    function injectInlineCSS(cssContent, id = null) {
        const style = document.createElement('style');

        if (id) {
            style.id = id;
        }

        style.textContent = cssContent;
        document.head.appendChild(style);

        if (debugMode) {
            console.log(`[DOMInjector] Inline CSS injected${id ? `: ${id}` : ''}`);
        }

        return style;
    }

    // =========================================================
    // REMOCIÓN Y LIMPIEZA
    // =========================================================

    /**
     * Remueve un elemento del DOM
     * @param {string|Element} target - Selector CSS o elemento
     */
    function removeElement(target) {
        let element;

        if (typeof target === 'string') {
            element = document.querySelector(target);
        } else {
            element = target;
        }

        if (element) {
            element.remove();

            if (debugMode) {
                console.log(`[DOMInjector] Element removed`);
            }
        }
    }

    /**
     * Remueve todos los estilos inyectados
     */
    function clearAllInjectedStyles() {
        document.querySelectorAll('link[data-injected="true"], style[data-injected="true"]').forEach(el => {
            el.remove();
        });

        injectedStyles.clear();

        if (debugMode) {
            console.log(`[DOMInjector] All injected styles removed`);
        }
    }

    /**
     * Limpia el caché de componentes
     */
    function clearComponentCache() {
        Object.keys(componentCache).forEach(key => delete componentCache[key]);

        if (debugMode) {
            console.log(`[DOMInjector] Component cache cleared`);
        }
    }

    // =========================================================
    // MANIPULACIÓN AVANZADA
    // =========================================================

    /**
     * Aplica clases CSS a un elemento
     * @param {string|Element} target
     * @param {string|string[]} classes - Clase o array de clases
     */
    function addClasses(target, classes) {
        let element;

        if (typeof target === 'string') {
            element = document.querySelector(target);
        } else {
            element = target;
        }

        if (!element) return;

        if (typeof classes === 'string') {
            element.classList.add(classes);
        } else if (Array.isArray(classes)) {
            element.classList.add(...classes);
        }
    }

    /**
     * Remueve clases CSS de un elemento
     * @param {string|Element} target
     * @param {string|string[]} classes
     */
    function removeClasses(target, classes) {
        let element;

        if (typeof target === 'string') {
            element = document.querySelector(target);
        } else {
            element = target;
        }

        if (!element) return;

        if (typeof classes === 'string') {
            element.classList.remove(classes);
        } else if (Array.isArray(classes)) {
            element.classList.remove(...classes);
        }
    }

    /**
     * Alterna clase CSS
     * @param {string|Element} target
     * @param {string} className
     */
    function toggleClass(target, className) {
        let element;

        if (typeof target === 'string') {
            element = document.querySelector(target);
        } else {
            element = target;
        }

        if (element) {
            element.classList.toggle(className);
        }
    }

    /**
     * Establece atributos en un elemento
     * @param {string|Element} target
     * @param {Object} attributes - { attr: value, ... }
     */
    function setAttributes(target, attributes) {
        let element;

        if (typeof target === 'string') {
            element = document.querySelector(target);
        } else {
            element = target;
        }

        if (!element) return;

        Object.entries(attributes).forEach(([key, value]) => {
            if (value === null) {
                element.removeAttribute(key);
            } else {
                element.setAttribute(key, value);
            }
        });
    }

    /**
     * Establece propiedades CSS en línea
     * @param {string|Element} target
     * @param {Object} styles - { property: value, ... }
     */
    function setStyles(target, styles) {
        let element;

        if (typeof target === 'string') {
            element = document.querySelector(target);
        } else {
            element = target;
        }

        if (!element) return;

        Object.entries(styles).forEach(([key, value]) => {
            element.style[key] = value;
        });
    }

    /**
     * Espera a que un elemento exista en el DOM
     * @param {string} selector
     * @param {number} timeout - Milisegundos
     * @returns {Promise<Element|null>}
     */
    function waitForElement(selector, timeout = 5000) {
        return new Promise((resolve) => {
            const start = Date.now();

            const checkElement = () => {
                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                } else if (Date.now() - start >= timeout) {
                    if (debugMode) {
                        console.warn(`[DOMInjector] Timeout waiting for: ${selector}`);
                    }
                    resolve(null);
                } else {
                    setTimeout(checkElement, 100);
                }
            };

            checkElement();
        });
    }

    // =========================================================
    // CONFIGURACIÓN
    // =========================================================

    /**
     * Activa/desactiva debug mode
     * @param {boolean} debug
     */
    function setDebugMode(debug) {
        debugMode = debug;
    }

    /**
     * Obtiene estado de debug
     * @returns {boolean}
     */
    function getDebugMode() {
        return debugMode;
    }

    // =========================================================
    // API PÚBLICA
    // =========================================================

    return {
        // Carga de componentes
        loadHTMLComponent,
        injectHTML,
        loadAndInject,

        // CSS
        injectCSS,
        injectInlineCSS,

        // Limpieza
        removeElement,
        clearAllInjectedStyles,
        clearComponentCache,

        // Manipulación
        addClasses,
        removeClasses,
        toggleClass,
        setAttributes,
        setStyles,

        // Esperas
        waitForElement,

        // Config
        setDebugMode,
        getDebugMode,
    };
})();

// Para uso en Node.js o TypeScript
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DOMInjector;
}
