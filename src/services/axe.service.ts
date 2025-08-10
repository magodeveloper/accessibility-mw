import { Page } from 'playwright';

export async function runAxeOnPage(page: Page, options?: any) {

  const axePath = require.resolve('axe-core');
  await page.addScriptTag({ path: axePath });

  const results = await page.evaluate(async (axeOptions) => {

    const axe = (window as any).axe;

    return await axe.run(document, axeOptions || {});
  }, options ?? {});

  return results as {
    violations: any[];
    passes: any[];
    incomplete: any[];
    inapplicable: any[];
  };
}