/**
 * Test de Carga Media K6 - 50 Usuarios Concurrentes
 * Escenario intermedio para evaluar rendimiento bajo carga moderada
 * Herramienta: K6 con configuración media
 */

import {
  randomIntBetween,
  randomString,
} from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';

// Métricas personalizadas para carga media
const errorRate = new Rate('error_rate');
const responseTimeAnalyze = new Trend('response_time_analyze');
const responseTimeHealth = new Trend('response_time_health');
const requestsCount = new Counter('requests_total');
const dataTransfer = new Counter('data_transfer_bytes');

// Configuración para 50 usuarios concurrentes
export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Warm up gradual
    { duration: '5m', target: 50 }, // Carga estable media
    { duration: '3m', target: 30 }, // Reducción gradual
    { duration: '1m', target: 0 }, // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'], // 95% de respuestas < 800ms
    error_rate: ['rate<0.03'], // Menos del 3% de errores
    response_time_analyze: ['p(90)<1000'], // 90% análisis < 1s
    http_req_failed: ['rate<0.05'], // Menos del 5% de fallos
    checks: ['rate>0.95'], // 95% de checks exitosos
  },
  userAgent: 'K6-MediumLoad/1.0',
};

const BASE_URL = 'http://localhost:3000';

// Payloads de tamaño medio para 50 usuarios
const mediumHtmlPayloads = [
  generateMediumComplexHtml(),
  generateFormWithValidation(),
  generateDashboardLayout(),
  generateNavigationPage(),
];

function generateMediumComplexHtml() {
  return `<html>
    <head>
      <title>Página Compleja Media</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
      <header role="banner">
        <nav aria-label="Main navigation">
          <ul>
            ${Array.from(
              { length: 8 },
              (_, i) => `<li><a href="#page${i}">Página ${i}</a></li>`
            ).join('')}
          </ul>
        </nav>
      </header>
      <main role="main">
        <section aria-labelledby="section1">
          <h1 id="section1">Contenido Principal</h1>
          <div class="content-grid">
            ${Array.from(
              { length: 6 },
              (_, i) => `
              <article>
                <h2>Artículo ${i + 1}</h2>
                <p>Descripción detallada del artículo ${
                  i + 1
                } para testing de accesibilidad.</p>
                <img src="article${i}.jpg" alt="Imagen del artículo ${i + 1}">
                <button aria-describedby="desc${i}">Leer más</button>
                <div id="desc${i}" class="sr-only">Expandir contenido del artículo ${
                i + 1
              }</div>
              </article>
            `
            ).join('')}
          </div>
        </section>
        <aside role="complementary">
          <h2>Contenido relacionado</h2>
          <ul>
            ${Array.from(
              { length: 10 },
              (_, i) =>
                `<li><a href="#related${i}">Enlace relacionado ${i}</a></li>`
            ).join('')}
          </ul>
        </aside>
      </main>
      <footer role="contentinfo">
        <div class="footer-content">
          <p>© 2025 Test de Accesibilidad - Carga Media</p>
          <nav aria-label="Footer navigation">
            <ul>
              <li><a href="#privacy">Privacidad</a></li>
              <li><a href="#terms">Términos</a></li>
              <li><a href="#contact">Contacto</a></li>
            </ul>
          </nav>
        </div>
      </footer>
    </body>
  </html>`;
}

function generateFormWithValidation() {
  return `<html>
    <head>
      <title>Formulario con Validación</title>
    </head>
    <body>
      <main>
        <h1>Formulario de Registro Completo</h1>
        <form novalidate>
          <fieldset>
            <legend>Información Personal</legend>
            <div class="form-group">
              <label for="firstName">Nombre *</label>
              <input id="firstName" type="text" required aria-describedby="firstName-error">
              <div id="firstName-error" class="error" aria-live="polite"></div>
            </div>
            <div class="form-group">
              <label for="lastName">Apellido *</label>
              <input id="lastName" type="text" required aria-describedby="lastName-error">
              <div id="lastName-error" class="error" aria-live="polite"></div>
            </div>
            <div class="form-group">
              <label for="email">Email *</label>
              <input id="email" type="email" required aria-describedby="email-error email-help">
              <div id="email-help" class="help">Formato: usuario@dominio.com</div>
              <div id="email-error" class="error" aria-live="polite"></div>
            </div>
          </fieldset>
          <fieldset>
            <legend>Preferencias</legend>
            <div class="form-group">
              <label for="country">País</label>
              <select id="country">
                <option value="">Seleccionar país</option>
                ${['España', 'México', 'Argentina', 'Colombia', 'Chile']
                  .map(
                    country =>
                      `<option value="${country.toLowerCase()}">${country}</option>`
                  )
                  .join('')}
              </select>
            </div>
            <fieldset>
              <legend>Tipo de cuenta</legend>
              ${['personal', 'empresa', 'estudiante']
                .map(
                  type => `
                <div class="radio-group">
                  <input type="radio" id="${type}" name="accountType" value="${type}">
                  <label for="${type}">${
                    type.charAt(0).toUpperCase() + type.slice(1)
                  }</label>
                </div>
              `
                )
                .join('')}
            </fieldset>
            <div class="form-group">
              <label>
                <input type="checkbox" required>
                Acepto los términos y condiciones *
              </label>
            </div>
          </fieldset>
          <div class="form-actions">
            <button type="reset">Limpiar</button>
            <button type="submit">Registrarse</button>
          </div>
        </form>
      </main>
    </body>
  </html>`;
}

