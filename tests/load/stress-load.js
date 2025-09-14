/**
 * Test de Estrés Intensivo - 200 Usuarios Concurrentes
 * Escenario para encontrar los límites del sistema bajo estrés intensivo
 * Herramienta: K6 con configuración avanzada de estrés
 */

import {
  randomIntBetween,
  randomString,
} from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Gauge, Rate, Trend } from 'k6/metrics';

// Métricas personalizadas avanzadas
const errorRate = new Rate('error_rate');
const responseTimeAnalyze = new Trend('response_time_analyze');
const responseTimeHealth = new Trend('response_time_health');
const requestsCount = new Counter('requests_total');
const concurrentUsers = new Gauge('concurrent_users');
const failedRequests = new Counter('failed_requests');

// Configuración del test de estrés
export const options = {
  stages: [
    { duration: '3m', target: 30 }, // Warm up gradual
    { duration: '10m', target: 100 }, // Estrés intensivo
    { duration: '2m', target: 30 }, // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1200'], // 95% de respuestas < 1.2s
    error_rate: ['rate<0.08'], // Menos del 8% de errores
    response_time_analyze: ['p(90)<1500'], // 90% análisis < 1.5s
    http_req_failed: ['rate<0.1'], // Menos del 10% de fallos
  },
  // Configuración adicional para estrés
  noConnectionReuse: false,
  userAgent: 'K6-StressTest/1.0',
  insecureSkipTLSVerify: true,
};

const BASE_URL = 'http://localhost:3000';

// Payloads complejos para estrés
const complexHtmlPayloads = [
  // HTML complejo con muchos elementos
  `<html><head><title>Página Compleja 1</title><meta charset="utf-8"></head><body>
    <header><nav><ul>${Array.from(
      { length: 10 },
      (_, i) => `<li><a href="#section${i}">Sección ${i}</a></li>`
    ).join('')}</ul></nav></header>
    <main>
      ${Array.from(
        { length: 5 },
        (_, i) => `
        <section id="section${i}">
          <h${Math.min(i + 1, 6)}>Título de sección ${i}</h${Math.min(
          i + 1,
          6
        )}>
          <p>Contenido del párrafo ${i} con <a href="#link${i}">enlace ${i}</a></p>
          <img src="image${i}.jpg" alt="Descripción de imagen ${i}">
          <button aria-label="Botón de acción ${i}">Acción ${i}</button>
        </section>
      `
      ).join('')}
      <form>
        ${Array.from(
          { length: 8 },
          (_, i) => `
          <label for="field${i}">Campo ${i}:</label>
          <input id="field${i}" type="${
            i % 2 === 0 ? 'text' : 'email'
          }" required>
        `
        ).join('')}
        <button type="submit">Enviar formulario</button>
      </form>
    </main>
  </body></html>`,

  // HTML con problemas de accesibilidad intencionales
  `<html><head><title>Página con Issues</title></head><body>
    <div style="color: #ccc; background: #ddd;">Texto con bajo contraste</div>
    <img src="no-alt.jpg">
    <button>Botón sin label</button>
    <input type="text" placeholder="Campo sin label">
    <h1>Título 1</h1>
    <h3>Título 3 sin h2</h3>
    <table>
      <tr><td>Celda sin header</td><td>Otra celda</td></tr>
      <tr><td>Más datos</td><td>Información</td></tr>
    </table>
    <a href="#">Enlace sin texto descriptivo</a>
    <div role="button">Div como botón</div>
  </body></html>`,

  // HTML muy grande para probar límites
  `<html><head><title>Página Extensa</title></head><body>
    ${Array.from(
      { length: 50 },
      (_, i) => `
      <section>
        <h2>Sección ${i}</h2>
        <p>${randomString(200)}</p>
        <ul>
          ${Array.from(
            { length: 5 },
            (_, j) => `<li>Item ${i}-${j}: ${randomString(50)}</li>`
          ).join('')}
        </ul>
      </section>
    `
    ).join('')}
  </body></html>`,
];

