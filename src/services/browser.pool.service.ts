import { Browser, BrowserContext, chromium, Page } from 'playwright';
import {
  createErrorContext,
  ErrorFactory,
  handleError,
} from '../utils/error-handler';
import type { LogContext } from './logging.service';
import { advancedLogger as logger } from './logging.service';

interface PooledBrowser {
  browser: Browser;
  lastUsed: number;
  inUse: boolean;
}

class BrowserPool {
  private pool: PooledBrowser[] = [];
  private readonly maxPoolSize: number;
  private readonly maxIdleTime: number;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(maxPoolSize = 3, maxIdleTimeMs = 300000) {
    // 5 min max idle
    this.maxPoolSize = maxPoolSize;
    this.maxIdleTime = maxIdleTimeMs;
    this.startCleanupTimer();
  }

  private startCleanupTimer() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleBrowsers();
    }, 60000); // Limpia cada minuto
  }

  private async createBrowser(): Promise<Browser> {
    const headlessEnv = String(
      process.env.PLAYWRIGHT_HEADLESS ?? 'true'
    ).toLowerCase();
    const headless = headlessEnv !== 'false';

    const launchOptions = {
      headless: headless || !process.env.DISPLAY,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--memory-pressure-off',
      ],
    };

    try {
      // Intentar lanzar con navegadores de Playwright
      return await chromium.launch(launchOptions);
    } catch (error) {
      // Si falla, intentar con Chrome del sistema
      if (process.platform === 'win32') {
        // Usar variables de entorno para encontrar Chrome dinámicamente
        const programFiles = process.env['PROGRAMFILES'] || 'C:\\Program Files';
        const programFilesX86 =
          process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';

        const chromePaths = [
          `${programFiles}\\Google\\Chrome\\Application\\chrome.exe`,
          `${programFilesX86}\\Google\\Chrome\\Application\\chrome.exe`,
          // También buscar en AppData local para Chrome user-installed
          `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
        ];

        for (const chromePath of chromePaths) {
          try {
            const fs = require('fs');
            if (fs.existsSync(chromePath)) {
              return await chromium.launch({
                ...launchOptions,
                executablePath: chromePath,
              });
            }
          } catch {
            continue;
          }
        }
      } else if (process.platform === 'darwin') {
        // macOS paths
        const macChromePaths = [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Chromium.app/Contents/MacOS/Chromium',
        ];

        for (const chromePath of macChromePaths) {
          try {
            const fs = require('fs');
            if (fs.existsSync(chromePath)) {
              return await chromium.launch({
                ...launchOptions,
                executablePath: chromePath,
              });
            }
          } catch {
            continue;
          }
        }
      } else if (process.platform === 'linux') {
        // Linux paths - intentar comando which primero
        try {
          const { execSync } = require('child_process');
          const chromePath = execSync(
            'which google-chrome || which chromium-browser || which chromium',
            { encoding: 'utf8' }
          ).trim();

          if (chromePath) {
            return await chromium.launch({
              ...launchOptions,
              executablePath: chromePath,
            });
          }
        } catch {
          // Si which falla, intentar rutas comunes
          const linuxChromePaths = [
            '/usr/bin/google-chrome',
            '/usr/bin/chromium-browser',
            '/usr/bin/chromium',
            '/snap/bin/chromium',
          ];

          for (const chromePath of linuxChromePaths) {
            try {
              const fs = require('fs');
              if (fs.existsSync(chromePath)) {
                return await chromium.launch({
                  ...launchOptions,
                  executablePath: chromePath,
                });
              }
            } catch {
              continue;
            }
          }
        }
      }

      // Si falla completamente, relanzar el error original con información útil
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Failed to launch browser. Please install Playwright browsers: npx playwright install\nOriginal error: ${errorMessage}`
      );
    }
  }

  async getBrowser(): Promise<Browser> {
    // Buscar browser disponible
    for (const pooledBrowser of this.pool) {
      if (!pooledBrowser.inUse && pooledBrowser.browser.isConnected()) {
        pooledBrowser.inUse = true;
        pooledBrowser.lastUsed = Date.now();
        return pooledBrowser.browser;
      }
    }

    // Si no hay disponible y no hemos llegado al límite, crear nuevo
    if (this.pool.length < this.maxPoolSize) {
      const browser = await this.createBrowser();
      const pooledBrowser: PooledBrowser = {
        browser,
        lastUsed: Date.now(),
        inUse: true,
      };
      this.pool.push(pooledBrowser);
      return browser;
    }

    // Si llegamos al límite, esperar hasta que uno esté disponible
    return new Promise(resolve => {
      const checkForAvailable = () => {
        for (const pooledBrowser of this.pool) {
          if (!pooledBrowser.inUse && pooledBrowser.browser.isConnected()) {
            pooledBrowser.inUse = true;
            pooledBrowser.lastUsed = Date.now();
            resolve(pooledBrowser.browser);
            return;
          }
        }
        // Esperar 100ms y volver a intentar
        setTimeout(checkForAvailable, 100);
      };
      checkForAvailable();
    });
  }

  releaseBrowser(browser: Browser) {
    const pooledBrowser = this.pool.find(p => p.browser === browser);
    if (pooledBrowser) {
      pooledBrowser.inUse = false;
      pooledBrowser.lastUsed = Date.now();
    }
  }

  private async cleanupIdleBrowsers(): Promise<void> {
    const now = Date.now();
    const context = createErrorContext().operation('browser.cleanup').build();

    for (let i = this.pool.length - 1; i >= 0; i--) {
      const pooledBrowser = this.pool[i];
      if (
        !pooledBrowser.inUse &&
        now - pooledBrowser.lastUsed > this.maxIdleTime
      ) {
        try {
          await pooledBrowser.browser.close();
          logger.debug('Closed idle browser', {
            ...context,
            idleTime: now - pooledBrowser.lastUsed,
            poolIndex: i,
          });
        } catch (error) {
          // Log but continue cleanup - non-critical error
          handleError(error, context, {
            logLevel: 'warn',
            defaultMessage: 'Failed to close idle browser',
            rethrow: false,
          });
        }
        this.pool.splice(i, 1);
      }
    }
  }

  async shutdown(): Promise<void> {
    const context = createErrorContext().operation('browser.shutdown').build();

    logger.info('Shutting down browser pool', {
      ...context,
      poolSize: this.pool.length,
    });

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    const closePromises = this.pool.map(async (pooledBrowser, index) => {
      try {
        await pooledBrowser.browser.close();
        logger.debug('Browser closed successfully', {
          ...context,
          poolIndex: index,
        });
      } catch (error) {
        // Log but continue shutdown - non-critical error
        handleError(
          error,
          { ...context, poolIndex: index },
          {
            logLevel: 'warn',
            defaultMessage: 'Failed to close browser during shutdown',
            rethrow: false,
          }
        );
      }
    });

    await Promise.allSettled(closePromises);
    this.pool = [];

    logger.info('Browser pool shutdown complete', context);
  }

  getPoolStats() {
    return {
      total: this.pool.length,
      inUse: this.pool.filter(p => p.inUse).length,
      available: this.pool.filter(p => !p.inUse).length,
      connected: this.pool.filter(p => p.browser.isConnected()).length,
    };
  }
}

