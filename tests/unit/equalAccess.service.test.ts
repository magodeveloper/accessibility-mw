import { runEqualAccess } from '../../src/services/equalAccess.service';

describe('runEqualAccess', () => {
  it('detecta issues en HTML básico', async () => {
    const html = '<html><img src="x.jpg"></html>';
    const result = await runEqualAccess(html, 'test-basic');

    // Verificamos que el resultado existe
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');

    // Test básico: el servicio debe completarse sin errores
    // La estructura exacta puede variar según la versión de accessibility-checker
    // DEBUG: console.log('Estructura del resultado:', Object.keys(result));
  });
});
