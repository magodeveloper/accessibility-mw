import os from 'node:os';
import path from 'node:path';
import { Router } from 'express';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { abortAfter } from '../utils/timing';

export const healthRouter = Router();

type CheckResult = { ok: boolean; details?: Record<string, any>; error?: string };

async function checkAxeCorePkg(): Promise<CheckResult> {
  try {
    const axePkg = require('axe-core/package.json');
    return { ok: true, details: { version: axePkg?.version ?? null } };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'axe-core not found' };
  }
}

async function checkEqualAccessPkg(): Promise<CheckResult> {
  try {
    // Intenta cargar el módulo; si carga, está disponible
    // Luego intenta resolver la ruta al entrypoint y leer su package.json para obtener versión (sin depender de "exports")
    // Nota: en algunos builds el package.json puede no estar presente; en ese caso devolvemos ok sin versión.
    require('accessibility-checker');
    let version: string | null = null;
    try {
      const entry = require.resolve('accessibility-checker');
      const pkgPath = path.join(path.dirname(entry), 'package.json');
      const pkgRaw = await fs.readFile(pkgPath, 'utf8').catch(() => null);
      if (pkgRaw) {
        const pkg = JSON.parse(pkgRaw);
        version = pkg?.version ?? null;
      }
    } catch { /* ignore version lookup */ }
    return { ok: true, details: { version } };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'accessibility-checker not found' };
  }
}

async function checkPlaywrightAndAxeInject(): Promise<CheckResult> {
  let browser: any;
  let context: any;
  let page: any;
  try {
    browser = await chromium.launch({ headless: true });
    const version = browser.version?.();
    context = await browser.newContext();
    page = await context.newPage();
    // Página mínima (no hacemos análisis, solo inyección)
    await page.setContent('<!doctype html><html><head></head><body><h1>health</h1></body></html>', {
      waitUntil: 'domcontentloaded'
    });

    const axePath = require.resolve('axe-core');
    await page.addScriptTag({ path: axePath });

    const hasAxe = await page.evaluate(() => typeof (window as any).axe === 'object');

    return {
      ok: hasAxe === true,
      details: { browser: 'chromium', browserVersion: version, axeInjected: hasAxe }
    };
  } catch (e: any) {
      return { ok: false, error: e?.message || 'playwright/axe inject failed' };
  } finally {
      try { if (page) await page.close(); } catch {}
      try { if (context) await context.close(); } catch {}
      try { if (browser) await browser.close(); } catch {}
  }
}

async function checkWritableTmp(): Promise<CheckResult> {
  const dir = os.tmpdir(); // cross-platform (Windows, Linux, macOS)
  const fname = path.join(dir, `health-${Date.now()}.tmp`);
  try {
    await fs.writeFile(fname, 'ok');
    await fs.readFile(fname, 'utf8');
    await fs.rm(fname, { force: true });
    return { ok: true, details: { path: dir } };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'cannot write /tmp' };
  }
}

// Cache del deep health por 60s para evitar lanzar Chromium demasiadas veces
let deepCache: { at: number; payload: any; ok: boolean } | null = null;
const DEEP_CACHE_MS = 60_000;

healthRouter.get('/', async (req, res) => {
  const requestId = (req as any).id;
  const deepValue = req.query.deep;
  const deepStr = (typeof deepValue === 'string' || typeof deepValue === 'number' || typeof deepValue === 'boolean')
    ? String(deepValue).trim()
    : '';
  const deep = deepStr !== '' && deepStr !== '0' && deepStr !== 'false';

  if (!deep) {
    // Shallow: rápido para healthcheck de Docker/K8s
    return res.json({
      ok: true,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      requestId
    });
  }

  const TIMEOUT_MS = Number(process.env.HEALTHCHECK_TIMEOUT_MS ?? 10000);

  // Responde desde cache si es reciente
  if (deepCache && Date.now() - deepCache.at < DEEP_CACHE_MS) {
    return res.status(deepCache.ok ? 200 : 503).json({ ...deepCache.payload, requestId });
  }

  // Ejecutamos las 4 comprobaciones con timeout
  const [axePkg, eqPkg, pw, tmp] = await Promise.all([
    abortAfter(TIMEOUT_MS, checkAxeCorePkg(),             { phase: 'health/axe-pkg'        }).catch((e: any) => ({ ok: false, error: e?.message })),
    abortAfter(TIMEOUT_MS, checkEqualAccessPkg(),         { phase: 'health/ea-pkg'         }).catch((e: any) => ({ ok: false, error: e?.message })),
    abortAfter(TIMEOUT_MS, checkPlaywrightAndAxeInject(), { phase: 'health/playwright-axe' }).catch((e: any) => ({ ok: false, error: e?.message })),
    abortAfter(TIMEOUT_MS, checkWritableTmp(),            { phase: 'health/tmp'            }).catch((e: any) => ({ ok: false, error: e?.message })),
  ]);

  const ok = Boolean(axePkg?.ok) && Boolean(eqPkg?.ok) && Boolean(pw?.ok) && Boolean(tmp?.ok);

  const response = {
    ok,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    requestId,
    versions: {
      node: process.version,
      playwright: (() => {
        try { return require('playwright/package.json')?.version ?? null; } catch { return null; }
      })(),
      chromium: (pw && 'details' in pw && pw.details?.browserVersion) ?? null,
      axeCore: (axePkg && 'details' in axePkg && axePkg.details?.version) ?? null,
      equalAccess: (eqPkg && 'details' in eqPkg && eqPkg.details?.version) ?? null
    },
    services: {
      playwright: pw,
      axeCore: axePkg,
      equalAccess: eqPkg,
      tmp: tmp
    }
  };
    
  // Cachear resultado
  deepCache = { at: Date.now(), payload: response, ok };

  // Si algo falló, marcamos 503 para que observabilidad lo registre
  return res.status(ok ? 200 : 503).json(response);
});

healthRouter.head('/', (_req, res) => {
  res.status(200).end();
});