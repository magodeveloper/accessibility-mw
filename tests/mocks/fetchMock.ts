/**
 * Setup de mocks para pruebas de integración HTTP
 * Intercepta las llamadas fetch para validar la integración sin hacer requests reales
 */

import { afterEach, beforeEach, jest } from '@jest/globals';

interface MockFetchResponse {
  status: number;
  ok: boolean;
  json: () => Promise<any>;
  text: () => Promise<string>;
  statusText: string;
}

interface FetchCall {
  url: string;
  options: RequestInit;
  timestamp: number;
}

class FetchMockManager {
  private calls: FetchCall[] = [];
  private responses: Map<string, MockFetchResponse | Error> = new Map();
  private originalFetch: typeof fetch;

  constructor() {
    this.originalFetch = global.fetch;
  }

  // Configurar respuesta para un endpoint específico
  mockEndpoint(
    urlPattern: string,
    response: Partial<MockFetchResponse> | Error
  ) {
    if (response instanceof Error) {
      this.responses.set(urlPattern, response);
    } else {
      const fullResponse: MockFetchResponse = {
        status: 200,
        ok: true,
        statusText: 'OK',
        json: () =>
          Promise.resolve({
            data: { id: Math.floor(Math.random() * 1000) + 1 },
          }),
        text: () => Promise.resolve('OK'),
        ...response,
      };
      this.responses.set(urlPattern, fullResponse);
    }
  }

  // Configurar respuestas exitosas por defecto para APIs
  setupDefaultResponses() {
    // Analysis API endpoints
    this.mockEndpoint('/api/analysis', {
      status: 201,
      ok: true,
      json: () => Promise.resolve({ data: { id: 456, Id: 456 } }),
    });

    this.mockEndpoint('/api/result', {
      status: 201,
      ok: true,
      json: () => Promise.resolve({ data: { id: 789, Id: 789 } }),
    });

    this.mockEndpoint('/api/error', {
      status: 201,
      ok: true,
      json: () => Promise.resolve({ data: { id: 101112, Id: 101112 } }),
    });

    // Reports API endpoints
    this.mockEndpoint('/api/history', {
      status: 201,
      ok: true,
      json: () => Promise.resolve({ data: { id: 131415, Id: 131415 } }),
    });
  }

  // Instalar el mock de fetch
  install() {
    global.fetch = jest.fn(
      async (
        input: RequestInfo | URL,
        init?: RequestInit
      ): Promise<Response> => {
        const urlString = input.toString();

        // Registrar la llamada
        this.calls.push({
          url: urlString,
          options: init || {},
          timestamp: Date.now(),
        });

        // Buscar respuesta configurada
        for (const [pattern, response] of this.responses) {
          if (urlString.includes(pattern)) {
            if (response instanceof Error) {
              throw response;
            }

            // Simular delay mínimo de red
            await new Promise(resolve => setTimeout(resolve, 1));

            return response as Response;
          }
        }

        // Respuesta por defecto si no se encontró configuración específica
        return {
          status: 200,
          ok: true,
          statusText: 'OK',
          json: () => Promise.resolve({ data: { id: 999, Id: 999 } }),
          text: () => Promise.resolve('Mock Response'),
        } as Response;
      }
    );
  }

  // Restaurar fetch original
  restore() {
    global.fetch = this.originalFetch;
  }

  // Métodos para verificación en tests
  getCallCount(): number {
    return this.calls.length;
  }

  getCallsToEndpoint(pattern: string): FetchCall[] {
    return this.calls.filter(call => call.url.includes(pattern));
  }

  getLastCall(): FetchCall | undefined {
    return this.calls[this.calls.length - 1];
  }

  getAllCalls(): FetchCall[] {
    return [...this.calls];
  }

  // Verificar si se hizo una llamada específica
  wasEndpointCalled(pattern: string): boolean {
    return this.calls.some(call => call.url.includes(pattern));
  }

  // Verificar payload de llamada
  wasCalledWithPayload(pattern: string, expectedPayload: any): boolean {
    const calls = this.getCallsToEndpoint(pattern);
    return calls.some(call => {
      if (!call.options.body) return false;
      try {
        const actualPayload = JSON.parse(call.options.body as string);
        return (
          JSON.stringify(actualPayload) === JSON.stringify(expectedPayload)
        );
      } catch {
        return false;
      }
    });
  }

  // Reset para nuevo test
  reset() {
    this.calls = [];
    this.responses.clear();
    this.setupDefaultResponses();
  }
}

// Singleton para usar en tests
export const fetchMockManager = new FetchMockManager();

// Helper para configurar mocks en tests
export const setupHttpMocks = () => {
  beforeEach(() => {
    fetchMockManager.reset();
    fetchMockManager.install();
  });

  afterEach(() => {
    fetchMockManager.restore();
  });

  return fetchMockManager;
};

// Mocks específicos para escenarios comunes
export const mockAnalysisApiSuccess = () => {
  fetchMockManager.mockEndpoint('/api/analysis', {
    status: 201,
    ok: true,
    json: () => Promise.resolve({ data: { id: 456 } }),
  });
};

export const mockAnalysisApiError = () => {
  fetchMockManager.mockEndpoint(
    '/api/analysis',
    new Error('Analysis API unavailable')
  );
};

export const mockReportsApiSuccess = () => {
  fetchMockManager.mockEndpoint('/api/history', {
    status: 201,
    ok: true,
    json: () => Promise.resolve({ data: { id: 789 } }),
  });
};

export const mockReportsApiError = () => {
  fetchMockManager.mockEndpoint(
    '/api/history',
    new Error('Reports API unavailable')
  );
};
