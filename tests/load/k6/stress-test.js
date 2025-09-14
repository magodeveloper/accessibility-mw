import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';

// Métricas personalizadas para stress test
export const errorRate = new Rate('errors');
export const timeoutRate = new Rate('timeouts');
export const analysisCounter = new Counter('analysis_requests');
export const analysisTime = new Trend('analysis_duration');

// Configuración del test de estrés
export const options = {
  stages: [
    // Warm-up rápido
    { duration: '20s', target: 5 },

    // Incremento agresivo
    { duration: '1m', target: 100 },

    // Pico de estrés
    { duration: '2m', target: 200 },

    // Mantener estrés extremo
    { duration: '1m', target: 200 },

    // Cool down gradual
    { duration: '1m', target: 10 },
  ],

  // Thresholds más permisivos para stress test
  thresholds: {
    http_req_duration: ['p(95)<60000'], // 95% < 60s (más permisivo)
    http_req_failed: ['rate<0.5'], // < 50% errores (stress test)
    errors: ['rate<0.5'], // < 50% errores custom
    timeouts: ['rate<0.3'], // < 30% timeouts
  },

  // Configuraciones para alto rendimiento
  batch: 10,
  batchPerHost: 5,
  maxRedirects: 0,

  // Recursos del sistema
  vus: 200, // Virtual users máximos
  duration: '6m', // Duración total
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// HTML complejo para stress test
const complexHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Complex Stress Test Page</title>
</head>
<body>
    <header>
        <nav role="navigation" aria-label="Main navigation">
            <ul>
                <li><a href="#home" tabindex="0">Home</a></li>
                <li><a href="#about" tabindex="1">About</a></li>
                <li><a href="#services" tabindex="2">Services</a></li>
                <li><a href="#contact" tabindex="3">Contact</a></li>
            </ul>
        </nav>
    </header>
    
    <main>
        <section>
            <h1>Main Heading</h1>
            <article>
                <h2>Article Title</h2>
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
                   Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                
                <img src="test-image.jpg" alt="Descriptive alt text for accessibility">
                
                <form action="/submit" method="post">
                    <fieldset>
                        <legend>Contact Information</legend>
                        
                        <label for="firstName">First Name:</label>
                        <input type="text" id="firstName" name="firstName" required aria-required="true">
                        
                        <label for="email">Email:</label>
                        <input type="email" id="email" name="email" required aria-required="true">
                        
                        <label for="message">Message:</label>
                        <textarea id="message" name="message" rows="5" cols="30" aria-describedby="message-help"></textarea>
                        <div id="message-help">Please provide detailed information</div>
                        
                        <button type="submit">Submit Form</button>
                    </fieldset>
                </form>
                
                <table>
                    <caption>Accessibility Compliance Data</caption>
                    <thead>
                        <tr>
                            <th scope="col">Criterion</th>
                            <th scope="col">Level</th>
                            <th scope="col">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Color Contrast</td>
                            <td>AA</td>
                            <td>Pass</td>
                        </tr>
                        <tr>
                            <td>Keyboard Navigation</td>
                            <td>A</td>
                            <td>Pass</td>
                        </tr>
                    </tbody>
                </table>
            </article>
        </section>
    </main>
    
    <aside>
        <h3>Related Links</h3>
        <ul>
            <li><a href="https://www.w3.org/WAI/">Web Accessibility Initiative</a></li>
            <li><a href="https://www.w3.org/TR/WCAG21/">WCAG 2.1 Guidelines</a></li>
        </ul>
    </aside>
    
    <footer>
        <p>&copy; 2024 Accessibility Test Site. All rights reserved.</p>
        <address>
            Contact us at <a href="mailto:test@example.com">test@example.com</a>
        </address>
    </footer>
</body>
</html>
`;

export default function () {
  const scenario = Math.random();

  if (scenario < 0.6) {
    // 60% - Stress en análisis (carga principal)
    stressAnalysisEndpoint();
  } else if (scenario < 0.8) {
    // 20% - Stress en health checks
    stressHealthEndpoints();
  } else {
    // 20% - Stress en monitoreo
    stressMonitoringEndpoints();
  }

  // Sleep mínimo en stress test
  sleep(Math.random() * 1);
}

function stressAnalysisEndpoint() {
  const tools = ['axe-core', 'equal-access', 'both'];
  const tool = tools[Math.floor(Math.random() * tools.length)];
  const wcagLevels = ['A', 'AA', 'AAA'];
  const wcagLevel = wcagLevels[Math.floor(Math.random() * wcagLevels.length)];

  const payload = JSON.stringify({
    inputType: 'html',
    value: complexHtml,
    tool: tool,
    wcagVersion: '2.2',
    wcagLevel: wcagLevel,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'K6-StressTest/1.0',
    },
    timeout: '60s', // Timeout más alto para stress
  };

  const startTime = Date.now();
  const response = http.post(`${BASE_URL}/api/analyze`, payload, params);
  const duration = Date.now() - startTime;

  analysisCounter.add(1);
  analysisTime.add(duration);

  const isTimeout = response.status === 0 || duration > 60000;
  timeoutRate.add(isTimeout);

  const success = check(response, {
    'Stress analysis status acceptable': r =>
      [200, 400, 500, 503, 504].includes(r.status) || r.status === 0,
    'Stress analysis not hanging': r => duration < 120000, // Máximo 2 minutos
  });

  errorRate.add(!success);

  // Log de errores críticos
  if (response.status >= 500 || response.status === 0) {
    console.log(
      `⚠️ Stress response: ${response.status}, duration: ${duration}ms, tool: ${tool}`
    );
  }
}

function stressHealthEndpoints() {
  // Health básico bajo estrés
  let response = http.get(`${BASE_URL}/health`, { timeout: '30s' });
  let success = check(response, {
    'Stress health responds': r => r.status > 0,
    'Stress health status acceptable': r => [200, 503].includes(r.status),
  });

  errorRate.add(!success);

  // Deep health (más costoso)
  if (Math.random() < 0.3) {
    // Solo 30% ejecuta deep health
    response = http.get(`${BASE_URL}/health?deep=true`, { timeout: '60s' });
    success = check(response, {
      'Stress deep health responds': r => r.status > 0,
      'Stress deep health not hanging': r => r.timings.duration < 60000,
    });

    errorRate.add(!success);
  }
}

function stressMonitoringEndpoints() {
  // Batch requests para estresar más
  const requests = [
    { method: 'GET', url: `${BASE_URL}/api/monitoring/status` },
    { method: 'GET', url: `${BASE_URL}/api/monitoring/dashboard` },
    { method: 'GET', url: `${BASE_URL}/api/monitoring/metrics` },
  ];

  const responses = http.batch(requests);

  responses.forEach((response, index) => {
    const success = check(response, {
      [`Stress monitoring ${index} responds`]: r => r.status > 0,
      [`Stress monitoring ${index} acceptable`]: r =>
        [200, 500, 503].includes(r.status),
    });

    errorRate.add(!success);
  });
}

export function setup() {
  console.log('💥 Iniciando STRESS TEST con K6...');
  console.log(`🎯 Target: ${BASE_URL}`);
  console.log(`⚡ Máximo: 200 usuarios virtuales concurrentes`);
  console.log(`🔥 Duración: 6 minutos de estrés extremo`);

  // Verificar que el servicio está disponible
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    console.log(`❌ Servicio no disponible: ${healthCheck.status}`);
    throw new Error('Servicio no disponible para stress test');
  }

  return { startTime: new Date() };
}

export function teardown(data) {
  const endTime = new Date();
  const duration = (endTime - data.startTime) / 1000;
  console.log(`🏁 Stress test completado en ${duration}s`);
  console.log('📊 Revisa las métricas para identificar puntos de fallo');
}
