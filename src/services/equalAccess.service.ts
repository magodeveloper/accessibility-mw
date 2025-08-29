import * as aChecker from 'accessibility-checker';
import * as fs from 'fs';
import * as path from 'path';

import type { Page } from 'playwright';

export async function runEqualAccess(content: string | Page, label: string) {
  if (!aChecker || typeof aChecker.getCompliance !== 'function') {
    throw new Error(
      'accessibility-checker no se importó correctamente (getCompliance no existe)'
    );
  }

  // Asegurar que el directorio de cache existe con permisos correctos
  const cacheDir = path.join(process.cwd(), '.achecker_cache', 'engine');
  try {
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true, mode: 0o755 });
    }
  } catch (error) {
    console.warn(
      'Warning: Could not create .achecker_cache/engine directory:',
      error
    );
  }

  const report = await aChecker.getCompliance(content as unknown, label);
  await aChecker.close();
  return report.report;
}