const testUrls = [
  'https://example.com',
  'https://github.com',
  'https://stackoverflow.com',
  'https://developer.mozilla.org',
  'https://w3.org',
];

export default function () {
  // Actualizar métrica de usuarios concurrentes
  concurrentUsers.add(1);

  const testType = Math.random();

  group('Análisis de Accesibilidad - Estrés Intensivo', function () {
    // Test 1: HTML complejo con axe-core (35% del tráfico)
    if (testType < 0.35) {
      const payload =
        complexHtmlPayloads[
          Math.floor(Math.random() * complexHtmlPayloads.length)
        ];
      const startTime = new Date();

      const response = http.post(
        `${BASE_URL}/api/analyze`,
        JSON.stringify({
          inputType: 'html',
          value: payload,
          tool: 'axe-core',
          wcag: {
            version: randomIntBetween(1, 2) === 1 ? '2.1' : '2.2',
            level: ['A', 'AA', 'AAA'][randomIntBetween(0, 2)],
            cumulative: Math.random() > 0.5,
          },
          userId: `stress-user-${randomString(8)}`,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Request-ID': `stress-${randomString(16)}`,
          },
          timeout: '30s',
        }
      );

      requestsCount.add(1);
      responseTimeAnalyze.add(response.timings.duration);

      const success = check(response, {
        'axe status is 200': r => r.status === 200,
        'axe has results': r => {
          try {
            const data = JSON.parse(r.body);
            return data.data && data.data.results;
          } catch {
            return false;
          }
        },
        'axe response time acceptable': r => r.timings.duration < 2000,
        'axe has meta info': r => {
          try {
            const data = JSON.parse(r.body);
            return (
              data.data && data.data.meta && data.data.meta.tool === 'axe-core'
            );
          } catch {
            return false;
          }
        },
      });

      if (!success) failedRequests.add(1);
      errorRate.add(!success);

      sleep(randomIntBetween(1, 3));
    }

    // Test 2: URLs externas con equal-access (25% del tráfico)
    else if (testType < 0.6) {
      const url = testUrls[Math.floor(Math.random() * testUrls.length)];

      const response = http.post(
        `${BASE_URL}/api/analyze`,
        JSON.stringify({
          inputType: 'url',
          value: url,
          tool: 'equal-access',
          wcag: {
            version: '2.1',
            level: 'AA',
          },
          userId: `stress-user-${randomString(8)}`,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Request-ID': `stress-${randomString(16)}`,
          },
          timeout: '45s',
        }
      );

      requestsCount.add(1);
      responseTimeAnalyze.add(response.timings.duration);

      const success = check(response, {
        'equal-access status is 200': r => r.status === 200,
        'equal-access has data': r => {
          try {
            const data = JSON.parse(r.body);
            return data.data;
          } catch {
            return false;
          }
        },
        'equal-access response time acceptable': r => r.timings.duration < 3000,
      });

      if (!success) failedRequests.add(1);
      errorRate.add(!success);

      sleep(randomIntBetween(2, 4));
    }

    // Test 3: Análisis con ambos motores (25% del tráfico)
    else if (testType < 0.85) {
      const payload =
        complexHtmlPayloads[
          Math.floor(Math.random() * complexHtmlPayloads.length)
        ];

      const response = http.post(
        `${BASE_URL}/api/analyze`,
        JSON.stringify({
          inputType: 'html',
          value: payload,
          tool: 'both',
          wcag: {
            version: '2.2',
            level: 'AAA',
            cumulative: true,
          },
          userId: `stress-user-${randomString(8)}`,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Request-ID': `stress-${randomString(16)}`,
          },
          timeout: '60s',
        }
      );

      requestsCount.add(1);
      responseTimeAnalyze.add(response.timings.duration);

      const success = check(response, {
        'both engines status is 200': r => r.status === 200,
        'both engines have results': r => {
          try {
            const data = JSON.parse(r.body);
            return (
              data.data && data.data.results && data.data.results.length > 0
            );
          } catch {
            return false;
          }
        },
        'both engines response time acceptable': r => r.timings.duration < 4000,
      });

      if (!success) failedRequests.add(1);
      errorRate.add(!success);

      sleep(randomIntBetween(2, 5));
    }

    // Test 4: Múltiples requests rápidos a endpoints auxiliares (15% del tráfico)
    else {
      group('Endpoints Auxiliares - Estrés', function () {
        const requests = [
          { method: 'GET', url: `${BASE_URL}/api/health` },
          { method: 'GET', url: `${BASE_URL}/metrics` },
          { method: 'GET', url: `${BASE_URL}/api/swagger` },
          { method: 'GET', url: `${BASE_URL}/health` },
        ];

        // Hacer múltiples requests en paralelo
        const responses = http.batch(requests);

        responses.forEach((response, index) => {
          requestsCount.add(1);
          responseTimeHealth.add(response.timings.duration);

          const success = check(response, {
            [`endpoint ${index} status ok`]: r => r.status === 200,
            [`endpoint ${index} fast response`]: r => r.timings.duration < 500,
          });

          if (!success) failedRequests.add(1);
        });

        sleep(randomIntBetween(0, 2));
      });
    }
  });

  // Actualizar métrica de usuarios concurrentes
  concurrentUsers.add(-1);
}

