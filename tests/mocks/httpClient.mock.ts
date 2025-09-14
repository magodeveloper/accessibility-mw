/**
 * Mock del httpClient para tests
 * Permite validar llamadas HTTP sin hacer requests reales
 */

import { jest } from '@jest/globals';

interface MockResponse {
  status: number;
  ok: boolean;
  json: () => Promise<any>;
  text: () => Promise<string>;
}

interface MockCall {
  url: string;
  data: any;
  headers: Record<string, string>;
}

class HttpClientMock {
  private calls: MockCall[] = [];
  private responses: Map<string, MockResponse> = new Map();
  private defaultResponse: MockResponse;

  constructor() {
    this.defaultResponse = {
      status: 200,
      ok: true,
      json: () => Promise.resolve({ data: { id: 123, Id: 123 } }),
      text: () => Promise.resolve('OK'),
    };
  }

  // Registrar una respuesta específica para una URL
  mockResponse(urlPattern: string, response: Partial<MockResponse>) {
    const fullResponse: MockResponse = {
      status: 200,
      ok: true,
      json: () => Promise.resolve({ data: { id: 123 } }),
      text: () => Promise.resolve('OK'),
      ...response,
    };
    this.responses.set(urlPattern, fullResponse);
  }

  // Simular error de red
  mockNetworkError(urlPattern: string) {
    this.responses.set(urlPattern, {
      status: 0,
      ok: false,
      json: () => Promise.reject(new Error('fetch failed')),
      text: () => Promise.reject(new Error('fetch failed')),
    });
  }

  // Implementación del post que registra llamadas
  async post(
    url: string,
    data: any,
    headers: Record<string, string> = {}
  ): Promise<MockResponse> {
    // Registrar la llamada para verificación
    this.calls.push({ url, data, headers });

    // Buscar respuesta específica para esta URL
    for (const [pattern, response] of this.responses) {
      if (url.includes(pattern)) {
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 10));

        if (response.status === 0) {
          throw new Error('fetch failed');
        }

        return response;
      }
    }

    // Respuesta por defecto
    return this.defaultResponse;
  }

  // Métodos para verificación en tests
  getCallCount(): number {
    return this.calls.length;
  }

  getCallsToUrl(urlPattern: string): MockCall[] {
    return this.calls.filter(call => call.url.includes(urlPattern));
  }

  getLastCall(): MockCall | undefined {
    return this.calls[this.calls.length - 1];
  }

  getAllCalls(): MockCall[] {
    return [...this.calls];
  }

  // Reset para cada test
  reset() {
    this.calls = [];
    this.responses.clear();
  }

  // Verificaciones útiles para tests
  wasCalledWith(urlPattern: string, expectedData?: any): boolean {
    const calls = this.getCallsToUrl(urlPattern);
    if (calls.length === 0) return false;

    if (expectedData) {
      return calls.some(
        call => JSON.stringify(call.data) === JSON.stringify(expectedData)
      );
    }

    return true;
  }
}

// Singleton para usar en tests
export const httpClientMock = new HttpClientMock();

// Jest mock que reemplaza el httpClient real
export const mockHttpClient = () => {
  const analyzePath = require.resolve('../../src/routes/analyze.route');

  // Mock dinámico que preserva otras funcionalidades
  jest.doMock(analyzePath, () => {
    const originalModule = jest.requireActual(analyzePath) as any;
    return {
      ...(originalModule && typeof originalModule === 'object'
        ? originalModule
        : {}),
      // Reemplazar solo httpClient
      __httpClient: httpClientMock,
    };
  });

  return httpClientMock;
};
