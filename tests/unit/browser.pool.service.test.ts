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

  beforeEach(() => {
    mockPage = {
      setContent: jest.fn().mockResolvedValue(undefined),
      goto: jest.fn().mockResolvedValue(null),
      addScriptTag: jest.fn().mockResolvedValue({}),
      evaluate: jest.fn().mockResolvedValue({}),
      close: jest.fn().mockResolvedValue(undefined),
      isClosed: jest.fn().mockReturnValue(false),
      setDefaultNavigationTimeout: jest.fn(),
      waitForTimeout: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockContext = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      newContext: jest.fn().mockResolvedValue(mockContext),
      close: jest.fn().mockResolvedValue(undefined),
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

    it('debe cerrar todos los browsers al hacer shutdown', async () => {
      const browser = await browserPool.getBrowser();

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
      mockedChromium.launch.mockImplementation(
        () =>
          new Promise(resolve => setTimeout(() => resolve(mockBrowser), 100))
      );

      await expect(
        withPooledPage(
          'html',
          testHtml,
          async page => {
            return 'should-not-reach';
          },
          options
        )
      ).rejects.toThrow(/Timeout.*overall timeout exceeded/);
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
      mockPage.goto.mockRejectedValueOnce(new Error('Navigation failed'));

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
      const promises = Array.from({ length: 3 }, (_, i) =>
        withPooledPage(
          'html',
          `<html><body>Test ${i}</body></html>`,
          async page => {
            // Simular trabajo asíncrono
            await new Promise(resolve => setTimeout(resolve, 10));
            return `result-${i}`;
          }
        )
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
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockPage.close.mockRejectedValueOnce(new Error('Close page error'));

      const testHtml = '<html><body>Test</body></html>';

      const result = await withPooledPage('html', testHtml, async page => {
        return 'cleanup-warning-test';
      });

      expect(result).toBe('cleanup-warning-test');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error cleaning up page/context:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
