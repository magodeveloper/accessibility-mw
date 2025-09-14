/**
 * Test de Carga Alta - 100 Usuarios Concurrentes
 * Escenario de estrés para validar límites del sistema con alta concurrencia
 * Herramienta: K6 (mejor para tests de alto rendimiento)
 */

import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';

// Métricas personalizadas
const errorRate = new Rate('error_rate');
const responseTimeAnalyze = new Trend('response_time_analyze');
const requestsCount = new Counter('requests_total');

// Configuración del test
export const options = {
  stages: [
    { duration: '2m', target: 20 }, // Warm up
    { duration: '6m', target: 50 }, // Stress test
    { duration: '2m', target: 20 }, // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'], // 95% de las respuestas < 800ms
    error_rate: ['rate<0.05'], // Menos del 5% de errores
    response_time_analyze: ['p(90)<1000'], // 90% análisis < 1s
  },
};

const BASE_URL = 'http://localhost:3000';

// Payloads para pruebas
const htmlPayloads = [
  `<html><head><title>Test 1</title></head><body>
    <h1>Título principal</h1>
    <nav><ul><li><a href="#section1">Sección 1</a></li></ul></nav>
    <main><section id="section1"><p>Contenido principal</p></section></main>
  </body></html>`,

  `<html><head><title>Test 2</title></head><body>
    <header><h1>Mi sitio web</h1></header>
    <main>
      <form><label for="email">Email:</label><input id="email" type="email"></form>
      <img src="test.jpg" alt="Imagen de prueba">
    </main>
  </body></html>`,

  `<html><head><title>Test 3</title></head><body>
    <div role="main">
      <h2>Contenido</h2>
      <button aria-label="Cerrar modal">X</button>
      <table><tr><th>Columna 1</th><td>Dato 1</td></tr></table>
    </div>
  </body></html>`,
];

export default function () {
  group('Análisis de Accesibilidad - Alto Volumen', function () {
    // Test 1: Análisis con axe-core (40% del tráfico)
    if (Math.random() < 0.4) {
      const payload =
        htmlPayloads[Math.floor(Math.random() * htmlPayloads.length)];
      const response = http.post(
        `${BASE_URL}/api/analyze`,
        JSON.stringify({
          inputType: 'html',
          value: payload,
          tool: 'axe-core',
          wcag: {
            version: '2.1',
            level: 'AA',
            cumulative: true,
          },
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );

      requestsCount.add(1);
      responseTimeAnalyze.add(response.timings.duration);

      const success = check(response, {
        'status is 200': r => r.status === 200,
        'response has results': r => {
          try {
            const data = JSON.parse(r.body);
            return data.data && data.data.results;
          } catch {
            return false;
          }
        },
        'response time < 1s': r => r.timings.duration < 1000,
      });

      errorRate.add(!success);
      sleep(1);
    }

    // Test 2: Análisis con equal-access (30% del tráfico)
    else if (Math.random() < 0.7) {
      const response = http.post(
        `${BASE_URL}/api/analyze`,
        JSON.stringify({
          inputType: 'url',
          value: 'https://example.com',
          tool: 'equal-access',
          wcag: {
            version: '2.1',
            level: 'AA',
          },
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );

      requestsCount.add(1);
      responseTimeAnalyze.add(response.timings.duration);

      const success = check(response, {
        'status is 200': r => r.status === 200,
        'response has data': r => {
          try {
            const data = JSON.parse(r.body);
            return data.data;
          } catch {
            return false;
          }
        },
      });

      errorRate.add(!success);
      sleep(2);
    }

    // Test 3: Análisis con ambos motores (20% del tráfico)
    else if (Math.random() < 0.9) {
      const payload =
        htmlPayloads[Math.floor(Math.random() * htmlPayloads.length)];
      const response = http.post(
        `${BASE_URL}/api/analyze`,
        JSON.stringify({
          inputType: 'html',
          value: payload,
          tool: 'both',
          wcag: {
            version: '2.2',
            level: 'AAA',
          },
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );

      requestsCount.add(1);
      responseTimeAnalyze.add(response.timings.duration);

      const success = check(response, {
        'status is 200': r => r.status === 200,
        'both engines results': r => {
          try {
            const data = JSON.parse(r.body);
            return (
              data.data && data.data.results && data.data.results.length > 0
            );
          } catch {
            return false;
          }
        },
      });

      errorRate.add(!success);
      sleep(2);
    }

    // Test 4: Endpoints auxiliares (10% del tráfico)
    else {
      group('Health & Metrics', function () {
        const healthResponse = http.get(`${BASE_URL}/api/health`);
        check(healthResponse, {
          'health status is 200': r => r.status === 200,
        });

        const metricsResponse = http.get(`${BASE_URL}/metrics`);
        check(metricsResponse, {
          'metrics status is 200': r => r.status === 200,
        });

        const swaggerResponse = http.get(`${BASE_URL}/api/swagger`);
        check(swaggerResponse, {
          'swagger status is 200': r => r.status === 200,
        });

        requestsCount.add(3);
      });

      sleep(1);
    }
  });
}

export function handleSummary(data) {
  return {
    'results/high-load-summary.json': JSON.stringify(data, null, 2),
    stdout: `
====== RESUMEN TEST DE CARGA ALTA ======
Duración total: ${data.metrics.iteration_duration.values.avg}ms
Requests totales: ${data.metrics.http_reqs.values.count}
RPS promedio: ${data.metrics.http_reqs.values.rate}
Tiempo respuesta p95: ${data.metrics.http_req_duration.values['p(95)']}ms
Tasa de error: ${(data.metrics.error_rate.values.rate * 100).toFixed(2)}%
========================================
    `,
  };
}

/**
 * Métricas objetivo para este escenario:
 * - Tiempo de respuesta promedio: < 800ms
 * - Throughput: > 250 req/s
 * - Tasa de error: < 5%
 * - CPU Usage: < 80%
 */