function generateDashboardLayout() {
  return `<html>
    <head>
      <title>Dashboard de Análisis</title>
    </head>
    <body>
      <header>
        <h1>Dashboard de Accesibilidad</h1>
        <nav aria-label="Dashboard navigation">
          <ul>
            <li><a href="#overview" aria-current="page">Resumen</a></li>
            <li><a href="#reports">Reportes</a></li>
            <li><a href="#settings">Configuración</a></li>
          </ul>
        </nav>
      </header>
      <main>
        <div class="dashboard-grid">
          <section id="overview" class="widget">
            <h2>Métricas Principales</h2>
            <div class="metrics">
              ${Array.from(
                { length: 4 },
                (_, i) => `
                <div class="metric-card">
                  <h3>Métrica ${i + 1}</h3>
                  <div class="metric-value" aria-describedby="metric${i}-desc">
                    ${randomIntBetween(75, 98)}%
                  </div>
                  <div id="metric${i}-desc">Puntuación de accesibilidad</div>
                </div>
              `
              ).join('')}
            </div>
          </section>
          <section class="widget">
            <h2>Últimos Análisis</h2>
            <table>
              <thead>
                <tr>
                  <th scope="col">URL</th>
                  <th scope="col">Puntuación</th>
                  <th scope="col">Errores</th>
                  <th scope="col">Fecha</th>
                </tr>
              </thead>
              <tbody>
                ${Array.from(
                  { length: 8 },
                  (_, i) => `
                  <tr>
                    <td>https://ejemplo${i}.com</td>
                    <td>${randomIntBetween(70, 95)}</td>
                    <td>${randomIntBetween(0, 10)}</td>
                    <td>2025-01-${String(15 + i).padStart(2, '0')}</td>
                  </tr>
                `
                ).join('')}
              </tbody>
            </table>
          </section>
        </div>
      </main>
    </body>
  </html>`;
}

function generateNavigationPage() {
  return `<html>
    <head>
      <title>Página de Navegación Compleja</title>
    </head>
    <body>
      <a href="#main-content" class="skip-link">Saltar al contenido principal</a>
      <header role="banner">
        <div class="header-content">
          <div class="logo">
            <img src="logo.png" alt="Logo de la empresa">
          </div>
          <nav role="navigation" aria-label="Main menu">
            <ul class="main-menu">
              ${Array.from(
                { length: 6 },
                (_, i) => `
                <li>
                  <a href="#section${i}">Sección ${i + 1}</a>
                  <ul class="submenu">
                    ${Array.from(
                      { length: 4 },
                      (_, j) => `
                      <li><a href="#section${i}-${j}">Subsección ${
                        j + 1
                      }</a></li>
                    `
                    ).join('')}
                  </ul>
                </li>
              `
              ).join('')}
            </ul>
          </nav>
        </div>
      </header>
      <main id="main-content" role="main">
        <div class="breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li><a href="#home">Inicio</a></li>
            <li><a href="#category">Categoría</a></li>
            <li aria-current="page">Página actual</li>
          </ol>
        </div>
        <h1>Contenido Principal de Navegación</h1>
        <div class="content-sections">
          ${Array.from(
            { length: 5 },
            (_, i) => `
            <section id="section${i}">
              <h2>Sección ${i + 1}</h2>
              <p>Contenido detallado de la sección ${
                i + 1
              } para testing de navegación.</p>
              <div class="action-buttons">
                <button type="button">Acción primaria</button>
                <button type="button">Acción secundaria</button>
              </div>
            </section>
          `
          ).join('')}
        </div>
      </main>
    </body>
  </html>`;
}