// Instancia lazy del pool
let _browserPool: BrowserPool | null = null;

export const browserPool = {
  get instance(): BrowserPool {
    if (!_browserPool) {
      const poolSize = Number(process.env.BROWSER_POOL_SIZE ?? 3);
      _browserPool = new BrowserPool(poolSize);
    }
    return _browserPool;
  },

  async getBrowser(): Promise<Browser> {
    return this.instance.getBrowser();
  },

  releaseBrowser(browser: Browser): void {
    return this.instance.releaseBrowser(browser);
  },

  async shutdown(): Promise<void> {
    if (_browserPool) {
      await _browserPool.shutdown();
      _browserPool = null;
    }
  },

  getPoolStats() {
    return _browserPool
      ? _browserPool.getPoolStats()
      : { total: 0, inUse: 0, available: 0, connected: 0 };
  },
};

// Función optimizada para usar con el pool
export async function withPooledPage<T>(
  inputType: 'html' | 'url',
  value: string,
  fn: (page: Page) => Promise<T>,
  opts?: {
    overallTimeoutMs?: number;
    navTimeoutMs?: number;
    idleWaitMs?: number;
    requestId?: string;
  }
): Promise<T> {
  const overallTimeoutMs =
    opts?.overallTimeoutMs ?? Number(process.env.ANALYZE_TIMEOUT_MS ?? 30000);
  const navTimeoutMs =
    opts?.navTimeoutMs ?? Number(process.env.NAVIGATION_TIMEOUT_MS ?? 15000);
  const idleWaitMs =
    opts?.idleWaitMs ?? Number(process.env.IDLE_WAIT_MS ?? 2000);

  const context: LogContext = {
    requestId: opts?.requestId,
    operation: 'browser.withPooledPage',
    inputType,
    url: inputType === 'url' ? value : undefined,
  };

  let browser: Browser | null = null;
  let browserContext: BrowserContext | null = null;
  let page: Page | null = null;
  let timeoutHit = false;

  const timer = setTimeout(() => {
    timeoutHit = true;
  }, overallTimeoutMs);

  try {
    browser = await browserPool.getBrowser();
    logger.debug('Browser acquired from pool', context);

    browserContext = await browser.newContext({
      javaScriptEnabled: true,
      ignoreHTTPSErrors: true,
      viewport: { width: 1280, height: 720 },
    });

    page = await browserContext.newPage();
    page.setDefaultNavigationTimeout(navTimeoutMs);

    if (timeoutHit) {
      throw ErrorFactory.timeout(
        'Overall timeout exceeded before page setup',
        context
      );
    }

    if (inputType === 'url') {
      await page.goto(value, { waitUntil: 'domcontentloaded' });
      if (idleWaitMs > 0) {
        await page.waitForTimeout(idleWaitMs);
      }
      logger.debug('Page navigated successfully', { ...context, url: value });
    } else {
      await page.setContent(value);
      await page.waitForTimeout(500); // Breve espera para que se renderice
      logger.debug('HTML content set successfully', context);
    }

    if (timeoutHit) {
      throw ErrorFactory.timeout(
        'Overall timeout exceeded during navigation',
        context
      );
    }

    const result = await fn(page);

    if (timeoutHit) {
      throw ErrorFactory.timeout(
        'Overall timeout exceeded during analysis',
        context
      );
    }

    logger.debug('Page function executed successfully', context);
    return result;
  } catch (error) {
    // Wrap and rethrow with context
    handleError(error, context, {
      logLevel: 'error',
      defaultMessage: 'Browser page execution failed',
      rethrow: true,
    });
    throw error; // TypeScript flow analysis
  } finally {
    clearTimeout(timer);

    // Cleanup page and context
    try {
      if (page) {
        await page.close();
        logger.debug('Page closed', context);
      }
      if (browserContext) {
        await browserContext.close();
        logger.debug('Browser context closed', context);
      }
    } catch (error) {
      // Non-critical cleanup error
      handleError(error, context, {
        logLevel: 'warn',
        defaultMessage: 'Error cleaning up page/context',
        rethrow: false,
      });
    }

    // Release browser back to pool
    if (browser) {
      browserPool.releaseBrowser(browser);
      logger.debug('Browser released to pool', context);
    }
  }
}

// Graceful shutdown del pool - Solo en producción
// Los event listeners se configuran en el servidor principal
// process.on('SIGINT', async () => {
//   if (process.env.NODE_ENV !== 'test') {
//     console.info('Shutting down browser pool...');
//   }
//   await browserPool.shutdown();
// });

// process.on('SIGTERM', async () => {
//   if (process.env.NODE_ENV !== 'test') {
//     console.info('Shutting down browser pool...');
//   }
//   await browserPool.shutdown();
// });
