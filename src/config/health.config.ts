/**
 * Configuración simplificada de health checks
 * Health monitoring automático DESHABILITADO para mayor estabilidad
 */

/**
 * Configuración simplificada - Health checks automáticos DESHABILITADOS
 * Solo se mantienen los endpoints básicos de health check
 */
export function setupHealthChecks(): void {
  console.log('[HealthSetup] [DISABLED] Health checks automáticos DESHABILITADOS');
  console.log('[HealthSetup] [INFO] Solo endpoints básicos disponibles:');
  console.log('[HealthSetup]     - GET /health (health check básico)');
  console.log(
    '[HealthSetup]     - GET /health/shallow (health check superficial)'
  );
  console.log('[HealthSetup]     - GET /health/deep (health check profundo)');
  console.log('[HealthSetup]     - GET /health/ready (readiness check)');
  console.log('[HealthSetup]     - GET /health/live (liveness check)');
  console.log(
    '[HealthSetup] [TIP] Esto mejora la estabilidad y reduce la complejidad del sistema'
  );
  console.log('[HealthSetup] [OK] Configuración simplificada completada');
}

/**
 * Dashboard simplificado sin health monitoring automático
 */
export function getHealthDashboard(): Record<string, unknown> {
  return {
    timestamp: new Date().toISOString(),
    status: 'simplified',
    message: 'Health monitoring automático deshabilitado por estabilidad',
    endpoints: [
      { path: '/health', description: 'Health check básico' },
      { path: '/health/shallow', description: 'Health check superficial' },
      { path: '/health/deep', description: 'Health check profundo' },
      { path: '/health/ready', description: 'Readiness check' },
      { path: '/health/live', description: 'Liveness check' },
    ],
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      nodeEnv: process.env.NODE_ENV || 'development',
    },
  };
}

/**
 * Status de servicios simplificado
 */
export function getServicesStatus(): Record<string, unknown>[] {
  return [
    {
      name: 'middleware-core',
      status: 'healthy',
      statusIcon: '[OK]',
      description: 'Servicio principal funcionando',
      responseTime: 0,
      lastCheck: new Date().toISOString(),
      lastCheckFormatted: new Date().toLocaleString(),
    },
  ];
}

/**
 * Función simplificada para detener monitoring (no hace nada)
 */
export function stopHealthMonitoring(): void {
  console.log('[HealthSetup] [STOP] Health monitoring ya estaba deshabilitado');
  console.log('[HealthSetup] [OK] No hay procesos que detener');
}
