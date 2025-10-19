import { EventEmitter } from 'events';
import { advancedLogger } from './logging.service';

interface HealthCheckConfig {
  name: string;
  url: string;
  timeout: number;
  interval: number;
  retries: number;
  expectedStatus?: number;
}

interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime: number;
  timestamp: Date;
  error?: string;
  details?: Record<string, unknown>;
}

interface AlertConfig {
  enabled: boolean;
  webhook?: string;
  slack?: string;
  cooldownMs: number;
}

class HealthMonitor extends EventEmitter {
  private readonly checks: Map<string, HealthCheckConfig> = new Map();
  private readonly results: Map<string, HealthCheckResult> = new Map();
  private readonly timers: Map<string, NodeJS.Timeout> = new Map();
  private readonly alertCooldowns: Map<string, number> = new Map();
  private readonly alertConfig: AlertConfig;

  constructor(alertConfig?: Partial<AlertConfig>) {
    super();
    this.alertConfig = {
      enabled: true,
      cooldownMs: 5 * 60 * 1000, // 5 minutes cooldown
      ...alertConfig,
    };
  }

  /**
   * Registra un nuevo health check
   */
  registerCheck(config: HealthCheckConfig): void {
    advancedLogger.info('[HealthMonitor] Registering health check', {
      name: config.name,
      url: config.url,
    });

    this.checks.set(config.name, config);
    this.results.set(config.name, {
      name: config.name,
      status: 'unknown',
      responseTime: 0,
      timestamp: new Date(),
    });

    // Iniciar el monitoreo automático
    this.startMonitoring(config.name);
  }

  /**
   * Inicia el monitoreo automático para un check específico
   */
  private startMonitoring(checkName: string): void {
    const config = this.checks.get(checkName);
    if (!config) return;

    // Ejecutar check inmediatamente
    this.executeCheck(checkName);

    // Programar checks periódicos
    const timer = setInterval(() => {
      this.executeCheck(checkName);
    }, config.interval);

    this.timers.set(checkName, timer);
  }

  /**
   * Ejecuta un health check específico
   */
  private async executeCheck(checkName: string): Promise<void> {
    const config = this.checks.get(checkName);
    if (!config) return;

    const startTime = Date.now();
    let result: HealthCheckResult = {
      name: checkName,
      status: 'unknown',
      responseTime: 0,
      timestamp: new Date(),
    };

    try {
      advancedLogger.debug('[HealthMonitor] Executing check', { checkName });

      for (let attempt = 1; attempt <= config.retries; attempt++) {
        try {
          // Crear AbortController para timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(
            () => controller.abort(),
            config.timeout
          );

          const response = await fetch(config.url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
              'User-Agent': 'HealthMonitor/1.0',
            },
          });

          clearTimeout(timeoutId);
          const responseTime = Date.now() - startTime;
          const expectedStatus = config.expectedStatus || 200;

          if (response.status === expectedStatus) {
            result = {
              name: checkName,
              status: 'healthy',
              responseTime,
              timestamp: new Date(),
            };
            break;
          } else {
            throw new Error(
              `Unexpected status: ${response.status} (expected ${expectedStatus})`
            );
          }
        } catch (error) {
          if (attempt === config.retries) {
            throw error; // Re-throw on final attempt
          }

          advancedLogger.warn('[HealthMonitor] Check attempt failed', {
            checkName,
            attempt,
            retries: config.retries,
            error,
          });

          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    } catch (error) {
      result = {
        name: checkName,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : String(error),
      };
    }

    // Actualizar resultado y detectar cambios de estado
    const previousResult = this.results.get(checkName);
    this.results.set(checkName, result);

    // Emitir eventos
    this.emit('check-completed', result);

    if (previousResult && previousResult.status !== result.status) {
      this.emit('status-changed', {
        previous: previousResult,
        current: result,
      });

      if (result.status === 'unhealthy') {
        this.handleUnhealthyService(result);
      } else if (
        result.status === 'healthy' &&
        previousResult.status === 'unhealthy'
      ) {
        this.handleServiceRecovered(result);
      }
    }