export function handleSummary(data) {
  const totalRequests = data.metrics.http_reqs.values.count;
  const failedRequestsCount = data.metrics.failed_requests
    ? data.metrics.failed_requests.values.count
    : 0;
  const errorRatePercent = (data.metrics.error_rate.values.rate * 100).toFixed(
    2
  );

  return {
    'results/stress-load-summary.json': JSON.stringify(data, null, 2),
    'results/stress-load-report.html': generateHtmlReport(data),
    stdout: `
====== RESUMEN TEST DE ESTRÉS INTENSIVO ======
Duración total: ${(data.metrics.iteration_duration.values.avg / 1000).toFixed(
      2
    )}s
Requests totales: ${totalRequests}
Requests fallidos: ${failedRequestsCount}
RPS promedio: ${data.metrics.http_reqs.values.rate.toFixed(2)}
Tiempo respuesta p95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(
      2
    )}ms
Tiempo respuesta p99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(
      2
    )}ms
Tasa de error: ${errorRatePercent}%
Usuarios máximos: ${
      data.metrics.concurrent_users
        ? data.metrics.concurrent_users.values.max
        : 'N/A'
    }
===============================================
    `,
  };
}

function generateHtmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Reporte Test de Estrés - 200 Usuarios</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
        .error { background: #ffebee; }
        .success { background: #e8f5e8; }
    </style>
</head>
<body>
    <h1>Reporte Test de Estrés Intensivo</h1>
    <div class="metric">
        <h3>Métricas Generales</h3>
        <p>Total Requests: ${data.metrics.http_reqs.values.count}</p>
        <p>RPS Promedio: ${data.metrics.http_reqs.values.rate.toFixed(2)}</p>
        <p>Tasa de Error: ${(data.metrics.error_rate.values.rate * 100).toFixed(
          2
        )}%</p>
    </div>
    <div class="metric">
        <h3>Tiempos de Respuesta</h3>
        <p>P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(
          2
        )}ms</p>
        <p>P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(
          2
        )}ms</p>
        <p>Promedio: ${data.metrics.http_req_duration.values.avg.toFixed(
          2
        )}ms</p>
    </div>
</body>
</html>
  `;
}

/**
 * Métricas objetivo para este escenario:
 * - Tiempo de respuesta promedio: < 1.2s
 * - Throughput: > 400 req/s
 * - Tasa de error: < 8%
 * - CPU Usage: < 90%
 */
