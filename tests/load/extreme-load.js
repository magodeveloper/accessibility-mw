/**
 * Test de Carga Extrema - 500 Usuarios Concurrentes
 * Escenario de picos extremos para probar elasticidad y recuperación del sistema
 * Herramienta: K6 con configuración de spike testing
 */

import {
  randomIntBetween,
  randomString,
} from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Gauge, Rate, Trend } from 'k6/metrics';

// Métricas personalizadas para spike testing
const errorRate = new Rate('error_rate');
const responseTimeAnalyze = new Trend('response_time_analyze');
const responseTimeHealth = new Trend('response_time_health');
const requestsCount = new Counter('requests_total');
const concurrentUsers = new Gauge('concurrent_users');
const failedRequests = new Counter('failed_requests');
const spikeRecoveryTime = new Trend('spike_recovery_time');
const systemOverload = new Rate('system_overload');

// Configuración de spike testing extremo
export const options = {
  stages: [
    { duration: '5m', target: 50 }, // Warm up lento
    { duration: '2m', target: 250 }, // Spike rápido
    { duration: '10m', target: 250 }, // Mantener pico
    { duration: '1m', target: 500 }, // Spike extremo
    { duration: '2m', target: 500 }, // Mantener extremo
    { duration: '5m', target: 50 }, // Recovery lenta
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% de respuestas < 2s
    error_rate: ['rate<0.12'], // Menos del 12% de errores
    response_time_analyze: ['p(90)<2500'], // 90% análisis < 2.5s
    http_req_failed: ['rate<0.15'], // Menos del 15% de fallos
    system_overload: ['rate<0.20'], // Menos del 20% de sobrecarga
  },
  // Configuración específica para spike testing
  noConnectionReuse: true,
  userAgent: 'K6-SpikeTest/1.0',
  insecureSkipTLSVerify: true,
  noVUConnectionReuse: true,
  discardResponseBodies: false,
};

const BASE_URL = 'http://localhost:3000';

// Payloads extremadamente complejos para spike testing
const extremeHtmlPayloads = [
  // HTML masivo con muchos elementos
  generateMassiveHtml(),

  // HTML con estructuras complejas anidadas
  generateNestedStructureHtml(),

  // HTML con muchos problemas de accesibilidad
  generateProblematicHtml(),
];

function generateMassiveHtml() {
  return `<html><head><title>Página Masiva</title><meta charset="utf-8"></head><body>
    <header>
      <nav>
        <ul>
          ${Array.from(
            { length: 50 },
            (_, i) => `<li><a href="#section${i}">Sección ${i}</a></li>`
          ).join('')}
        </ul>
      </nav>
    </header>
    <main>
      ${Array.from(
        { length: 100 },
        (_, i) => `
        <section id="section${i}">
          <h${Math.min((i % 6) + 1, 6)}>Título ${i}</h${Math.min(
          (i % 6) + 1,
          6
        )}>
          <p>${randomString(300)}</p>
          <div>
            ${Array.from(
              { length: 10 },
              (_, j) => `
              <img src="image${i}-${j}.jpg" alt="Imagen ${i}-${j}">
              <button aria-label="Botón ${i}-${j}">Acción ${i}-${j}</button>
            `
            ).join('')}
          </div>
          <table>
            <thead>
              <tr>
                ${Array.from(
                  { length: 5 },
                  (_, k) => `<th>Columna ${k}</th>`
                ).join('')}
              </tr>
            </thead>
            <tbody>
              ${Array.from(
                { length: 20 },
                (_, row) => `
                <tr>
                  ${Array.from(
                    { length: 5 },
                    (_, col) => `<td>Dato ${row}-${col}</td>`
                  ).join('')}
                </tr>
              `
              ).join('')}
            </tbody>
          </table>
        </section>
      `
      ).join('')}
    </main>
    <footer>
      <form>
        ${Array.from(
          { length: 30 },
          (_, i) => `
          <fieldset>
            <legend>Grupo ${i}</legend>
            <label for="field${i}">Campo ${i}:</label>
            <input id="field${i}" type="text" required>
            <select aria-label="Selección ${i}">
              ${Array.from(
                { length: 10 },
                (_, j) => `<option value="${j}">Opción ${j}</option>`
              ).join('')}
            </select>
          </fieldset>
        `
        ).join('')}
        <button type="submit">Enviar formulario masivo</button>
      </form>
    </footer>
  </body></html>`;
}

