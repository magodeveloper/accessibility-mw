// --- Cache del deep health por 60s ---
interface DeepCacheEntry {
  at: number;
  payload: Record<string, unknown>;
  ok: boolean;
}

let deepCache: DeepCacheEntry | null = null;
const DEEP_CACHE_MS = 60_000;
import { Router } from 'express';
import os from 'node:os';
import { metricsCollector } from '../services/metrics.service';

// --- Tipos auxiliares ---
type CheckResult = {
  ok: boolean;
  error?: string;
  details?: Record<string, unknown>;
};

// --- Helpers y checks ---
async function checkAxeCorePkg(): Promise<CheckResult> {
  try {
    const axe = await import('axe-core');
    return {
      ok: !!axe,
      details: { version: axe?.default?.version || axe?.version },
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message || 'axe-core not found' };
  }
}

async function checkEqualAccessPkg(): Promise<CheckResult> {
  try {
    const ea = await import('accessibility-checker');
    return {
      ok: !!ea,
      details: { package: 'accessibility-checker', available: true },
    };
  } catch (e) {
    return {
      ok: false,
      error: (e as Error).message || 'accessibility-checker not found',
    };
  }
}

async function checkBrowserPool(): Promise<CheckResult> {
  // Implementación real según el proyecto
  return { ok: true };
}

async function checkCacheService(): Promise<CheckResult> {
  // Implementación real según el proyecto
  return { ok: true };
}

async function checkMetricsService(): Promise<CheckResult> {
  // Implementación real según el proyecto
  return { ok: true };
}

async function checkPlaywrightAndAxeInject(): Promise<CheckResult> {
  // Implementación real según el proyecto
  return { ok: true };
}

function abortAfter<T>(ms: number, promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise
      .then(val => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      });
  });
}

// --- Cache del deep health por 60s ---
interface DeepCacheEntry {
  at: number;
  payload: Record<string, unknown>;
  ok: boolean;
}

// --- Definición de la ruta health ---
const healthRouter = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the accessibility analyzer service
 *     tags: [Health]
 *     parameters:
 *       - in: query
 *         name: deep
 *         schema:
 *           type: string
 *         description: Perform deep health check if true
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       503:
 *         description: Service is unhealthy
 */
healthRouter.get('/', async (req, res) => {
  const requestId = req.id;
  const deepValue = req.query.deep;
  const deepStr = typeof deepValue === 'string' ? deepValue.trim() : '';
  const deep = deepStr !== '' && deepStr !== '0' && deepStr !== 'false';

  if (!deep) {
    const quickMetrics = metricsCollector.getMetrics();
    return res.json({
      ok: true,
      data: {
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        healthScore: quickMetrics.healthScore,
        requests: {
          total: quickMetrics.requests.total,
          successRate:
            quickMetrics.requests.success /
            Math.max(quickMetrics.requests.total, 1),
        },
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        },
      },
      requestId,
    });
  }

  // Deep health check
  if (deepCache && Date.now() - deepCache.at < DEEP_CACHE_MS) {
    return res.status(deepCache.ok ? 200 : 503).json({
      ...deepCache.payload,
      cached: true,
      requestId,
    });
  }

  try {
    const TIMEOUT_MS = Number(process.env.HEALTHCHECK_TIMEOUT_MS ?? 15000);

    const checks = await Promise.allSettled([
      abortAfter(TIMEOUT_MS, checkAxeCorePkg()),
      abortAfter(TIMEOUT_MS, checkEqualAccessPkg()),
      abortAfter(TIMEOUT_MS, checkBrowserPool()),
      abortAfter(TIMEOUT_MS, checkCacheService()),
      abortAfter(TIMEOUT_MS, checkMetricsService()),
      abortAfter(TIMEOUT_MS, checkPlaywrightAndAxeInject()),
    ]);

    const extractResult = (
      settled: PromiseSettledResult<CheckResult>
    ): CheckResult => {
      if (settled.status === 'fulfilled') return settled.value;
      return { ok: false, error: String(settled.reason) };
    };

    const [
      axeCorePkg,
      equalAccessPkg,
      browserPoolCheck,
      cacheCheck,
      metricsCheck,
      playwrightAxe,
    ] = checks.map(extractResult);

    const results = {
      axeCorePkg,
      equalAccessPkg,
      browserPool: browserPoolCheck,
      cache: cacheCheck,
      metrics: metricsCheck,
      playwrightAxe,
    };

    const overallOk = Object.values(results).every(r => r.ok);

    const payload = {
      ok: overallOk,
      data: {
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        checks: results,
        system: {
          platform: os.platform(),
          arch: os.arch(),
          nodeVersion: process.version,
          memory: process.memoryUsage(),
          cpus: os.cpus().length,
          loadAverage: os.loadavg(),
        },
      },
      requestId,
    };

    deepCache = { at: Date.now(), payload, ok: overallOk };
    return res.status(overallOk ? 200 : 503).json(payload);
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    req.log?.error({ requestId, error: err }, 'Health check deep failed');

    const errorPayload = {
      ok: false,
      error: err.message || 'Deep health check timeout',
      data: {
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
      requestId,
    };

    deepCache = { at: Date.now(), payload: errorPayload, ok: false };
    return res.status(503).json(errorPayload);
  }
});

// Alias de health live para compatibilidad con configuraciones Docker
healthRouter.get('/live', async (req, res) => {
  const requestId = req.id;
  const quickMetrics = metricsCollector.getMetrics();
  return res.json({
    ok: true,
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      healthScore: quickMetrics.healthScore,
      requests: {
        total: quickMetrics.requests.total,
        successRate:
          quickMetrics.requests.success /
          Math.max(quickMetrics.requests.total, 1),
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
    },
    requestId,
  });
});

export default healthRouter;
