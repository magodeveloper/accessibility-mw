import { chromium, Browser, Page } from 'playwright';

export async function withPage<T>(
  inputType: 'html' | 'url',
  value: string,
  fn: (page: Page) => Promise<T>
): Promise<T> {
  const headless = (process.env.PLAYWRIGHT_HEADLESS ?? 'true') !== 'false';
  const browser: Browser = await chromium.launch({ headless });

  const context = await browser.newContext({
    javaScriptEnabled: true,
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();
  page.setDefaultNavigationTimeout(parseInt(process.env.REQUEST_TIMEOUT_MS ?? '20000', 10));

  try {
    if (inputType === 'url') {
      // Navega a la URL
      await page.goto(value, { waitUntil: 'load' });
      // Mejor para SPAs:
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    } else {
      // Carga HTML raw
      await page.setContent(value, { waitUntil: 'load' });
    }
    return await fn(page);
  } finally {
    await context.close();
    await browser.close();
  }
}