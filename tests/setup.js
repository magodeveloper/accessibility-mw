"use strict";
// Setup para tests de Jest
process.env.NODE_ENV = 'test';
// Variables de entorno por defecto para tests
if (!process.env.ANALYSIS_API_URL) {
    process.env.ANALYSIS_API_URL = 'http://localhost:3002';
}
// Configuración para Playwright en tests
process.env.PLAYWRIGHT_BROWSERS_PATH = '0';
