import { chromium, Browser, Page } from 'playwright';

type WithPageOptions = {
  overallTimeoutMs?: number; // tiempo total duro (cierra browser si vence)
  navTimeoutMs?: number; // timeout de navegación (Playwright)
  idleWaitMs?: number; // espera adicional de networkidle
};

export async function withPage<T>(
  inputType: 'html' | 'url',
  value: string,
  fn: (page: Page) => Promise<T>,
  opts?: WithPageOptions
): Promise<T> {
  const headless = (process.env.PLAYWRIGHT_HEADLESS ?? 'true') !== 'false';
  const overallTimeoutMs = opts?.overallTimeoutMs ?? Number(process.env.ANALYZE_TIMEOUT_MS ?? 60000);
  const navTimeoutMs = opts?.navTimeoutMs ?? Number(process.env.NAVIGATION_TIMEOUT_MS ?? 30000);
  const idleWaitMs = opts?.idleWaitMs ?? Number(process.env.IDLE_WAIT_MS ?? 3000);

  const browser: Browser = await chromium.launch({
    headless,
    args: (process.env.IN_CONTAINER === 'true') ? ['--no-sandbox', '--disable-dev-shm-usage'] : []
  });
  const context = await browser.newContext({
    javaScriptEnabled: true,
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(navTimeoutMs);

  // Timer duro: si vence, cerramos y rechazamos
  let timeoutHit = false;
  const timer = setTimeout(async () => {
    timeoutHit = true;
    try { await context.close(); } catch {}
    try { await browser.close(); } catch {}
  }, overallTimeoutMs);

  try {
    if (inputType === 'url') {
      await page.goto(value, { waitUntil: 'load' });
      // pequeña espera adicional para SPAs (no bloqueante si falla)
      await page.waitForLoadState('networkidle', { timeout: idleWaitMs }).catch(() => {});
    } else {
      await page.setContent(value, { waitUntil: 'load' });
    }
    const result = await fn(page);
    if (timeoutHit) throw new Error(`Analyze aborted after ${overallTimeoutMs}ms`);
    return result;
  } finally {
    clearTimeout(timer);
    if (!timeoutHit) {
      try { await context.close(); } catch {}
      try { await browser.close(); } catch {}
    }
  }
}