import { chromium, Page } from 'playwright';

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
  // Forzar headless en contenedor. Permitir override por env:
  // PLAYWRIGHT_HEADLESS: "true" | "false" (default: true)
  const headlessEnv = String(process.env.PLAYWRIGHT_HEADLESS ?? 'true').toLowerCase();
  const headless = headlessEnv !== 'false';

  if (!headless && !process.env.DISPLAY) {
    // Si tienes logger, usa req.log. Aquí un warn genérico:
    console.warn('[withPage] Headed mode sin DISPLAY. Forzando headless=true');
  }

  const overallTimeoutMs = opts?.overallTimeoutMs ?? Number(process.env.ANALYZE_TIMEOUT_MS ?? 60000);
  const navTimeoutMs = opts?.navTimeoutMs ?? Number(process.env.NAVIGATION_TIMEOUT_MS ?? 30000);
  const idleWaitMs = opts?.idleWaitMs ?? Number(process.env.IDLE_WAIT_MS ?? 3000);

  const browser = await chromium.launch({
    headless: headless || !process.env.DISPLAY, // siempre headless en Docker
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