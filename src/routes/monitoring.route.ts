import { Request, Router } from 'express';
import { getHealthDashboard, getServicesStatus } from '../config/health.config';
import { advancedLogger } from '../services/logging.service';

// Interfaces para el sistema de monitoreo
type RequestWithId = Request & {
  id?: string | number;
};

interface ServiceStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  name?: string;
  url?: string;
  responseTime?: number;
  lastCheck?: string;
  [key: string]: unknown;
}

interface SystemStatus {
  timestamp: string;
  status: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  version: string;
  environment: string;
  requestId?: string | number;
}

interface SystemMetrics {
  timestamp: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  cpu: NodeJS.CpuUsage;
  version: string;
  platform: NodeJS.Platform;
  arch: string;
  environment: string;
  requestId?: string | number;
}

interface ServicesResponse {
  services: ServiceStatus[];
  total: number;
  healthy: number;
  timestamp: string;
  requestId?: string | number;
}

export const monitoringRouter = Router();

/**
 * Endpoint para obtener el dashboard de monitoreo simplificado
 */
monitoringRouter.get('/dashboard', async (req, res) => {
  const requestId = (req as RequestWithId).id;
  const requestIdStr = requestId ? String(requestId) : undefined;

  try {
    advancedLogger.debug('Dashboard solicitado (modo simplificado)', {
      requestId: requestIdStr,
      operation: 'monitoring.dashboard',
    });

    const dashboard = getHealthDashboard();

    res.json({
      ...dashboard,
      requestId,
    });
  } catch (error: unknown) {
    const err = error as Error;
    advancedLogger.error('Error al obtener dashboard de monitoreo', {
      requestId: requestIdStr,
      operation: 'monitoring.dashboard',
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({
      ok: false,
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
      requestId,
    });
  }
});

/**
 * Endpoint para obtener el status de servicios
 */
monitoringRouter.get('/status', async (req, res) => {
  const requestId = (req as RequestWithId).id;
  const requestIdStr = requestId ? String(requestId) : undefined;

  try {
    const systemStatus: SystemStatus = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      environment: process.env.NODE_ENV || 'development',
      requestId,
    };

    res.json(systemStatus);
  } catch (error: unknown) {
    const err = error as Error;
    advancedLogger.error('Error al obtener status del sistema', {
      requestId: requestIdStr,
      operation: 'monitoring.status',
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({
      ok: false,
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
      requestId,
    });
  }
});

/**
 * Endpoint para obtener servicios monitoreados
 */
monitoringRouter.get('/services', async (req, res) => {
  const requestId = (req as RequestWithId).id;
  const requestIdStr = requestId ? String(requestId) : undefined;

  try {
    const services = getServicesStatus() as ServiceStatus[];

    const servicesResponse: ServicesResponse = {
      services,
      total: services.length,
      healthy: services.filter((s: ServiceStatus) => s.status === 'healthy')
        .length,
      timestamp: new Date().toISOString(),
      requestId,
    };

    res.json(servicesResponse);
  } catch (error: unknown) {
    const err = error as Error;
    advancedLogger.error('Error al obtener servicios monitoreados', {
      requestId: requestIdStr,
      operation: 'monitoring.services',
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({
      ok: false,
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
      requestId,
    });
  }
});

/**
 * Endpoint para obtener métricas básicas del sistema
 */
monitoringRouter.get('/metrics', async (req, res) => {
  const requestId = (req as RequestWithId).id;
  const requestIdStr = requestId ? String(requestId) : undefined;

  try {
    const metrics: SystemMetrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      environment: process.env.NODE_ENV || 'development',
      requestId,
    };

    res.json(metrics);
  } catch (error: unknown) {
    const err = error as Error;
    advancedLogger.error('Error al obtener métricas del sistema', {
      requestId: requestIdStr,
      operation: 'monitoring.metrics',
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({
      ok: false,
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
      requestId,
    });
  }
});

advancedLogger.info('[OK] Rutas de monitoreo simplificadas configuradas', {
  operation: 'monitoring.router.init',
  endpoints: [
    'GET /api/monitoring/dashboard',
    'GET /api/monitoring/status',
    'GET /api/monitoring/services',
    'GET /api/monitoring/metrics',
  ],
});
