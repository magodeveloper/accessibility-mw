#!/usr/bin/env node

/**
 * Script para ejecutar health checks manuales y mostrar el estado del sistema
 * Uso: npm run health:check
 */

import { healthMonitor } from '../src/services/health-monitor.service.js';
import { setupHealthChecks, getHealthSummary } from '../src/config/health.config.js';

async function runHealthCheck() {
    console.log('🔍 Iniciando health check manual...\n');

    try {
        // Configurar health checks
        setupHealthChecks();

        // Esperar un momento para que se ejecuten los checks iniciales
        console.log('⏳ Esperando resultados de health checks...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Mostrar resumen
        console.log(getHealthSummary());

        // Mostrar métricas adicionales
        const metrics = healthMonitor.getMetrics();
        console.log('\n📈 MÉTRICAS ADICIONALES:');
        console.log(`- Última actualización: ${metrics.lastUpdate}`);
        console.log(`- Tiempo de actividad del sistema: ${Math.floor(process.uptime() / 60)} minutos`);
        console.log(`- Uso de memoria: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`);

        // Mostrar configuración de alertas
        console.log('\n⚙️ CONFIGURACIÓN DE ALERTAS:');
        const alertsEnabled = process.env.HEALTH_ALERTS_ENABLED !== 'false';
        const webhookUrl = process.env.HEALTH_WEBHOOK_URL;
        const slackUrl = process.env.HEALTH_SLACK_WEBHOOK;

        console.log(`- Alertas habilitadas: ${alertsEnabled ? '✅' : '❌'}`);
        console.log(`- Webhook configurado: ${webhookUrl ? '✅' : '❌'}`);
        console.log(`- Slack configurado: ${slackUrl ? '✅' : '❌'}`);

        console.log('\n✅ Health check completado');

    } catch (error) {
        console.error('❌ Error ejecutando health check:', error);
        process.exit(1);
    } finally {
        // Limpiar y salir
        setTimeout(() => {
            healthMonitor.stop();
            process.exit(0);
        }, 1000);
    }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
    runHealthCheck();
}

export { runHealthCheck };
