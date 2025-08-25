import { Page } from 'playwright';

// Axe-core interfaces
interface AxeNode {
  impact?: string;
  target?: string[];
  html?: string;
  failureSummary?: string;
  [key: string]: unknown;
}

interface AxeRule {
  id: string;
  description: string;
  help: string;
  helpUrl: string;
  impact?: string;
  tags: string[];
  nodes: AxeNode[];
}

interface AxeOptions {
  iframes?: boolean;
  runOnly?: {
    type: 'tag' | 'rule';
    values: string[];
  };
  rules?: Record<string, { enabled: boolean }>;
  tags?: string[];
  [key: string]: unknown;
}

interface AxeWindowObject {
  axe: {
    run: (context?: unknown, options?: AxeOptions) => Promise<AxeResult>;
  };
}

type AxeResult = {
  violations: AxeRule[];
  passes: AxeRule[];
  incomplete: AxeRule[];
  inapplicable: AxeRule[];
};

interface ExtendedError extends Error {
  code?: string;
  details?: Record<string, unknown>;
}

const IMPACT_ORDER = ['minor', 'moderate', 'serious', 'critical'] as const;
type ImpactVal = (typeof IMPACT_ORDER)[number];

// Resolver la ruta de axe-core
const AXE_CORE_PATH = require.resolve('axe-core/axe.min.js');

function worstImpactFromNodes(nodes: AxeNode[]): ImpactVal | undefined {
  let worstIndex = -1;
  for (const n of nodes ?? []) {
    const imp = String(n?.impact ?? '').toLowerCase();
    const idx = IMPACT_ORDER.indexOf(imp as ImpactVal);
    if (idx > worstIndex) worstIndex = idx;
  }
  return worstIndex >= 0 ? IMPACT_ORDER[worstIndex] : undefined;
}

export async function runAxeOnPage(
  page: Page,
  extraOptions?: AxeOptions
): Promise<AxeResult> {
  // Cargar axe-core desde el paquete local instalado
  try {
    await page.addScriptTag({ path: AXE_CORE_PATH });
  } catch (error) {
    // Fallback: cargar desde CDN si falla el archivo local
    console.warn('Fallback to CDN for axe-core:', error);
    await page.addScriptTag({
      url: 'https://unpkg.com/axe-core@4.10.3/axe.min.js',
    });
  }

  // Espera el DOM (evita correr muy temprano)
  await page.evaluate(() => {
    if (document.readyState === 'loading') {
      return new Promise<void>(resolve =>
        document.addEventListener('DOMContentLoaded', () => resolve(), {
          once: true,
        })
      );
    }
    // Do nothing if not loading; just return undefined (void)
  });

  // Opciones por defecto: NO filtrar reglas, analizar iframes same-origin
  const optionsToUse = {
    iframes: true,
    ...(extraOptions ?? {}),
    // OJO: no seteamos runOnly ni tags aquí
  };

  let results: AxeResult;
  try {
    results = await page.evaluate(async axeOptions => {
      const axeWindow = window as unknown as AxeWindowObject;
      const out = await axeWindow.axe.run(document, axeOptions || {});
      return out;
    }, optionsToUse);
  } catch (e: unknown) {
    const error = e as Error;
    const err: ExtendedError = new Error(error?.message || 'axe.run failed');
    err.code = 'AXE_RUN_ERROR';
    err.details = { options: optionsToUse };
    throw err;
  }

  // Fallback de impact desde nodos (por si viene vacío)
  for (const bucket of [
    'violations',
    'passes',
    'incomplete',
    'inapplicable',
  ] as const) {
    for (const rule of results[bucket] ?? []) {
      if (!rule.impact) {
        const inferred = worstImpactFromNodes(rule.nodes ?? []);
        if (inferred) rule.impact = inferred;
      }
    }
  }

  return results;
}
