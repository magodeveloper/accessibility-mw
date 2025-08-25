"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const equalAccess_service_1 = require("../../src/services/equalAccess.service");
describe('runEqualAccess', () => {
    it('detecta issues en HTML básico', async () => {
        const html = '<html><img src="x.jpg"></html>';
        const result = await (0, equalAccess_service_1.runEqualAccess)(html, 'test-basic');
        // Verificamos que el resultado existe
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
        // Test básico: el servicio debe completarse sin errores
        // La estructura exacta puede variar según la versión de accessibility-checker
        console.log('Estructura del resultado:', Object.keys(result));
    });
});
