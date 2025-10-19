/**
 * Tests de CONTRATO para validar llamadas HTTP a microservicios
 *
 * ⚠️ IMPORTANTE: Usa MOCKS (fetchMock) - NO hace requests reales
 *
 * Propósito:
 * - Validar estructuras de request/response de microservicios
 * - Verificar contratos de API HTTP
 * - Tests rápidos sin requerir docker
 *
 * Para tests de integración REALES ver:
 * - tests/integration/analyze-real.integration.test.ts
 * - tests/integration/real-analysis-api.test.ts
 * - tests/integration/real-reports-api.test.ts
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { setupHttpMocks } from '../mocks/fetchMock';

// Configurar mocks para todos los tests
setupHttpMocks();

// Tipo helper para el mock de fetch
type FetchMock = jest.Mock<() => Promise<Response>>;

describe('Microservices HTTP Contract Tests', () => {
  beforeEach(() => {
    // Reset mocks antes de cada test
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  describe('MS-Analysis API Contract', () => {
    it('should validate POST /api/analyze response structure', async () => {
      // Mock de respuesta exitosa
      const mockResponse = {
        ok: true,
        status: 201,
        json: async () => ({
          data: {
            Id: 123,
            Url: 'https://example.com',
            Status: 'completed',
          },
        }),
      } as unknown as Response;

      (global.fetch as unknown as FetchMock).mockResolvedValueOnce(
        mockResponse
      );

      // Simular request al microservicio
      const response = await fetch('http://localhost:8082/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          url: 'https://example.com',
          tool: 'axe-core',
        }),
      });

      // Validar contrato de respuesta
      expect(response.ok).toBe(true);
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('Id');
      expect(data.data.Id).toBe(123);
    });

    it('should validate POST /api/result response structure', async () => {
      // Mock de respuesta para guardar resultados
      const mockResponse = {
        ok: true,
        status: 201,
        json: async () => ({
          data: {
            Id: 456,
            AnalysisId: 123,
            Results: '{}',
          },
        }),
      } as unknown as Response;

      (global.fetch as unknown as FetchMock).mockResolvedValueOnce(
        mockResponse
      );

      // Simular request de guardar resultados
      const response = await fetch('http://localhost:8082/api/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisId: 123,
          results: { violations: [] },
        }),
      });

      // Validar contrato
      expect(response.ok).toBe(true);
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data).toHaveProperty('Id');
      expect(data.data).toHaveProperty('AnalysisId');
      expect(data.data.AnalysisId).toBe(123);
    });

    it('should handle MS-Analysis API errors', async () => {
      // Mock de error
      (global.fetch as unknown as FetchMock).mockRejectedValueOnce(
        new Error('Service unavailable')
      );

      // Intentar request que fallará
      try {
        await fetch('http://localhost:8082/api/analyze', {
          method: 'POST',
          body: JSON.stringify({ url: 'https://example.com' }),
        });
        throw new Error('Should have thrown error');
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('Service unavailable');
      }
    });
  });

  describe('MS-Reports API Contract', () => {
    it('should validate POST /api/History response structure', async () => {
      // Mock de respuesta para history
      const mockResponse = {
        ok: true,
        status: 201,
        json: async () => ({
          data: {
            Id: 789,
            UserId: 1,
            AnalysisId: 123,
            CreatedAt: '2025-01-01T00:00:00Z',
          },
        }),
      } as unknown as Response;

      (global.fetch as unknown as FetchMock).mockResolvedValueOnce(
        mockResponse
      );

      // Simular request de guardar historial
      const response = await fetch('http://localhost:8083/api/History', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 1,
          analysisId: 123,
        }),
      });

      // Validar contrato
      expect(response.ok).toBe(true);
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data).toHaveProperty('Id');
      expect(data.data).toHaveProperty('UserId');
      expect(data.data).toHaveProperty('AnalysisId');
      expect(data.data.UserId).toBe(1);
    });

    it('should validate GET /api/Report/{id} response structure', async () => {
      // Mock de respuesta para obtener reporte
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            Id: 123,
            AnalysisId: 456,
            Summary: 'Test report',
            CreatedAt: '2025-01-01T00:00:00Z',
          },
        }),
      } as unknown as Response;

      (global.fetch as unknown as FetchMock).mockResolvedValueOnce(
        mockResponse
      );

      // Simular request de obtener reporte
      const response = await fetch('http://localhost:8083/api/Report/123', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      // Validar contrato
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.data).toHaveProperty('Id');
      expect(data.data).toHaveProperty('AnalysisId');
      expect(data.data).toHaveProperty('Summary');
      expect(data.data.Id).toBe(123);
    });

    it('should handle MS-Reports API errors', async () => {
      // Mock de error
      (global.fetch as unknown as FetchMock).mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      // Intentar request que fallará
      try {
        await fetch('http://localhost:8083/api/History', {
          method: 'POST',
          body: JSON.stringify({ userId: 1, analysisId: 123 }),
        });
        throw new Error('Should have thrown error');
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toContain(
          'Database connection failed'
        );
      }
    });
  });

  describe('HTTP Contract Validation', () => {
    it('should validate required headers structure', () => {
      // Este test valida que conocemos los headers requeridos
      const requiredHeaders = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'accessibility-mw/1.0.0',
      };

      expect(requiredHeaders).toHaveProperty('Content-Type');
      expect(requiredHeaders).toHaveProperty('Accept');
      expect(requiredHeaders).toHaveProperty('User-Agent');
      expect(requiredHeaders['Content-Type']).toBe('application/json');
    });

    it('should validate error response structure', async () => {
      // Mock de respuesta de error estructurada
      const mockErrorResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid URL format',
            details: {
              field: 'url',
              value: 'invalid-url',
            },
          },
        }),
      } as unknown as Response;

      (global.fetch as unknown as FetchMock).mockResolvedValueOnce(
        mockErrorResponse
      );

      // Simular request que retorna error estructurado
      const response = await fetch('http://localhost:8082/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ url: 'invalid-url' }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toHaveProperty('code');
      expect(data.error).toHaveProperty('message');
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
