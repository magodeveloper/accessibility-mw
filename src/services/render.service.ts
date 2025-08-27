import type { Page } from 'playwright';
import { withPooledPage } from './browser.pool.service';

type WithPageOptions = {
  overallTimeoutMs?: number; // tiempo total duro (cierra browser si vence)
  navTimeoutMs?: number; // timeout de navegación (Playwright)
  idleWaitMs?: number; // espera adicional de networkidle
};

/**
 * Función legacy para compatibilidad hacia atrás
 * @deprecated Use withPooledPage for better performance
 */
export async function withPage<T>(
  inputType: 'html' | 'url',
  value: string,
  fn: (page: Page) => Promise<T>,
  opts?: WithPageOptions
): Promise<T> {
  // Evitamos spam de warnings en tests y mostramos solo una vez en otros entornos
  const isTest = process.env.NODE_ENV === 'test';
  // @ts-ignore - variable de módulo para recordar si ya avisamos
  if (!global.__WITH_PAGE_LEGACY_WARNED__ && !isTest) {
    // @ts-ignore
    global.__WITH_PAGE_LEGACY_WARNED__ = true;
    console.warn(
      '[withPage] Using legacy non-pooled browser. Consider migrating to withPooledPage for better performance.'
    );
  }
  return withPooledPage(inputType, value, fn, opts);
}

// Re-export the optimized version as the primary export
export { withPooledPage as withOptimizedPage };
