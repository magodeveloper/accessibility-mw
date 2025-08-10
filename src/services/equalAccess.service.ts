const aChecker = require('accessibility-checker');

import type { Page } from 'playwright';

export async function runEqualAccess(content: string | Page, label: string) {
  if (!aChecker || typeof aChecker.getCompliance !== 'function') {
    throw new Error('accessibility-checker no se importó correctamente (getCompliance no existe)');
  }
  const report = await aChecker.getCompliance(content as any, label);
  await aChecker.close();
  return report.report;
}