    advancedLogger.info('[HealthMonitor] Check completed', {
      checkName,
      status: result.status,
      responseTime: result.responseTime,
    });
  }

  /**
   * Maneja servicios que se vuelven no saludables
   */
  private async handleUnhealthyService(
    result: HealthCheckResult
  ): Promise<void> {
    const cooldownKey = `${result.name}-unhealthy`;
    const now = Date.now();
    const lastAlert = this.alertCooldowns.get(cooldownKey) || 0;

    if (now - lastAlert < this.alertConfig.cooldownMs) {
      advancedLogger.debug(
        '[HealthMonitor] Alert cooldown active, skipping notification',
        {
          serviceName: result.name,
        }
      );
      return;
    }

    this.alertCooldowns.set(cooldownKey, now);

    const alertMessage =
      `🚨 ALERT: Service "${result.name}" is UNHEALTHY\n` +
      `Error: ${result.error}\n` +
      `Response Time: ${result.responseTime}ms\n` +
      `Timestamp: ${result.timestamp.toISOString()}`;

    await this.sendAlert(alertMessage, 'unhealthy', result);
  }

  /**
   * Maneja servicios que se recuperan
   */
  private async handleServiceRecovered(
    result: HealthCheckResult
  ): Promise<void> {
    const alertMessage =
      `✅ RECOVERY: Service "${result.name}" is HEALTHY again\n` +
      `Response Time: ${result.responseTime}ms\n` +
      `Timestamp: ${result.timestamp.toISOString()}`;

    await this.sendAlert(alertMessage, 'recovered', result);
  }

  /**
   * Envía alertas a través de diferentes canales
   */
  private async sendAlert(
    message: string,
    type: 'unhealthy' | 'recovered',
    result: HealthCheckResult
  ): Promise<void> {
    if (!this.alertConfig.enabled) return;

    advancedLogger.warn('[HealthMonitor] ALERT', {
      type: type.toUpperCase(),
      serviceName: result.name,
      message,
    });

    // Webhook genérico
    if (this.alertConfig.webhook) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        await fetch(this.alertConfig.webhook, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: message,
            service: result.name,
            type,
            timestamp: result.timestamp.toISOString(),
            details: result,
          }),
        });

        clearTimeout(timeoutId);
        advancedLogger.info('[HealthMonitor] Webhook alert sent successfully');
      } catch (error) {
        advancedLogger.error('[HealthMonitor] Failed to send webhook alert', {
          error,
        });
      }
    }

    // Slack webhook
    if (this.alertConfig.slack) {
      try {
        const color = type === 'unhealthy' ? 'danger' : 'good';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        await fetch(this.alertConfig.slack, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attachments: [
              {
                color,
                title: `Health Monitor Alert`,
                text: message,
                fields: [
                  { title: 'Service', value: result.name, short: true },
                  {
                    title: 'Status',
                    value: result.status.toUpperCase(),
                    short: true,
                  },
                  {
                    title: 'Response Time',
                    value: `${result.responseTime}ms`,
                    short: true,
                  },
                ],
                timestamp: Math.floor(result.timestamp.getTime() / 1000),
              },
            ],
          }),
        });

        clearTimeout(timeoutId);
        advancedLogger.info('[HealthMonitor] Slack alert sent successfully');
      } catch (error) {
        advancedLogger.error('[HealthMonitor] Failed to send Slack alert', {
          error,
        });
      }
    }
  }

  /**
   * Obtiene el estado actual de todos los checks
   */
  getStatus(): {
    overall: 'healthy' | 'unhealthy' | 'partial';
    services: HealthCheckResult[];
  } {
    const services = Array.from(this.results.values());
    const unhealthyCount = services.filter(
      s => s.status === 'unhealthy'
    ).length;

    let overall: 'healthy' | 'unhealthy' | 'partial' = 'healthy';
    if (unhealthyCount > 0) {
      overall = unhealthyCount === services.length ? 'unhealthy' : 'partial';
    }

    return { overall, services };
  }

  /**
   * Obtiene métricas del monitor
   */
  getMetrics() {
    const services = Array.from(this.results.values());
    const avgResponseTime =
      services.length > 0
        ? services.reduce((sum, s) => sum + s.responseTime, 0) / services.length
        : 0;

    return {
      totalServices: services.length,
      healthyServices: services.filter(s => s.status === 'healthy').length,
      unhealthyServices: services.filter(s => s.status === 'unhealthy').length,
      averageResponseTime: Math.round(avgResponseTime),
      uptime: process.uptime(),
      lastUpdate: new Date().toISOString(),
    };
  }

  /**
   * Detiene todos los checks
   */
  stop(): void {
    advancedLogger.info('[HealthMonitor] Stopping health monitor');

    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }

    this.timers.clear();
    this.removeAllListeners();
  }
}

// Instancia singleton del monitor
export const healthMonitor = new HealthMonitor({
  enabled: process.env.HEALTH_ALERTS_ENABLED !== 'false',
  webhook: process.env.HEALTH_WEBHOOK_URL,
  slack: process.env.HEALTH_SLACK_WEBHOOK,
  cooldownMs: parseInt(process.env.HEALTH_ALERT_COOLDOWN_MS || '300000'), // 5 min default
});

export { HealthMonitor, type HealthCheckConfig, type HealthCheckResult };
