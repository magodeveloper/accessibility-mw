/**
 * Test de Carga Ligera K6 - 20 Usuarios Concurrentes
 * Escenario básico para validar rendimiento bajo condiciones normales
 * Herramienta: K6 con configuración básica
 */

import {
  randomIntBetween,
  randomString,
} from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';

// Métricas personalizadas para carga ligera
const errorRate = new Rate('error_rate');
const responseTimeAnalyze = new Trend('response_time_analyze');
const responseTimeHealth = new Trend('response_time_health');
const requestsCount = new Counter('requests_total');

// Configuración para 20 usuarios concurrentes
export const options = {
  stages: [
    { duration: '1m', target: 5 }, // Warm up
    { duration: '3m', target: 20 }, // Carga estable
    { duration: '1m', target: 5 }, // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% de respuestas < 500ms
    error_rate: ['rate<0.02'], // Menos del 2% de errores
    response_time_analyze: ['p(90)<600'], // 90% análisis < 600ms
    http_req_failed: ['rate<0.05'], // Menos del 5% de fallos
  },
  userAgent: 'K6-LightLoad/1.0',
};

const BASE_URL = 'http://localhost:3000';

// Payloads ligeros para 20 usuarios
const lightHtmlPayloads = [
  generateBasicHtml(),
  generateSimpleForm(),
  generateContentPage(),
];

function generateBasicHtml() {
  return `<html><head><title>Página Básica</title></head><body>
    <header><h1>Test de Accesibilidad</h1></header>
    <main>
      <p>Contenido principal para testing de accesibilidad.</p>
      <ul>
        ${Array.from({ length: 5 }, (_, i) => `<li>Item ${i + 1}</li>`).join(
          ''
        )}
      </ul>
      <button>Acción principal</button>
    </main>
    <footer><p>Copyright 2025</p></footer>
  </body></html>`;
}

function generateSimpleForm() {
  return `<html><head><title>Formulario Simple</title></head><body>
    <form>
      <fieldset>
        <legend>Información básica</legend>
        <label for="name">Nombre:</label>
        <input id="name" type="text" required>
        <label for="email">Email:</label>
        <input id="email" type="email" required>
        <label for="message">Mensaje:</label>
        <textarea id="message" required></textarea>
        <button type="submit">Enviar</button>
      </fieldset>
    </form>
  </body></html>`;
}

function generateContentPage() {
  return `<html><head><title>Página de Contenido</title></head><body>
    <nav>
      <ul>
        ${Array.from(
          { length: 5 },
          (_, i) => `<li><a href="#section${i}">Sección ${i}</a></li>`
        ).join('')}
      </ul>
    </nav>
    <main>
      ${Array.from(
        { length: 3 },
        (_, i) => `
        <section id="section${i}">
          <h2>Título ${i}</h2>
          <p>Contenido de la sección ${i} para análisis de accesibilidad.</p>
          <img src="image${i}.jpg" alt="Imagen ${i}">
        </section>
      `
      ).join('')}
    </main>
  </body></html>`;
}

const testUrls = [
  'https://example.com',
  'https://github.com',
  'https://developer.mozilla.org',
];

export default function () {
  const testType = Math.random();

  group('Análisis de Accesibilidad - Carga Ligera', function () {
    // Test 1: HTML básico (60% del tráfico)
    if (testType < 0.6) {
      const payload =
        lightHtmlPayloads[Math.floor(Math.random() * lightHtmlPayloads.length)];

      const response = http.post(
        `${BASE_URL}/api/analyze`,
        JSON.stringify({
          inputType: 'html',
          value: payload,
          tool: 'axe-core',
          wcag: {
            version: '2.1',
            level: 'AA',
          },
          userId: `light-user-${randomString(8)}`,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Request-ID': `light-${randomString(16)}`,
            'X-Load-Test': 'light-load',
          },
          timeout: '30s',
        }
      );

      requestsCount.add(1);
      responseTimeAnalyze.add(response.timings.duration);

      const success = check(response, {
        'light axe status ok': r => r.status === 200 || r.status === 202,
        'light axe has results': r => {
          try {
            const data = JSON.parse(r.body);
            return data.data && (data.data.results || data.data.message);
          } catch {
            return false;
          }
        },
        'light axe fast response': r => r.timings.duration < 1000,
      });

      errorRate.add(!success);
      sleep(randomIntBetween(1, 3));
    }

    // Test 2: URLs externas (25% del tráfico)
    else if (testType < 0.85) {
      const url = testUrls[Math.floor(Math.random() * testUrls.length)];

      const response = http.post(
        `${BASE_URL}/api/analyze`,
        JSON.stringify({
          inputType: 'url',
          value: url,
          tool: 'axe-core',
          wcag: {
            version: '2.1',
            level: 'AA',
          },
          userId: `light-user-${randomString(8)}`,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Request-ID': `light-${randomString(16)}`,
            'X-Load-Test': 'light-load',
          },
          timeout: '45s',
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

      errorRate.add(!success);
      sleep(randomIntBetween(2, 4));
    }

    // Test 3: Health checks (15% del tráfico)
    else {
      const endpoints = [
        { method: 'GET', url: `${BASE_URL}/api/health` },
        { method: 'GET', url: `${BASE_URL}/health` },
        { method: 'GET', url: `${BASE_URL}/` },
      ];

      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const response = http.get(endpoint.url);

      requestsCount.add(1);
      responseTimeHealth.add(response.timings.duration);

      const success = check(response, {
        'health check status ok': r => r.status === 200,
        'health check fast': r => r.timings.duration < 500,
      });

      errorRate.add(!success);
      sleep(randomIntBetween(1, 2));
    }
  });
}

export function handleSummary(data) {
  const totalRequests = data.metrics.http_reqs.values.count;
  const errorRatePercent = (data.metrics.error_rate.values.rate * 100).toFixed(
    2
  );

  return {
    'results/light-load-k6-summary.json': JSON.stringify(data, null, 2),
    stdout: `
====== RESUMEN TEST CARGA LIGERA K6 - 20 USUARIOS ======
Duración total: ${(data.metrics.iteration_duration.values.avg / 1000).toFixed(
      2
    )}s
Requests totales: ${totalRequests}
RPS promedio: ${data.metrics.http_reqs.values.rate.toFixed(2)}
Tiempo respuesta p95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(
      2
    )}ms
Tiempo respuesta promedio: ${data.metrics.http_req_duration.values.avg.toFixed(
      2
    )}ms
Tasa de error: ${errorRatePercent}%
========================================================
    `,
  };
}

/**
 * Métricas objetivo para este escenario ligero:
 * - Tiempo de respuesta promedio: < 300ms
 * - Throughput: > 50 req/s
 * - Tasa de error: < 2%
 * - P95: < 500ms
 */
