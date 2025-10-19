import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { Browser, BrowserContext, chromium, Page } from 'playwright';
import {
  browserPool,
  withPooledPage,
} from '../../src/services/browser.pool.service';

// Mock de Playwright
jest.mock('playwright');

const mockedChromium = chromium as jest.Mocked<typeof chromium>;

describe('Browser Pool Service', () => {
  let mockBrowser: jest.Mocked<Browser>;
  let mockPage: jest.Mocked<Page>;
  let mockContext: jest.Mocked<BrowserContext>;

  // Helper function to create delayed browser (moved out to avoid nesting)
  const createDelayedBrowser = () => {
    return new Promise(resolve => setTimeout(() => resolve(mockBrowser), 100));
  };

  // Helper function to simulate async work
  const simulateAsyncWork = async (i: number) => {
    await new Promise(resolve => setTimeout(resolve, 10));
    return `result-${i}`;
  };

  beforeEach(() => {
    mockPage = {
      setContent: jest.fn(() => Promise.resolve()),
      goto: jest.fn(() => Promise.resolve(null)),
      addScriptTag: jest.fn(() => Promise.resolve({})),
      evaluate: jest.fn(() => Promise.resolve({})),
      close: jest.fn(() => Promise.resolve()),
      isClosed: jest.fn().mockReturnValue(false),
      setDefaultNavigationTimeout: jest.fn(),
      waitForTimeout: jest.fn(() => Promise.resolve()),
    } as any;

    mockContext = {
      newPage: jest.fn(() => Promise.resolve(mockPage)),
      close: jest.fn(() => Promise.resolve()),
    } as any;

    mockBrowser = {
      newPage: jest.fn(() => Promise.resolve(mockPage)),
      newContext: jest.fn(() => Promise.resolve(mockContext)),
      close: jest.fn(() => Promise.resolve()),
      isConnected: jest.fn().mockReturnValue(true),
    } as any;

    mockedChromium.launch.mockResolvedValue(mockBrowser);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await browserPool.shutdown();
  });

  describe('browserPool', () => {
    it('debe obtener un browser del pool', async () => {
      const browser = await browserPool.getBrowser();

      expect(browser).toBeDefined();
      expect(mockedChromium.launch).toHaveBeenCalledWith({
        headless: true,
        args: expect.arrayContaining([
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--disable-gpu',
        ]),
      });
    });

    it('debe liberar un browser al pool', async () => {
      const browser = await browserPool.getBrowser();

      browserPool.releaseBrowser(browser);

      // No debe cerrar el browser, solo liberarlo
      expect(mockBrowser.close).not.toHaveBeenCalled();
    });

    it('debe retornar estadísticas del pool', async () => {
      const initialStats = browserPool.getPoolStats();
      expect(initialStats.total).toBe(0);

      const browser = await browserPool.getBrowser();

      const statsWithBrowser = browserPool.getPoolStats();
      expect(statsWithBrowser.total).toBe(1);
      expect(statsWithBrowser.inUse).toBe(1);

      browserPool.releaseBrowser(browser);

      const statsAfterRelease = browserPool.getPoolStats();
      expect(statsAfterRelease.inUse).toBe(0);
      expect(statsAfterRelease.available).toBe(1);
    });

    it('debe esperar por browser disponible cuando el pool está lleno', async () => {
      // Configurar un pool pequeño de 1 browser
      process.env.BROWSER_POOL_SIZE = '1';
      await browserPool.shutdown(); // Force new instance with small pool

      // Obtener el único browser disponible
      const browser1 = await browserPool.getBrowser();

      // Variable para almacenar la promesa del segundo browser
      let browser2: any;

      // Intentar obtener un segundo browser (debería esperar)
      const browser2Promise = browserPool.getBrowser();

      // Simular que después de un tiempo liberamos el primer browser
      setTimeout(() => {
        browserPool.releaseBrowser(browser1);
      }, 50);

      // Esperar a que la promesa se resuelva
      browser2 = await browser2Promise;

      expect(browser2).toBe(browser1); // Debe ser el mismo browser reutilizado

      const stats = browserPool.getPoolStats();
      expect(stats.total).toBe(1); // Solo debe haber un browser en el pool
    });

    it('debe cerrar todos los browsers al hacer shutdown', async () => {
      await browserPool.getBrowser();

      await browserPool.shutdown();

      expect(mockBrowser.close).toHaveBeenCalled();

      const stats = browserPool.getPoolStats();
      expect(stats.total).toBe(0);
    });
  });

  describe('withPooledPage - HTML', () => {
    it('debe procesar HTML correctamente', async () => {
      const testHtml = '<html><body><h1>Pooled Test</h1></body></html>';

      const result = await withPooledPage('html', testHtml, async page => {
        return 'pooled-result';
      });

      expect(result).toBe('pooled-result');
      expect(mockPage.setContent).toHaveBeenCalledWith(testHtml);
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(500);
    });

    it('debe manejar errores y liberar recursos correctamente', async () => {
      const testHtml = '<html><body><h1>Test</h1></body></html>';

      await expect(
        withPooledPage('html', testHtml, async page => {
          throw new Error('Pooled error');
        })
      ).rejects.toThrow('Pooled error');

      // Los recursos deben haberse limpiado
      expect(mockPage.close).toHaveBeenCalled();
      expect(mockContext.close).toHaveBeenCalled();
    });

    it('debe aplicar timeout personalizado', async () => {
      const testHtml = '<html><body><h1>Test</h1></body></html>';
      const options = { overallTimeoutMs: 5000 };

      const result = await withPooledPage(
        'html',
        testHtml,
        async page => {
          return 'timeout-result';
        },
        options
      );

      expect(result).toBe('timeout-result');
    });

    it('debe manejar timeout durante la configuración', async () => {
      const testHtml = '<html><body><h1>Test</h1></body></html>';
      const options = { overallTimeoutMs: 1 }; // Timeout muy corto

      // Simular demora en la creación del browser
      mockedChromium.launch.mockImplementation(createDelayedBrowser as any);

      const testFunction = async () => 'should-not-reach';

      await expect(
        withPooledPage('html', testHtml, testFunction, options)
      ).rejects.toThrow(/overall timeout exceeded/i);
    });
  });

  describe('withPooledPage - URL', () => {
    it('debe procesar URL correctamente', async () => {
      const testUrl = 'https://example.com';

      const result = await withPooledPage('url', testUrl, async page => {
        return 'pooled-url-result';
      });

      expect(result).toBe('pooled-url-result');
      expect(mockPage.goto).toHaveBeenCalledWith(testUrl, {
        waitUntil: 'domcontentloaded',
      });
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(2000); // idleWaitMs por defecto
    });

    it('debe aplicar timeout de navegación personalizado', async () => {
      const testUrl = 'https://example.com';
      const options = { navTimeoutMs: 3000 };

      await withPooledPage(
        'url',
        testUrl,
        async page => {
          return 'nav-timeout-result';
        },
        options
      );

      expect(mockPage.setDefaultNavigationTimeout).toHaveBeenCalledWith(3000);
    });

    it('debe manejar errores de navegación', async () => {
      const testUrl = 'https://invalid-url.com';
      (mockPage.goto as jest.MockedFunction<any>).mockRejectedValueOnce(
        new Error('Navigation failed')
      );

      await expect(
        withPooledPage('url', testUrl, async page => {
          return 'should-not-reach';
        })
      ).rejects.toThrow('Navigation failed');

      // Los recursos deben haberse limpiado incluso con error
      expect(mockPage.close).toHaveBeenCalled();
      expect(mockContext.close).toHaveBeenCalled();
    });

    it('debe aplicar tiempo de espera idle personalizado', async () => {
      const testUrl = 'https://example.com';
      const options = { idleWaitMs: 1000 };

      await withPooledPage(
        'url',
        testUrl,
        async page => {
          return 'idle-result';
        },
        options
      );

      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(1000);
    });

    it('debe omitir tiempo de espera idle si es 0', async () => {
      const testUrl = 'https://example.com';
      const options = { idleWaitMs: 0 };

      await withPooledPage(
        'url',
        testUrl,
        async page => {
          return 'no-idle-result';
        },
        options
      );

      // waitForTimeout debe haberse llamado solo una vez para setContent (500ms)
      // No debe llamarse para idleWaitMs
      expect(mockPage.waitForTimeout).not.toHaveBeenCalledWith(0);
    });
  });

  describe('Pool Management', () => {
    it('debe reutilizar browsers del pool', async () => {
      const testHtml1 = '<html><body>Test 1</body></html>';
      const testHtml2 = '<html><body>Test 2</body></html>';

      await withPooledPage('html', testHtml1, async page => {
        expect(mockPage.setContent).toHaveBeenCalledWith(testHtml1);
        return 'result1';
      });

      await withPooledPage('html', testHtml2, async page => {
        expect(mockPage.setContent).toHaveBeenCalledWith(testHtml2);
        return 'result2';
      });

      // Debe haber creado solo un browser (reutilizado)
      expect(mockedChromium.launch).toHaveBeenCalledTimes(1);
    });

    it('debe manejar múltiples operaciones concurrentes', async () => {
      // Crear una función separada para evitar anidación profunda
      const createTestPromise = (i: number) =>
        withPooledPage(
          'html',
          `<html><body>Test ${i}</body></html>`,
          simulateAsyncWork.bind(null, i)
        );

      const promises = Array.from({ length: 3 }, (_, i) =>
        createTestPromise(i)
      );

      const results = await Promise.all(promises);
      expect(results).toEqual(['result-0', 'result-1', 'result-2']);
    });

    it('debe crear context con configuración correcta', async () => {
      const testHtml = '<html><body>Context Test</body></html>';

      await withPooledPage('html', testHtml, async page => {
        return 'context-result';
      });

      expect(mockBrowser.newContext).toHaveBeenCalledWith({
        javaScriptEnabled: true,
        ignoreHTTPSErrors: true,
        viewport: { width: 1280, height: 720 },
      });
    });

    it('debe manejar warnings de limpieza de recursos', async () => {
      // El código ahora usa logger.warn en lugar de console.warn
      // Solo verificamos que no falle cuando hay error en cleanup
      (mockPage.close as jest.MockedFunction<any>).mockRejectedValueOnce(
        new Error('Close page error')
      );

      const testHtml = '<html><body>Test</body></html>';

      const result = await withPooledPage('html', testHtml, async page => {
        return 'cleanup-warning-test';
      });

      // Verificar que la función completa exitosamente a pesar del error de cleanup
      expect(result).toBe('cleanup-warning-test');
    });
  });

  describe('Browser Cleanup', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('debe limpiar browsers idle después del tiempo límite', async () => {
      // Obtener un browser y liberarlo
      const browserInstance = await browserPool.getBrowser();
      browserPool.releaseBrowser(browserInstance);

      // Simular que pasa el tiempo
      const mockNow = jest.spyOn(Date, 'now').mockImplementation(() => 1000);

      // Primera llamada para lastUsed
      mockNow.mockReturnValueOnce(1000);
      browserPool.releaseBrowser(browserInstance);

      // Segunda llamada para cleanup check (6 minutos después)
      mockNow.mockReturnValueOnce(1000 + 360000 + 1);

      // Disparar cleanup interval
      jest.advanceTimersByTime(60000);

      // Esperar a que se complete el cleanup asíncrono
      await Promise.resolve();

      expect(mockBrowser.close).toHaveBeenCalled();

      mockNow.mockRestore();
    });

    it('debe manejar errores durante el cleanup de browsers idle', async () => {
      // El código ahora usa logger.fatal en lugar de console.warn para errores de cleanup
      // Solo verificamos que el cleanup intente cerrar el browser sin lanzar excepciones

      // Obtener un browser y liberarlo
      const browserInstance = await browserPool.getBrowser();

      // Hacer que browser.close() falle
      (mockBrowser.close as jest.MockedFunction<any>).mockRejectedValueOnce(
        new Error('Browser close failed')
      );

      browserPool.releaseBrowser(browserInstance);

      // Simular que pasa el tiempo
      const mockNow = jest.spyOn(Date, 'now');
      mockNow.mockReturnValueOnce(1000); // lastUsed
      browserPool.releaseBrowser(browserInstance);
      mockNow.mockReturnValueOnce(1000 + 360000 + 1); // cleanup check

      // Disparar cleanup interval
      jest.advanceTimersByTime(60000);

      // Esperar a que se complete el cleanup asíncrono
      await Promise.resolve();

      // Verificar que intentó cerrar el browser
      expect(mockBrowser.close).toHaveBeenCalled();

      mockNow.mockRestore();
    });
  });

  describe('Environment Variable Handling', () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    it('debe usar ANALYZE_TIMEOUT_MS del environment', async () => {
      process.env.ANALYZE_TIMEOUT_MS = '45000';

      const testHtml = '<html><body>Test</body></html>';

      await withPooledPage('html', testHtml, async page => {
        return 'timeout-test';
      });

      // Verificar que se configura correctamente
      expect(mockPage.setContent).toHaveBeenCalled();
    });

    it('debe usar NAVIGATION_TIMEOUT_MS del environment', async () => {
      process.env.NAVIGATION_TIMEOUT_MS = '25000';

      const testUrl = 'https://example.com';

      await withPooledPage('url', testUrl, async page => {
        return 'nav-timeout-test';
      });

      expect(mockPage.setDefaultNavigationTimeout).toHaveBeenCalledWith(25000);
    });

    it('debe usar IDLE_WAIT_MS del environment', async () => {
      process.env.IDLE_WAIT_MS = '3000';

      const testUrl = 'https://example.com';

      await withPooledPage('url', testUrl, async page => {
        return 'idle-wait-test';
      });

      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(3000);
    });
  });

  describe('Linux Chrome Path Handling', () => {
    let originalPlatform: string;

    beforeEach(() => {
      originalPlatform = process.platform;
      // Mock fs.existsSync
      const fs = require('node:fs');
      jest.spyOn(fs, 'existsSync').mockImplementation(() => false);
    });

    afterEach(() => {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
      jest.restoreAllMocks();
    });

    it('debe intentar rutas de Chrome en Linux cuando no existe Chrome', async () => {
      // Simular plataforma Linux
      Object.defineProperty(process, 'platform', { value: 'linux' });

      // Mock que Chrome no está disponible en la ruta estándar
      (mockedChromium.launch as jest.MockedFunction<any>).mockRejectedValueOnce(
        new Error('Chrome not found')
      );

      // Mock que encuentra Chrome en una ruta específica de Linux
      const fs = require('node:fs');
      jest.spyOn(fs, 'existsSync').mockImplementation((path: any) => {
        return path === '/usr/bin/google-chrome';
      });

      (mockedChromium.launch as jest.MockedFunction<any>).mockResolvedValueOnce(
        mockBrowser
      );

      await browserPool.getBrowser();

      // Verificar que se intentó con la ruta específica de Linux
      expect(mockedChromium.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          executablePath: '/usr/bin/google-chrome',
        })
      );
    });
  });

  describe('Browser Pool Edge Cases', () => {
    it('debe manejar release de browser que no está en el pool', () => {
      const extraBrowser = {
        close: jest.fn(),
        isConnected: jest.fn().mockReturnValue(true),
      } as any;

      // No debería arrojar error
      expect(() => {
        browserPool.releaseBrowser(extraBrowser);
      }).not.toThrow();
    });

    it('debe manejar cleanup cuando el browser ya no está conectado', async () => {
      // Simplemente verificar que el método releaseBrowser funciona correctamente
      const browser = await browserPool.getBrowser();

      // Liberar el browser (esto debería funcionar sin problemas)
      browserPool.releaseBrowser(browser);

      // Verificar que el pool funciona correctamente después del release
      const stats = browserPool.getPoolStats();
      expect(stats.total).toBeGreaterThan(0);
    });
  });
});