function generateNestedStructureHtml() {
  function createNestedDiv(depth, maxDepth) {
    if (depth >= maxDepth)
      return `<span>Contenido profundo nivel ${depth}</span>`;
    return `
      <div role="group" aria-label="Grupo nivel ${depth}">
        <h${Math.min(depth + 1, 6)}>Nivel ${depth}</h${Math.min(depth + 1, 6)}>
        ${Array.from({ length: 3 }, () =>
          createNestedDiv(depth + 1, maxDepth)
        ).join('')}
      </div>
    `;
  }

  return `<html><head><title>Estructura Anidada</title></head><body>
    ${createNestedDiv(1, 15)}
  </body></html>`;
}

function generateProblematicHtml() {
  return `<html><head><title>Problemas de Accesibilidad</title></head><body>
    ${Array.from(
      { length: 50 },
      (_, i) => `
      <div style="color: #${i % 2 === 0 ? 'eee' : 'ddd'}; background: #${
        i % 2 === 0 ? 'fff' : 'eee'
      };">
        Texto con contraste problemático ${i}
      </div>
      <img src="problema${i}.jpg">
      <button onclick="alert('click')">Botón ${i}</button>
      <input type="text" placeholder="Campo sin label ${i}">
      <a href="#" onclick="return false;">Enlace problemático ${i}</a>
      <div role="button" onclick="void(0)">Div como botón ${i}</div>
    `
    ).join('')}
    <table>
      ${Array.from(
        { length: 50 },
        (_, i) => `
        <tr>
          <td>Celda sin header ${i}</td>
          <td>Datos ${i}</td>
          <td><input type="checkbox"> Sin label ${i}</td>
        </tr>
      `
      ).join('')}
    </table>
  </body></html>`;
}

const testUrls = [
  'https://example.com',
  'https://github.com',
  'https://stackoverflow.com',
  'https://developer.mozilla.org',
  'https://w3.org',
  'https://google.com',
  'https://microsoft.com',
  'https://amazon.com',
];

