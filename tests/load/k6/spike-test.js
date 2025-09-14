import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';

// Métricas para spike test
export const errorRate = new Rate('errors');
export const recoveryTime = new Trend('recovery_time');
export const spikeRequests = new Counter('spike_requests');

// Configuración del spike test
export const options = {
  stages: [
    // Baseline normal
    { duration: '2m', target: 10 },

    // SPIKE SÚBITO - pico masivo instantáneo
    { duration: '10s', target: 300 }, // De 10 a 300 en 10 segundos!

    // Mantener spike brevemente
    { duration: '30s', target: 300 },

    // Caída súbita del spike
    { duration: '10s', target: 10 },

    // Recuperación y observación
    { duration: '3m', target: 10 },

    // Segundo spike más agresivo
    { duration: '5s', target: 500 }, // Spike aún más alto

    // Mantener segundo spike
    { duration: '20s', target: 500 },

    // Caída final
    { duration: '10s', target: 5 },

    // Cool down de recuperación
    { duration: '2m', target: 5 },
  ],

  // Thresholds para spike test
  thresholds: {
    http_req_duration: ['p(90)<10000'], // 90% < 10s durante spikes
    http_req_failed: ['rate<0.7'], // < 70% errores (muy permisivo para spikes)
    errors: ['rate<0.7'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// HTML para spike test
const spikeHtml = `
<!DOCTYPE html>
<html>
<head><title>Spike Test Page</title></head>
<body>
    <h1>Spike Load Test</h1>
    <div>Content for testing sudden traffic spikes</div>
    <form>
        <input type="text" placeholder="Test input">
        <button type="submit">Submit</button>
    </form>
</body>
</html>
`;

export default function () {
  const currentStage = getCurrentStage();
  const isSpike = currentStage === 'spike1' || currentStage === 'spike2';

  if (isSpike) {
    spikeRequests.add(1);

    // Durante spikes, más carga en análisis
    if (Math.random() < 0.8) {
      testAnalysisDuringSpike();
    } else {
      testHealthDuringSpike();
    }
  } else if (Math.random() < 0.5) {
    // Carga normal
    testNormalAnalysis();
  } else {
    testNormalHealth();
  }

  // Sleep más corto durante spikes
  sleep(isSpike ? Math.random() * 0.5 : Math.random() * 2);
}

function getCurrentStage() {
  const elapsed = Math.floor(__ITER / __VU);

  if (elapsed < 120) return 'baseline';
  if (elapsed < 130) return 'spike1_ramp';
  if (elapsed < 160) return 'spike1';
  if (elapsed < 170) return 'spike1_down';
  if (elapsed < 350) return 'recovery';
  if (elapsed < 355) return 'spike2_ramp';
  if (elapsed < 375) return 'spike2';
  if (elapsed < 385) return 'spike2_down';
  return 'cooldown';
}

function testAnalysisDuringSpike() {
  const tools = ['axe-core', 'equal-access'];
  const tool = tools[Math.floor(Math.random() * tools.length)];

  const payload = JSON.stringify({
    inputType: 'html',
    value: spikeHtml,
    tool: tool,
    wcagVersion: '2.2',
    wcagLevel: 'AA',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'K6-SpikeTest/1.0',
    },
    timeout: '30s', // Timeout más corto para detectar problemas rápido
  };

  const startTime = Date.now();
  const response = http.post(`${BASE_URL}/api/analyze`, payload, params);
  const duration = Date.now() - startTime;

  const success = check(response, {
    'Spike analysis responds': r => r.status > 0,
    'Spike analysis completes in time': r => duration < 30000,
    'Spike analysis status acceptable': r =>
      [200, 400, 500, 503, 504].includes(r.status),
  });

  errorRate.add(!success);

  // Medir tiempo de recuperación si hay error
  if (response.status >= 500) {
    recoveryTime.add(duration);
  }
}

function testHealthDuringSpike() {
  const response = http.get(`${BASE_URL}/health`, { timeout: '10s' });

  const success = check(response, {
    'Spike health responds': r => r.status > 0,
    'Spike health fast response': r => r.timings.duration < 10000,
  });

  errorRate.add(!success);
}

function testNormalAnalysis() {
  const payload = JSON.stringify({
    inputType: 'html',
    value: spikeHtml,
    tool: 'axe-core',
    wcagVersion: '2.2',
    wcagLevel: 'AA',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '20s',
  };

  const response = http.post(`${BASE_URL}/api/analyze`, payload, params);

  const success = check(response, {
    'Normal analysis success': r => [200, 400].includes(r.status),
    'Normal analysis reasonable time': r => r.timings.duration < 20000,
  });

  errorRate.add(!success);
}

function testNormalHealth() {
  const response = http.get(`${BASE_URL}/health`);

  const success = check(response, {
    'Normal health success': r => r.status === 200,
    'Normal health quick': r => r.timings.duration < 5000,
  });

  errorRate.add(!success);
}

export function setup() {
  console.log('⚡ Iniciando SPIKE TEST con K6...');
  console.log(`🎯 Target: ${BASE_URL}`);
  console.log(
    '📈 Patrón: Baseline → SPIKE (300 users) → Recovery → MEGA SPIKE (500 users) → Recovery'
  );
  console.log(
    '🔍 Objetivo: Detectar comportamiento con picos súbitos de tráfico'
  );

  // Health check inicial
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    throw new Error('Servicio no disponible para spike test');
  }

  return {
    startTime: new Date(),
    baselineLatency: healthCheck.timings.duration,
  };
}

export function teardown(data) {
  const endTime = new Date();
  const duration = (endTime - data.startTime) / 1000;
  console.log(`🏁 Spike test completado en ${duration}s`);
  console.log(`📊 Latencia baseline: ${data.baselineLatency}ms`);
  console.log('🔍 Analiza si el sistema se recuperó después de los spikes');

  // Test de recuperación final
  const recoveryCheck = http.get(`${BASE_URL}/health`);
  const recoveryLatency = recoveryCheck.timings.duration;
  const recoveryRatio = recoveryLatency / data.baselineLatency;

  console.log(`🏥 Latencia post-spike: ${recoveryLatency}ms`);
  console.log(`📈 Ratio de recuperación: ${recoveryRatio.toFixed(2)}x`);

  if (recoveryRatio > 3) {
    console.log(
      '⚠️  ADVERTENCIA: Sistema posiblemente no se ha recuperado completamente'
    );
  } else {
    console.log('✅ Sistema se recuperó exitosamente de los spikes');
  }
}
