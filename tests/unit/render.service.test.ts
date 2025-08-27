import { Browser, chromium, Page } from 'playwright';
import { withPooledPage } from '../../src/services/browser.pool.service';
import { withOptimizedPage, withPage } from '../../src/services/render.service';

// Mock de Playwright
jest.mock('playwright');
jest.mock('../../src/services/browser.pool.service');

const mockedChromium = chromium as jest.Mocked<typeof chromium>;
const mockedWithPooledPage = withPooledPage as jest.MockedFunction<
  typeof withPooledPage
>;

describe('Render Service', () => {
  let mockBrowser: jest.Mocked<Browser>;
  let mockPage: jest.Mocked<Page>;

  beforeEach(() => {
    mockPage = {
      setContent: jest.fn().mockResolvedValue(undefined),
      goto: jest.fn().mockResolvedValue(null),
      addScriptTag: jest.fn().mockResolvedValue({}),
      evaluate: jest.fn().mockResolvedValue({}),
      close: jest.fn().mockResolvedValue(undefined),
      isClosed: jest.fn().mockReturnValue(false),
    } as any;

    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(true),
    } as any;

    mockedChromium.launch.mockResolvedValue(mockBrowser);
    mockedWithPooledPage.mockImplementation(
      async (inputType, value, fn, opts) => {
        return await fn(mockPage);
      }
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('withPage (legacy)', () => {
    it('debe delegar a withPooledPage para HTML', async () => {
      const testHtml = '<html><body><h1>Test</h1></body></html>';
      const testFn = jest.fn().mockResolvedValue('test-result');

      const result = await withPage('html', testHtml, testFn);

      expect(result).toBe('test-result');
      expect(mockedWithPooledPage).toHaveBeenCalledWith(
        'html',
        testHtml,
        testFn,
        undefined
      );
    });

    it('debe delegar a withPooledPage para URL', async () => {
      const testUrl = 'https://example.com';
      const testFn = jest.fn().mockResolvedValue('url-result');

      const result = await withPage('url', testUrl, testFn);

      expect(result).toBe('url-result');
      expect(mockedWithPooledPage).toHaveBeenCalledWith(
        'url',
        testUrl,
        testFn,
        undefined
      );
    });

    it('debe pasar opciones correctamente', async () => {
      const testHtml = '<html><body><h1>Test</h1></body></html>';
      const testFn = jest.fn().mockResolvedValue('test-result');
      const options = { overallTimeoutMs: 5000, navTimeoutMs: 3000 };

      const result = await withPage('html', testHtml, testFn, options);

      expect(result).toBe('test-result');
      expect(mockedWithPooledPage).toHaveBeenCalledWith(
        'html',
        testHtml,
        testFn,
        options
      );
    });

    it('debe suprimir warning de deprecación en tests', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const testHtml = '<html><body><h1>Test</h1></body></html>';
      const testFn = jest.fn().mockResolvedValue('test-result');

      await withPage('html', testHtml, testFn);

      // En entorno de test, el warning está suprimido
      expect(consoleSpy).not.toHaveBeenCalledWith(
        '[withPage] Using legacy non-pooled browser. Consider migrating to withPooledPage for better performance.'
      );

      consoleSpy.mockRestore();
    });

    it('debe propagar errores de withPooledPage', async () => {
      const testError = new Error('Pooled page error');
      mockedWithPooledPage.mockRejectedValueOnce(testError);

      const testHtml = '<html><body><h1>Test</h1></body></html>';
      const testFn = jest.fn();

      await expect(withPage('html', testHtml, testFn)).rejects.toThrow(
        'Pooled page error'
      );
    });
  });

  describe('withOptimizedPage', () => {
    it('debe ser una referencia a withPooledPage', () => {
      expect(withOptimizedPage).toBe(withPooledPage);
    });
  });
});
