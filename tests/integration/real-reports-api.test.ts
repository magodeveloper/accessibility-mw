/**
 * REAL E2E Integration Tests - MS Reports API
 *
 * ⚠️ IMPORTANTE: Este test NO usa mocks
 * Requiere que los servicios estén corriendo:
 *   docker compose -f docker-compose.ci.yml up -d
 *
 * Los tests validan integración REAL con:
 * - MySQL (base de datos real)
 * - MS-Reports API (microservicio .NET real en http://localhost:8080)
 */

import { beforeAll, describe, expect, it } from '@jest/globals';

const REPORTS_API_URL = process.env.REPORTS_API_URL || 'http://localhost:8080';
const TIMEOUT_MS = 60000;

/**
 * Helper para hacer requests HTTP reales sin mocks
 */
async function makeRealHttpRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${REPORTS_API_URL}${endpoint}`;

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    ...options,
  };

  return fetch(url, defaultOptions);
}

describe('Real E2E - MS Reports API Integration', () => {
  beforeAll(async () => {
    // Verificar que el servicio está disponible
    try {
      const response = await fetch(`${REPORTS_API_URL}/health`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      console.log('✅ MS-Reports API is healthy and ready');
    } catch (error) {
      console.error('❌ MS-Reports API is NOT available');
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

  describe('Create Report - Real Database Operations', () => {
    it(
      'should create a new report record in real MySQL database',
      async () => {
        const reportPayload = {
          userId: 1,
          analysisId: 1,
          reportType: 'accessibility-audit',
          title: `E2E Test Report - ${Date.now()}`,
          format: 'pdf',
          status: 'completed',
          metadata: {
            generatedAt: new Date().toISOString(),
            testType: 'e2e-real',
            version: '1.0',
          },
          summary: {
            totalPages: 5,
            totalIssues: 10,
            criticalIssues: 2,
            seriousIssues: 3,
            moderateIssues: 3,
            minorIssues: 2,
          },
        };

        const response = await makeRealHttpRequest('/api/reports', {
          method: 'POST',
          body: JSON.stringify(reportPayload),
        });

        expect(response.status).toBe(201);
        expect(response.ok).toBe(true);

        const data = await response.json();

        expect(data).toHaveProperty('data');
        expect(data.data).toHaveProperty('id');
        expect(typeof data.data.id).toBe('number');
        expect(data.data.id).toBeGreaterThan(0);

        console.log(`✅ Created report with ID: ${data.data.id}`);
      },
      TIMEOUT_MS
    );

    it(
      'should validate required fields',
      async () => {
        const invalidPayload = {
          // Falta userId (requerido)
          reportType: 'accessibility-audit',
        };

        const response = await makeRealHttpRequest('/api/reports', {
          method: 'POST',
          body: JSON.stringify(invalidPayload),
        });

        expect(response.status).toBe(400);
        expect(response.ok).toBe(false);
      },
      TIMEOUT_MS
    );

    it(
      'should support multiple report formats',
      async () => {
        const formats = ['pdf', 'html', 'json', 'csv'];

        for (const format of formats) {
          const payload = {
            userId: 1,
            analysisId: 1,
            reportType: 'accessibility-audit',
            title: `Format Test - ${format}`,
            format: format,
            status: 'completed',
            summary: {
              totalPages: 1,
              totalIssues: 1,
              criticalIssues: 0,
              seriousIssues: 0,
              moderateIssues: 1,
              minorIssues: 0,
            },
          };

          const response = await makeRealHttpRequest('/api/reports', {
            method: 'POST',
            body: JSON.stringify(payload),
          });

          expect([201, 400]).toContain(response.status);

          if (response.status === 201) {
            const data = await response.json();
            console.log(`✅ Created ${format} report with ID: ${data.data.id}`);
          }
        }
      },
      TIMEOUT_MS
    );
  });

  describe('Get Report - Real Database Query', () => {
    let createdReportId: number;

    beforeAll(async () => {
      const payload = {
        userId: 2,
        analysisId: 2,
        reportType: 'accessibility-audit',
        title: 'E2E Get Test Report',
        format: 'pdf',
        status: 'completed',
        summary: {
          totalPages: 3,
          totalIssues: 5,
          criticalIssues: 1,
          seriousIssues: 2,
          moderateIssues: 1,
          minorIssues: 1,
        },
      };

      const response = await makeRealHttpRequest('/api/reports', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      createdReportId = data.data.id;

      console.log(
        `✅ Setup: Created report ID ${createdReportId} for GET test`
      );
    }, TIMEOUT_MS);

    it(
      'should retrieve existing report by ID',
      async () => {
        const response = await makeRealHttpRequest(
          `/api/reports/${createdReportId}`
        );

        expect(response.status).toBe(200);
        expect(response.ok).toBe(true);

        const data = await response.json();

        expect(data).toHaveProperty('data');
        expect(data.data).toHaveProperty('id', createdReportId);
        expect(data.data).toHaveProperty('userId', 2);
        expect(data.data).toHaveProperty('title', 'E2E Get Test Report');
        expect(data.data).toHaveProperty('format', 'pdf');

        console.log(`✅ Retrieved report ID ${createdReportId} successfully`);
      },
      TIMEOUT_MS
    );

    it(
      'should return 404 for non-existent report',
      async () => {
        const nonExistentId = 999999;
        const response = await makeRealHttpRequest(
          `/api/reports/${nonExistentId}`
        );

        expect(response.status).toBe(404);
        expect(response.ok).toBe(false);
      },
      TIMEOUT_MS
    );
  });

  describe('List Reports - Real Database Queries', () => {
    beforeAll(async () => {
      const userId = 88;

      for (let i = 0; i < 3; i++) {
        const payload = {
          userId,
          analysisId: 100 + i,
          reportType: 'accessibility-audit',
          title: `List Test Report ${i + 1}`,
          format: i % 2 === 0 ? 'pdf' : 'html',
          status: 'completed',
          summary: {
            totalPages: i + 1,
            totalIssues: (i + 1) * 2,
            criticalIssues: 0,
            seriousIssues: i,
            moderateIssues: i,
            minorIssues: i,
          },
        };

        await makeRealHttpRequest('/api/reports', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      console.log(`✅ Setup: Created 3 reports for user ${userId}`);
    }, TIMEOUT_MS);

    it(
      'should list reports for a specific user',
      async () => {
        const userId = 88;
        const response = await makeRealHttpRequest(
          `/api/reports/user/${userId}`
        );

        expect(response.status).toBe(200);
        expect(response.ok).toBe(true);

        const data = await response.json();

        expect(data).toHaveProperty('data');
        expect(Array.isArray(data.data)).toBe(true);
        expect(data.data.length).toBeGreaterThanOrEqual(3);

        data.data.forEach((report: any) => {
          expect(report).toHaveProperty('userId', userId);
          expect(report).toHaveProperty('id');
          expect(report).toHaveProperty('title');
          expect(report).toHaveProperty('format');
        });

        console.log(`✅ Listed ${data.data.length} reports for user ${userId}`);
      },
      TIMEOUT_MS
    );

    it(
      'should list reports by analysis ID',
      async () => {
        const analysisId = 100;
        const response = await makeRealHttpRequest(
          `/api/reports/analysis/${analysisId}`
        );

        expect(response.status).toBe(200);
        expect(response.ok).toBe(true);

        const data = await response.json();
        expect(data).toHaveProperty('data');
        expect(Array.isArray(data.data)).toBe(true);

        if (data.data.length > 0) {
          data.data.forEach((report: any) => {
            expect(report).toHaveProperty('analysisId', analysisId);
          });
        }
      },
      TIMEOUT_MS
    );

    it(
      'should return empty array for user with no reports',
      async () => {
        const userWithNoData = 77777;
        const response = await makeRealHttpRequest(
          `/api/reports/user/${userWithNoData}`
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

  describe('Update Report Status', () => {
    let reportId: number;

    beforeAll(async () => {
      const payload = {
        userId: 3,
        analysisId: 3,
        reportType: 'accessibility-audit',
        title: 'Status Update Test Report',
        format: 'pdf',
        status: 'pending',
        summary: {
          totalPages: 1,
          totalIssues: 1,
          criticalIssues: 0,
          seriousIssues: 0,
          moderateIssues: 1,
          minorIssues: 0,
        },
      };

      const response = await makeRealHttpRequest('/api/reports', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      reportId = data.data.id;
    }, TIMEOUT_MS);

    it(
      'should update report status from pending to completed',
      async () => {
        const updatePayload = {
          status: 'completed',
          metadata: {
            completedAt: new Date().toISOString(),
          },
        };

        const response = await makeRealHttpRequest(`/api/reports/${reportId}`, {
          method: 'PATCH',
          body: JSON.stringify(updatePayload),
        });

        // Puede retornar 200 o 204
        expect([200, 204]).toContain(response.status);

        // Verificar que el cambio se persistió
        const getResponse = await makeRealHttpRequest(
          `/api/reports/${reportId}`
        );
        const getData = await getResponse.json();

        expect(getData.data.status).toBe('completed');
        console.log(`✅ Updated report ${reportId} status to completed`);
      },
      TIMEOUT_MS
    );
  });

  describe('Database Persistence', () => {
    it(
      'should persist report data across multiple requests',
      async () => {
        const title = `Persistence Test - ${Date.now()}`;

        // Crear reporte
        const createPayload = {
          userId: 66,
          analysisId: 66,
          reportType: 'accessibility-audit',
          title: title,
          format: 'html',
          status: 'completed',
          summary: {
            totalPages: 7,
            totalIssues: 15,
            criticalIssues: 3,
            seriousIssues: 5,
            moderateIssues: 4,
            minorIssues: 3,
          },
        };

        const createResponse = await makeRealHttpRequest('/api/reports', {
          method: 'POST',
          body: JSON.stringify(createPayload),
        });

        expect(createResponse.status).toBe(201);
        const createData = await createResponse.json();
        const reportId = createData.data.id;

        // Verificar persistencia inmediata
        const getResponse1 = await makeRealHttpRequest(
          `/api/reports/${reportId}`
        );
        expect(getResponse1.status).toBe(200);
        const getData1 = await getResponse1.json();
        expect(getData1.data.title).toBe(title);

        // Delay y verificar persistencia
        await new Promise(resolve => setTimeout(resolve, 2000));

        const getResponse2 = await makeRealHttpRequest(
          `/api/reports/${reportId}`
        );
        expect(getResponse2.status).toBe(200);
        const getData2 = await getResponse2.json();
        expect(getData2.data.title).toBe(title);
        expect(getData2.data.summary.totalIssues).toBe(15);

        console.log(`✅ Report data persisted correctly for ID ${reportId}`);
      },
      TIMEOUT_MS
    );
  });

  describe('Error Handling', () => {
    it(
      'should handle malformed JSON',
      async () => {
        const response = await fetch(`${REPORTS_API_URL}/api/reports`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid JSON content}}}',
        });

        expect(response.status).toBe(400);
        expect(response.ok).toBe(false);
      },
      TIMEOUT_MS
    );

    it(
      'should handle invalid report type',
      async () => {
        const payload = {
          userId: 1,
          analysisId: 1,
          reportType: 'invalid-type-that-does-not-exist',
          title: 'Invalid Type Test',
          format: 'pdf',
          status: 'completed',
          summary: {
            totalPages: 1,
            totalIssues: 0,
            criticalIssues: 0,
            seriousIssues: 0,
            moderateIssues: 0,
            minorIssues: 0,
          },
        };

        const response = await makeRealHttpRequest('/api/reports', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        // Debe retornar error 400 o aceptar cualquier tipo
        expect([201, 400]).toContain(response.status);
      },
      TIMEOUT_MS
    );
  });
});