export default function () {
  // Actualizar métrica de usuarios concurrentes
  concurrentUsers.add(1);

  const testType = Math.random();
  const startTime = new Date();

  group('Análisis de Accesibilidad - Spike Extremo', function () {
    // Test 1: HTML extremadamente complejo (30% del tráfico)
    if (testType < 0.3) {
      const payload =
        extremeHtmlPayloads[
          Math.floor(Math.random() * extremeHtmlPayloads.length)
        ];
      const requestStart = new Date();

      const response = http.post(
        `${BASE_URL}/api/analyze`,
        JSON.stringify({
          inputType: 'html',
          value: payload,
          tool: 'axe-core',
          wcag: {
            version: ['2.1', '2.2'][randomIntBetween(0, 1)],
            level: ['A', 'AA', 'AAA'][randomIntBetween(0, 2)],
            cumulative: Math.random() > 0.3,
          },
          userId: `spike-user-${randomString(12)}`,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Request-ID': `spike-${randomString(20)}`,
            'X-Load-Test': 'extreme-spike',
          },
          timeout: '120s',
        }
      );

      requestsCount.add(1);
      responseTimeAnalyze.add(response.timings.duration);

      const success = check(response, {
        'extreme axe status ok': r => r.status === 200 || r.status === 202,
        'extreme axe has results': r => {
          try {
            const data = JSON.parse(r.body);
            return data.data && (data.data.results || data.data.message);
          } catch {
            return false;
          }
        },
        'extreme axe not timeout': r => r.timings.duration < 30000,
      });

      // Detectar sobrecarga del sistema
      const isOverloaded =
        response.timings.duration > 5000 || response.status >= 500;
      systemOverload.add(isOverloaded);

      if (!success) failedRequests.add(1);
      errorRate.add(!success);

      sleep(randomIntBetween(0, 2));
    }

    // Test 2: Múltiples URLs concurrentes (25% del tráfico)
    else if (testType < 0.55) {
      const url = testUrls[Math.floor(Math.random() * testUrls.length)];

      const response = http.post(
        `${BASE_URL}/api/analyze`,
        JSON.stringify({
          inputType: 'url',
          value: url,
          tool: ['equal-access', 'axe-core'][randomIntBetween(0, 1)],
          wcag: {
            version: '2.1',
            level: 'AA',
          },
          userId: `spike-user-${randomString(12)}`,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Request-ID': `spike-${randomString(20)}`,
            'X-Load-Test': 'extreme-spike',
          },
          timeout: '90s',
        }
      );

      requestsCount.add(1);
      responseTimeAnalyze.add(response.timings.duration);

      const success = check(response, {
        'url analysis status ok': r => r.status === 200 || r.status === 202,
        'url analysis has data': r => {
          try {
            const data = JSON.parse(r.body);
            return data.data;
          } catch {
            return false;
          }
        },
      });

      const isOverloaded =
        response.timings.duration > 8000 || response.status >= 500;
      systemOverload.add(isOverloaded);

      if (!success) failedRequests.add(1);
      errorRate.add(!success);

      sleep(randomIntBetween(1, 3));
    }

    // Test 3: Análisis con ambos motores bajo presión (20% del tráfico)
    else if (testType < 0.75) {
      const payload =
        extremeHtmlPayloads[
          Math.floor(Math.random() * extremeHtmlPayloads.length)
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
          userId: `spike-user-${randomString(12)}`,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Request-ID': `spike-${randomString(20)}`,
            'X-Load-Test': 'extreme-spike',
          },
          timeout: '180s',
        }
      );

      requestsCount.add(1);
      responseTimeAnalyze.add(response.timings.duration);

      const success = check(response, {
        'both engines spike status': r => r.status === 200 || r.status === 202,
        'both engines spike data': r => {
          try {
            const data = JSON.parse(r.body);
            return data.data;
          } catch {
            return false;
          }
        },
      });

      const isOverloaded =
        response.timings.duration > 10000 || response.status >= 500;
      systemOverload.add(isOverloaded);

      if (!success) failedRequests.add(1);
      errorRate.add(!success);

      sleep(randomIntBetween(1, 4));
    }

    // Test 4: Bombardeo de endpoints auxiliares (25% del tráfico)
    else {
      group('Bombardeo de Endpoints', function () {
        const batchSize = randomIntBetween(5, 15);
        const requests = [];

        for (let i = 0; i < batchSize; i++) {
          const endpoints = [
            { method: 'GET', url: `${BASE_URL}/api/health` },
            { method: 'GET', url: `${BASE_URL}/metrics` },
            { method: 'GET', url: `${BASE_URL}/api/swagger` },
            { method: 'GET', url: `${BASE_URL}/health` },
            { method: 'GET', url: `${BASE_URL}/` },
          ];

          requests.push(endpoints[i % endpoints.length]);
        }

        const responses = http.batch(requests);

        responses.forEach((response, index) => {
          requestsCount.add(1);
          responseTimeHealth.add(response.timings.duration);

          const success = check(response, {
            [`batch endpoint ${index} status`]: r => r.status === 200,
            [`batch endpoint ${index} fast`]: r => r.timings.duration < 2000,
          });

          const isOverloaded =
            response.timings.duration > 3000 || response.status >= 500;
          systemOverload.add(isOverloaded);

          if (!success) failedRequests.add(1);
        });

        sleep(randomIntBetween(0, 1));
      });
    }
  });

  // Medir tiempo de recuperación durante spikes
  const endTime = new Date();
  spikeRecoveryTime.add(endTime - startTime);

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
  const overloadPercent = (
    data.metrics.system_overload.values.rate * 100
  ).toFixed(2);

  return {
    'results/extreme-load-summary.json': JSON.stringify(data, null, 2),
    'results/extreme-load-detailed.html': generateDetailedHtmlReport(data),
    stdout: `
====== RESUMEN TEST SPIKE EXTREMO - 500 USUARIOS ======
Duración total: ${(data.metrics.iteration_duration.values.avg / 1000).toFixed(
      2
    )}s
Requests totales: ${totalRequests}
Requests fallidos: ${failedRequestsCount}
RPS máximo: ${data.metrics.http_reqs.values.rate.toFixed(2)}
Tiempo respuesta p95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(
      2
    )}ms
Tiempo respuesta p99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(
      2
    )}ms
Tasa de error: ${errorRatePercent}%
Tasa de sobrecarga: ${overloadPercent}%
Usuarios máximos concurrentes: ${
      data.metrics.concurrent_users
        ? data.metrics.concurrent_users.values.max
        : 'N/A'
    }
Tiempo recuperación promedio: ${
      data.metrics.spike_recovery_time
        ? (data.metrics.spike_recovery_time.values.avg / 1000).toFixed(2)
        : 'N/A'
    }s
========================================================
    `,
  };
}

function generateDetailedHtmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Reporte Detallado - Test Spike Extremo</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .metric { background: #f9f9f9; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #3498db; }
        .error { border-left-color: #e74c3c; background: #ffebee; }
        .warning { border-left-color: #f39c12; background: #fff8e1; }
        .success { border-left-color: #2ecc71; background: #e8f5e8; }
        .critical { border-left-color: #8e24aa; background: #f3e5f5; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        h1 { color: #2c3e50; text-align: center; }
        h2 { color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        .stat-value { font-size: 2em; font-weight: bold; color: #3498db; }
        .chart { height: 200px; background: #ecf0f1; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #7f8c8d; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Reporte Detallado - Test Spike Extremo (500 usuarios)</h1>
        
        <div class="grid">
            <div class="metric critical">
                <h3>📊 Métricas Críticas</h3>
                <p>Total Requests: <span class="stat-value">${
                  data.metrics.http_reqs.values.count
                }</span></p>
                <p>RPS Máximo: <span class="stat-value">${data.metrics.http_reqs.values.rate.toFixed(
                  2
                )}</span></p>
                <p>Usuarios Máximos: <span class="stat-value">${
                  data.metrics.concurrent_users
                    ? data.metrics.concurrent_users.values.max
                    : 'N/A'
                }</span></p>
            </div>
            
            <div class="metric ${
              data.metrics.error_rate.values.rate * 100 > 10
                ? 'error'
                : 'warning'
            }">
                <h3>❌ Tasa de Errores</h3>
                <p class="stat-value">${(
                  data.metrics.error_rate.values.rate * 100
                ).toFixed(2)}%</p>
                <p>Objetivo: < 12%</p>
                <p>Estado: ${
                  data.metrics.error_rate.values.rate * 100 > 12
                    ? 'CRÍTICO'
                    : 'ACEPTABLE'
                }</p>
            </div>
            
            <div class="metric ${
              data.metrics.system_overload
                ? data.metrics.system_overload.values.rate * 100 > 20
                  ? 'error'
                  : 'warning'
                : 'success'
            }">
                <h3>🔥 Sobrecarga del Sistema</h3>
                <p class="stat-value">${
                  data.metrics.system_overload
                    ? (data.metrics.system_overload.values.rate * 100).toFixed(
                        2
                      )
                    : '0'
                }%</p>
                <p>Objetivo: < 20%</p>
                <p>Estado: ${
                  data.metrics.system_overload &&
                  data.metrics.system_overload.values.rate * 100 > 20
                    ? 'SOBRECARGADO'
                    : 'ESTABLE'
                }</p>
            </div>
        </div>
        
        <h2>⏱️ Tiempos de Respuesta</h2>
        <div class="grid">
            <div class="metric">
                <h3>Percentiles de Respuesta</h3>
                <p>P50 (Mediana): ${data.metrics.http_req_duration.values[
                  'p(50)'
                ].toFixed(2)}ms</p>
                <p>P95: ${data.metrics.http_req_duration.values[
                  'p(95)'
                ].toFixed(2)}ms</p>
                <p>P99: ${data.metrics.http_req_duration.values[
                  'p(99)'
                ].toFixed(2)}ms</p>
                <p>Máximo: ${data.metrics.http_req_duration.values.max.toFixed(
                  2
                )}ms</p>
            </div>
            
            <div class="metric">
                <h3>Análisis de Rendimiento</h3>
                <p>Promedio: ${data.metrics.http_req_duration.values.avg.toFixed(
                  2
                )}ms</p>
                <p>Mínimo: ${data.metrics.http_req_duration.values.min.toFixed(
                  2
                )}ms</p>
                <p>Objetivo P95: < 2000ms</p>
                <p>Estado: ${
                  data.metrics.http_req_duration.values['p(95)'] > 2000
                    ? 'DEGRADADO'
                    : 'ÓPTIMO'
                }</p>
            </div>
        </div>
        
        <h2>🔍 Análisis de Recuperación</h2>
        <div class="metric ${
          data.metrics.spike_recovery_time &&
          data.metrics.spike_recovery_time.values.avg > 60000
            ? 'warning'
            : 'success'
        }">
            <h3>Tiempo de Recuperación</h3>
            <p>Promedio: ${
              data.metrics.spike_recovery_time
                ? (data.metrics.spike_recovery_time.values.avg / 1000).toFixed(
                    2
                  )
                : 'N/A'
            }s</p>
            <p>Objetivo: < 60s</p>
            <p>Evaluación: El sistema ${
              data.metrics.spike_recovery_time &&
              data.metrics.spike_recovery_time.values.avg > 60000
                ? 'tardó más de lo esperado'
                : 'se recuperó dentro del tiempo objetivo'
            } después de los picos de carga.</p>
        </div>
        
        <h2>📈 Recomendaciones</h2>
        <div class="metric">
            <h3>Conclusiones del Test</h3>
            <ul>
                <li>${
                  data.metrics.error_rate.values.rate * 100 > 12 ? '🔴' : '🟢'
                } Tasa de error: ${
    data.metrics.error_rate.values.rate * 100 > 12
      ? 'Requiere optimización'
      : 'Dentro de límites aceptables'
  }</li>
                <li>${
                  data.metrics.http_req_duration.values['p(95)'] > 2000
                    ? '🔴'
                    : '🟢'
                } Rendimiento: ${
    data.metrics.http_req_duration.values['p(95)'] > 2000
      ? 'Necesita mejoras en tiempo de respuesta'
      : 'Rendimiento satisfactorio'
  }</li>
                <li>${
                  data.metrics.system_overload &&
                  data.metrics.system_overload.values.rate * 100 > 20
                    ? '🔴'
                    : '🟢'
                } Estabilidad: ${
    data.metrics.system_overload &&
    data.metrics.system_overload.values.rate * 100 > 20
      ? 'Sistema muestra signos de sobrecarga'
      : 'Sistema mantiene estabilidad'
  }</li>
                <li>💡 El sistema procesó ${
                  data.metrics.http_reqs.values.count
                } requests con ${
    data.metrics.concurrent_users
      ? data.metrics.concurrent_users.values.max
      : '500'
  } usuarios máximos concurrentes</li>
            </ul>
        </div>
        
        <div class="chart">
            📊 Gráficos detallados disponibles en archivo JSON
        </div>
    </div>
</body>
</html>
  `;
}

/**
 * Métricas objetivo para este escenario extremo:
 * - Tiempo de respuesta promedio: < 2s
 * - Throughput: > 600 req/s
 * - Tasa de error: < 12%
 * - Tiempo de recuperación: < 60s
 * - Sobrecarga del sistema: < 20%
 */
