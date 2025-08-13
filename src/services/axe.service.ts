import type { Page } from 'playwright';

type AxeResult = {
  violations: any[];
  passes: any[];
  incomplete: any[];
  inapplicable: any[];
};

const IMPACT_ORDER = ['minor', 'moderate', 'serious', 'critical'] as const;
type ImpactVal = typeof IMPACT_ORDER[number];

function worstImpactFromNodes(nodes: any[]): ImpactVal | undefined {
  let worstIndex = -1;
  for (const n of nodes ?? []) {
    const imp = String(n?.impact ?? '').toLowerCase();
    const idx = IMPACT_ORDER.indexOf(imp as ImpactVal);
    if (idx > worstIndex) worstIndex = idx;
  }
  return worstIndex >= 0 ? IMPACT_ORDER[worstIndex] : undefined;
}

export async function runAxeOnPage(page: Page, extraOptions?: Record<string, any>): Promise<AxeResult> {
  const axePath = require.resolve('axe-core');
  await page.addScriptTag({ path: axePath });

  // Espera el DOM (evita correr muy temprano)
  await page.evaluate(() => {
    if (document.readyState === 'loading') {
      return new Promise<void>(resolve =>
        document.addEventListener('DOMContentLoaded', () => resolve(), { once: true })
      );
    }
    // Do nothing if not loading; just return undefined (void)
  });

  // Opciones por defecto: NO filtrar reglas, analizar iframes same-origin
  const optionsToUse = {
    iframes: true,
    ...(extraOptions ?? {})
    // OJO: no seteamos runOnly ni tags aquí
  };

  let results: AxeResult;
  try {
    results = await page.evaluate(async (axeOptions) => {
      // @ts-ignore
      const axe = (window as any).axe;
      // @ts-ignore
      const out = await axe.run(document, axeOptions || {});
      return out;
    }, optionsToUse);
  } catch (e: any) {
    const err: any = new Error(e?.message || 'axe.run failed');
    err.code = 'AXE_RUN_ERROR';
    err.details = { options: optionsToUse };
    throw err;
  }

  // Fallback de impact desde nodos (por si viene vacío)
  for (const bucket of ['violations', 'passes', 'incomplete', 'inapplicable'] as const) {
    for (const rule of (results as any)[bucket] ?? []) {
      if (!rule.impact) {
        const inferred = worstImpactFromNodes(rule.nodes ?? []);
        if (inferred) rule.impact = inferred;
      }
    }
  }

  return results;
}