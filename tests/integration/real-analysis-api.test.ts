/**
 * REAL E2E Integration Tests - MS Analysis API
 *
 * ⚠️ IMPORTANTE: Este test NO usa mocks
 * Requiere que los servicios estén corriendo:
 *   docker compose -f docker-compose.ci.yml up -d
 *
 * Los tests validan integración REAL con:
 * - MySQL (base de datos real)
 * - MS-Analysis API (microservicio .NET real en http://localhost:8082)
 */

import { beforeAll, describe, expect, it } from '@jest/globals';

const ANALYSIS_API_URL =
  process.env.ANALYSIS_API_URL || 'http://localhost:8082';
const TIMEOUT_MS = 60000; // 60 segundos para operaciones reales

/**
 * Helper para hacer requests HTTP reales sin mocks
 */
async function makeRealHttpRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${ANALYSIS_API_URL}${endpoint}`;

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    ...options,
  };

  return fetch(url, defaultOptions);
}

describe('Real E2E - MS Analysis API Integration', () => {
  beforeAll(async () => {
    // Verificar que el servicio está disponible
    try {
      const response = await fetch(`${ANALYSIS_API_URL}/health`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      console.log('✅ MS-Analysis API is healthy and ready');
    } catch (error) {
      console.error('❌ MS-Analysis API is NOT available');
      console.error('Run: docker compose -f docker-compose.ci.yml up -d');
      throw error;
    }
  }, TIMEOUT_MS);

  describe('Health Checks', () => {
    it(
      'should respond to /health endpoint',
      async () => {
        const response = await makeRealHttpRequest('/health');

        expect(response.status).toBe(200);
        expect(response.ok).toBe(true);
      },
      TIMEOUT_MS
    );

    it(
      'should respond to /health/live endpoint',
      async () => {
        const response = await makeRealHttpRequest('/health/live');

        expect(response.status).toBe(200);
        expect(response.ok).toBe(true);
      },
      TIMEOUT_MS
    );

    it(
      'should respond to /health/ready endpoint',
      async () => {
        const response = await makeRealHttpRequest('/health/ready');

        expect(response.status).toBe(200);
        expect(response.ok).toBe(true);

        const data = await response.json();
        expect(data).toHaveProperty('status');
      },
      TIMEOUT_MS
    );
  });

  describe('Create Analysis - Real Database Operations', () => {
    it(
      'should create a new analysis record in real MySQL database',
      async () => {
        const analysisPayload = {
          userId: 1,
          sessionId: `e2e-test-${Date.now()}`,
          url: 'https://example.com',
          status: 'completed',
          totalIssues: 5,
          criticalIssues: 2,
          seriousIssues: 2,
          moderateIssues: 1,
          minorIssues: 0,
          metadata: {
            engine: 'axe-core',
            testType: 'e2e-real',
            timestamp: new Date().toISOString(),
          },
          results: {
            violations: [
              {
                id: 'color-contrast',
                impact: 'serious',
                description: 'Elements must have sufficient color contrast',
                nodes: [],
              },
            ],
            passes: [],
            incomplete: [],
            inapplicable: [],
          },
        };

        const response = await makeRealHttpRequest('/api/analysis', {
          method: 'POST',
          body: JSON.stringify(analysisPayload),
        });

        // Validar respuesta exitosa
        expect(response.status).toBe(201);
        expect(response.ok).toBe(true);

        const data = await response.json();

        // Validar estructura de respuesta
        expect(data).toHaveProperty('data');
        expect(data.data).toHaveProperty('id');
        expect(typeof data.data.id).toBe('number');
        expect(data.data.id).toBeGreaterThan(0);

        console.log(`✅ Created analysis with ID: ${data.data.id}`);
      },
      TIMEOUT_MS
    );

    it(
      'should validate required fields',
      async () => {
        const invalidPayload = {
          // Falta userId (requerido)
          sessionId: `invalid-${Date.now()}`,
        };

        const response = await makeRealHttpRequest('/api/analysis', {
          method: 'POST',
          body: JSON.stringify(invalidPayload),
        });

        // Debe retornar error 400 (Bad Request)
        expect(response.status).toBe(400);
        expect(response.ok).toBe(false);
      },
      TIMEOUT_MS
    );
  });

  describe('Get Analysis - Real Database Query', () => {
    let createdAnalysisId: number;

    beforeAll(async () => {
      // Crear un análisis para luego consultarlo
      const payload = {
        userId: 1,
        sessionId: `e2e-get-test-${Date.now()}`,
        url: 'https://test-get.example.com',
        status: 'completed',
        totalIssues: 3,
        criticalIssues: 1,
        seriousIssues: 1,
        moderateIssues: 1,
        minorIssues: 0,
        results: {
          violations: [],
          passes: [],
          incomplete: [],
          inapplicable: [],
        },
      };

      const response = await makeRealHttpRequest('/api/analysis', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      createdAnalysisId = data.data.id;

      console.log(
        `✅ Setup: Created analysis ID ${createdAnalysisId} for GET test`
      );
    }, TIMEOUT_MS);

    it(
      'should retrieve existing analysis by ID',
      async () => {
        const response = await makeRealHttpRequest(
          `/api/analysis/${createdAnalysisId}`
        );

        expect(response.status).toBe(200);
        expect(response.ok).toBe(true);

        const data = await response.json();

        expect(data).toHaveProperty('data');
        expect(data.data).toHaveProperty('id', createdAnalysisId);
        expect(data.data).toHaveProperty('userId', 1);
        expect(data.data).toHaveProperty('url', 'https://test-get.example.com');
        expect(data.data).toHaveProperty('status', 'completed');
        expect(data.data).toHaveProperty('totalIssues', 3);

        console.log(
          `✅ Retrieved analysis ID ${createdAnalysisId} successfully`
        );
      },
      TIMEOUT_MS
    );

    it(
      'should return 404 for non-existent analysis',
      async () => {
        const nonExistentId = 999999;
        const response = await makeRealHttpRequest(
          `/api/analysis/${nonExistentId}`
        );

        expect(response.status).toBe(404);
        expect(response.ok).toBe(false);
      },
      TIMEOUT_MS
    );
  });

  describe('List Analysis - Real Database Queries', () => {
    beforeAll(async () => {
      // Crear múltiples análisis para pruebas de listado
      const userId = 99;
      const sessionId = `e2e-list-test-${Date.now()}`;

      for (let i = 0; i < 3; i++) {
        const payload = {
          userId,
          sessionId,
          url: `https://test-list-${i}.example.com`,
          status: 'completed',
          totalIssues: i + 1,
          criticalIssues: 0,
          seriousIssues: i,
          moderateIssues: 1,
          minorIssues: 0,
          results: {
            violations: [],
            passes: [],
            incomplete: [],
            inapplicable: [],
          },
        };

        await makeRealHttpRequest('/api/analysis', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      console.log(`✅ Setup: Created 3 analysis records for user ${userId}`);
    }, TIMEOUT_MS);

    it(
      'should list analysis for a specific user',
      async () => {
        const userId = 99;
        const response = await makeRealHttpRequest(
          `/api/analysis/user/${userId}`
        );

        expect(response.status).toBe(200);
        expect(response.ok).toBe(true);

        const data = await response.json();

        expect(data).toHaveProperty('data');
        expect(Array.isArray(data.data)).toBe(true);
        expect(data.data.length).toBeGreaterThanOrEqual(3);

        // Validar que todos los registros son del usuario correcto
        data.data.forEach((analysis: any) => {
          expect(analysis).toHaveProperty('userId', userId);
          expect(analysis).toHaveProperty('id');
          expect(analysis).toHaveProperty('url');
        });

        console.log(
          `✅ Listed ${data.data.length} analysis for user ${userId}`
        );
      },
      TIMEOUT_MS
    );

    it(
      'should return empty array for user with no analysis',
      async () => {
        const userWithNoData = 88888;
        const response = await makeRealHttpRequest(
          `/api/analysis/user/${userWithNoData}`
        );

        expect(response.status).toBe(200);
        expect(response.ok).toBe(true);

        const data = await response.json();
        expect(data).toHaveProperty('data');
        expect(Array.isArray(data.data)).toBe(true);
        expect(data.data.length).toBe(0);
      },
      TIMEOUT_MS
    );
  });

  describe('Database Persistence', () => {
    it(
      'should persist data across multiple requests',
      async () => {
        const sessionId = `persistence-test-${Date.now()}`;

        // 1. Crear análisis
        const createPayload = {
          userId: 77,
          sessionId,
          url: 'https://persistence-test.example.com',
          status: 'completed',
          totalIssues: 10,
          criticalIssues: 5,
          seriousIssues: 3,
          moderateIssues: 2,
          minorIssues: 0,
          results: {
            violations: [],
            passes: [],
            incomplete: [],
            inapplicable: [],
          },
        };

        const createResponse = await makeRealHttpRequest('/api/analysis', {
          method: 'POST',
          body: JSON.stringify(createPayload),
        });

        expect(createResponse.status).toBe(201);
        const createData = await createResponse.json();
        const analysisId = createData.data.id;

        // 2. Verificar que se puede recuperar inmediatamente
        const getResponse1 = await makeRealHttpRequest(
          `/api/analysis/${analysisId}`
        );
        expect(getResponse1.status).toBe(200);
        const getData1 = await getResponse1.json();
        expect(getData1.data.totalIssues).toBe(10);

        // 3. Verificar persistencia después de un delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        const getResponse2 = await makeRealHttpRequest(
          `/api/analysis/${analysisId}`
        );
        expect(getResponse2.status).toBe(200);
        const getData2 = await getResponse2.json();
        expect(getData2.data.totalIssues).toBe(10);
        expect(getData2.data.sessionId).toBe(sessionId);

        console.log(
          `✅ Data persisted correctly for analysis ID ${analysisId}`
        );
      },
      TIMEOUT_MS
    );
  });

  describe('Error Handling', () => {
    it(
      'should handle malformed JSON gracefully',
      async () => {
        const response = await fetch(`${ANALYSIS_API_URL}/api/analysis`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'this is not valid JSON{{{',
        });

        expect(response.status).toBe(400);
        expect(response.ok).toBe(false);
      },
      TIMEOUT_MS
    );

    it(
      'should handle very large payloads',
      async () => {
        const largePayload = {
          userId: 1,
          sessionId: `large-payload-${Date.now()}`,
          url: 'https://large-test.example.com',
          status: 'completed',
          totalIssues: 1000,
          criticalIssues: 100,
          seriousIssues: 300,
          moderateIssues: 400,
          minorIssues: 200,
          results: {
            violations: Array(500).fill({
              id: 'test-violation',
              impact: 'serious',
              description: 'Test violation'.repeat(100),
              nodes: [],
            }),
            passes: [],
            incomplete: [],
            inapplicable: [],
          },
        };

        const response = await makeRealHttpRequest('/api/analysis', {
          method: 'POST',
          body: JSON.stringify(largePayload),
        });

        // Debe procesarse correctamente o retornar error específico
        expect([201, 413]).toContain(response.status); // 201 OK o 413 Payload Too Large
      },
      TIMEOUT_MS
    );
  });
});