const testUrls = [
  'https://github.com',
  'https://stackoverflow.com',
  'https://developer.mozilla.org',
  'https://www.w3.org',
  'https://webaim.org',
];

export default function () {
  const testType = Math.random();

  group('Análisis de Accesibilidad - Carga Media', function () {
    // Test 1: HTML complejo (50% del tráfico)
    if (testType < 0.5) {
      const payload =
        mediumHtmlPayloads[
          Math.floor(Math.random() * mediumHtmlPayloads.length)
        ];

      const response = http.post(
        `${BASE_URL}/api/analyze`,
        JSON.stringify({
          inputType: 'html',
          value: payload,
          tool: Math.random() > 0.5 ? 'axe-core' : 'htmlcs',
          wcag: {
            version: Math.random() > 0.3 ? '2.1' : '2.2',
            level: Math.random() > 0.4 ? 'AA' : 'AAA',
          },
          userId: `medium-user-${randomString(10)}`,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Request-ID': `medium-${randomString(16)}`,
            'X-Load-Test': 'medium-load',
            'X-User-Session': randomString(32),
          },
          timeout: '45s',
        }
      );

      requestsCount.add(1);
      dataTransfer.add(response.body.length);
      responseTimeAnalyze.add(response.timings.duration);

      const success = check(response, {
        'medium html status ok': r => r.status === 200 || r.status === 202,
        'medium html has results': r => {
          try {
            const data = JSON.parse(r.body);
            return data.data && (data.data.results || data.data.message);
          } catch {
            return false;
          }
        },
        'medium html reasonable time': r => r.timings.duration < 2000,
        'medium html valid json': r => {
          try {
            JSON.parse(r.body);
            return true;
          } catch {
            return false;
          }
        },
      });

      errorRate.add(!success);
      sleep(randomIntBetween(1, 4));
    }

    // Test 2: URLs externas (30% del tráfico)
    else if (testType < 0.8) {
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
          userId: `medium-user-${randomString(10)}`,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Request-ID': `medium-${randomString(16)}`,
            'X-Load-Test': 'medium-load',
            'X-User-Session': randomString(32),
          },
          timeout: '60s',
        }
      );

      requestsCount.add(1);
      dataTransfer.add(response.body.length);
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
      sleep(randomIntBetween(2, 5));
    }

    // Test 3: Health checks y endpoints de monitoreo (20% del tráfico)
    else {
      const endpoints = [
        { method: 'GET', url: `${BASE_URL}/api/health` },
        { method: 'GET', url: `${BASE_URL}/health` },
        { method: 'GET', url: `${BASE_URL}/api/status` },
        { method: 'GET', url: `${BASE_URL}/` },
      ];

      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const response = http.get(endpoint.url, {
        headers: {
          'X-Load-Test': 'medium-load',
          'X-Health-Check': 'true',
        },
      });

      requestsCount.add(1);
      dataTransfer.add(response.body.length);
      responseTimeHealth.add(response.timings.duration);

      const success = check(response, {
        'health check status ok': r => r.status === 200,
        'health check fast': r => r.timings.duration < 800,
        'health check has body': r => r.body.length > 0,
      });

      errorRate.add(!success);
      sleep(randomIntBetween(1, 3));
    }
  });
}

export function handleSummary(data) {
  const totalRequests = data.metrics.http_reqs.values.count;
  const errorRatePercent = (data.metrics.error_rate.values.rate * 100).toFixed(
    2
  );
  const dataTransferMB = (
    data.metrics.data_transfer_bytes.values.count /
    1024 /
    1024
  ).toFixed(2);

  return {
    'results/medium-load-k6-summary.json': JSON.stringify(data, null, 2),
    stdout: `
====== RESUMEN TEST CARGA MEDIA K6 - 50 USUARIOS ======
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
Datos transferidos: ${dataTransferMB} MB
Usuario concurrentes máx: 50
========================================================
    `,
  };
}

/**
 * Métricas objetivo para este escenario medio:
 * - Tiempo de respuesta promedio: < 500ms
 * - Throughput: > 80 req/s
 * - Tasa de error: < 3%
 * - P95: < 800ms
 * - Usuarios concurrentes: 50
 */
