import { Page } from 'playwright';

// inyecta axe-core y ejecuta
export async function runAxeOnPage(page: Page, options?: any) {
  // inyecta el bundle de axe-core
  const axePath = require.resolve('axe-core');
  await page.addScriptTag({ path: axePath });

  const results = await page.evaluate(async (axeOptions) => {
    // @ts-ignore
    const axe = (window as any).axe;
    // Config opcional (filtrar reglas por WCAG o nivel lo hacemos en el mapper si hace falta)
    return await axe.run(document, axeOptions || {});
  }, options ?? {});

  return results as {
    violations: any[];
    passes: any[];
    incomplete: any[];
    inapplicable: any[];
  };
}