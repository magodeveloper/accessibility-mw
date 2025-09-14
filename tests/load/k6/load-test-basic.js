import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate } from 'k6/metrics';

// Métricas personalizadas
export const errorRate = new Rate('errors');

// Configuración del test de carga
export const options = {
  stages: [
    // Warm-up
    { duration: '30s', target: 5 },

    // Incremento gradual
    { duration: '2m', target: 25 },

    // Carga sostenida
    { duration: '3m', target: 25 },

    // Cool down
    { duration: '30s', target: 5 },
  ],

  // Thresholds (umbrales de rendimiento)
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% de requests < 5s
    http_req_failed: ['rate<0.1'], // < 10% de errores
    errors: ['rate<0.1'], // < 10% errores custom
  },

  // Opciones HTTP
  httpDebug: 'full',
};

// URLs base
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Datos de prueba
const sampleHtmls = [
  '<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Hello World</h1><p>This is a test page</p></body></html>',
  '<!DOCTYPE html><html><head><title>Test 2</title></head><body><div><h1>Test</h1><button>Click me</button></div></body></html>',
  '<!DOCTYPE html><html><head><title>Form Test</title></head><body><form><input type="text" placeholder="Name"><input type="submit" value="Submit"></form></body></html>',
];

// Función principal del test
export default function () {
  const scenario = Math.random();

  if (scenario < 0.3) {
    // 30% - Health checks
    testHealthEndpoints();
  } else if (scenario < 0.5) {
    // 20% - Monitoring endpoints
    testMonitoringEndpoints();
  } else if (scenario < 0.9) {
    // 40% - Analysis endpoints
    testAnalysisEndpoints();
  } else {
    // 10% - Anonymous analysis
    testAnonymousAnalysis();
  }

  sleep(Math.random() * 3 + 1); // Sleep entre 1-4 segundos
}

function testHealthEndpoints() {
  // Health check básico
  let response = http.get(`${BASE_URL}/health`);
  let success = check(response, {
    'Health status 200': r => r.status === 200,
    'Health has ok property': r => JSON.parse(r.body).hasOwnProperty('ok'),
    'Health response time < 2s': r => r.timings.duration < 2000,
  });

  errorRate.add(!success);

  sleep(1);

  // Deep health check
  response = http.get(`${BASE_URL}/health?deep=true`);
  success = check(response, {
    'Deep health status OK': r => r.status === 200 || r.status === 503,
    'Deep health response time < 10s': r => r.timings.duration < 10000,
  });

  errorRate.add(!success);
}

function testMonitoringEndpoints() {
  // Status endpoint
  let response = http.get(`${BASE_URL}/api/monitoring/status`);
  let success = check(response, {
    'Monitoring status 200': r => r.status === 200,
    'Status response time < 3s': r => r.timings.duration < 3000,
  });

  errorRate.add(!success);

  sleep(2);

  // Dashboard endpoint
  response = http.get(`${BASE_URL}/api/monitoring/dashboard`);
  success = check(response, {
    'Dashboard status 200': r => r.status === 200,
    'Dashboard response time < 5s': r => r.timings.duration < 5000,
  });

  errorRate.add(!success);
}

function testAnalysisEndpoints() {
  const html = sampleHtmls[Math.floor(Math.random() * sampleHtmls.length)];
  const tools = ['axe-core', 'equal-access', 'both'];
  const tool = tools[Math.floor(Math.random() * tools.length)];

  const payload = JSON.stringify({
    inputType: 'html',
    value: html,
    tool: tool,
    wcagVersion: '2.2',
    wcagLevel: 'AA',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'K6-LoadTest/1.0',
    },
  };

  const response = http.post(`${BASE_URL}/api/analyze`, payload, params);

  const success = check(response, {
    'Analysis request processed': r => [200, 400, 500].includes(r.status),
    'Analysis has ok property': r => {
      try {
        return JSON.parse(r.body).hasOwnProperty('ok');
      } catch (e) {
        return false;
      }
    },
    'Analysis response time < 30s': r => r.timings.duration < 30000,
  });

  errorRate.add(!success);
}

function testAnonymousAnalysis() {
  const html = sampleHtmls[Math.floor(Math.random() * sampleHtmls.length)];

  const payload = JSON.stringify({
    inputType: 'html',
    value: html,
    tool: 'equal-access',
    wcagVersion: '2.1',
    wcagLevel: 'AA',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'K6-LoadTest/1.0',
    },
  };

  const response = http.post(
    `${BASE_URL}/api/analyze/anonymous`,
    payload,
    params
  );

  const success = check(response, {
    'Anonymous analysis processed': r => [200, 400, 500].includes(r.status),
    'Anonymous response time < 30s': r => r.timings.duration < 30000,
  });

  errorRate.add(!success);
}

// Funciones de setup y teardown
export function setup() {
  console.log('🚀 Iniciando test de carga K6...');
  console.log(`📊 Target: ${BASE_URL}`);
  return { startTime: new Date() };
}

export function teardown(data) {
  const endTime = new Date();
  const duration = (endTime - data.startTime) / 1000;
  console.log(`✅ Test completado en ${duration}s`);
}
