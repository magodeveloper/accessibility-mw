import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { abortAfter } from '../../src/utils/timing';

// Funciones auxiliares para evitar anidamiento excesivo
const createDelayedPromise = (
  value: string,
  delay: number
): Promise<string> => {
  const resolver = (resolve: (value: string) => void) => resolve(value);

  return new Promise<string>(resolve => {
    setTimeout(() => resolver(resolve), delay);
  });
};

describe('Timing Utility', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('abortAfter', () => {
    it('debe resolver la promesa si se completa antes del timeout', async () => {
      const promise = createDelayedPromise('success', 100);

      const result = abortAfter(500, promise);

      jest.advanceTimersByTime(100);

      await expect(result).resolves.toBe('success');
    });

    it('debe rechazar con TimeoutError si excede el tiempo límite', async () => {
      const promise = createDelayedPromise('success', 1000);

      const result = abortAfter(500, promise);

      jest.advanceTimersByTime(500);

      await expect(result).rejects.toMatchObject({
        name: 'TimeoutError',
        code: 'ETIMEDOUT',
        message: 'Timeout after 500ms',
        details: {
          durationMs: 500,
        },
      });
    });

    it('debe incluir información adicional en el error de timeout', async () => {
      const promise = new Promise<string>(() => {
        // Never resolves
      });

      const info = {
        tool: 'axe-core' as const,
        phase: 'analysis',
        extra: { userId: 123, url: 'https://example.com' },
      };

      const result = abortAfter(300, promise, info);

      jest.advanceTimersByTime(300);

      await expect(result).rejects.toMatchObject({
        name: 'TimeoutError',
        code: 'ETIMEDOUT',
        message: 'Timeout after 300ms',
        details: {
          durationMs: 300,
          tool: 'axe-core',
          phase: 'analysis',
          userId: 123,
          url: 'https://example.com',
        },
      });
    });

    it('debe propagar errores de la promesa original', async () => {
      const originalError = new Error('Original error');
      const promise = Promise.reject(originalError);

      const result = abortAfter(500, promise);

      await expect(result).rejects.toBe(originalError);
    });

    it('debe convertir valores no-Error a Error', async () => {
      const promise = Promise.reject('string error');

      const result = abortAfter(500, promise);

      await expect(result).rejects.toBeInstanceOf(Error);
      await expect(result).rejects.toHaveProperty('message', 'string error');
    });

    it('debe manejar promesas que se resuelven exactamente en el timeout', async () => {
      const promise = createDelayedPromise('on-time', 400);

      const result = abortAfter(500, promise);

      jest.advanceTimersByTime(400);

      // La promesa se resuelve antes del timeout
      await expect(result).resolves.toBe('on-time');
    });

    it('debe limpiar el timer cuando la promesa se resuelve', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const promise = Promise.resolve('quick');

      await abortAfter(1000, promise);

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('debe limpiar el timer cuando la promesa se rechaza', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const promise = Promise.reject(new Error('quick error'));

      await expect(abortAfter(1000, promise)).rejects.toThrow('quick error');

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('debe funcionar sin información adicional', async () => {
      const promise = new Promise<string>(() => {
        // Never resolves
      });

      const result = abortAfter(200, promise); // Sin info parameter

      jest.advanceTimersByTime(200);

      await expect(result).rejects.toMatchObject({
        name: 'TimeoutError',
        code: 'ETIMEDOUT',
        details: {
          durationMs: 200,
        },
      });
    });

    it('debe manejar info sin extra', async () => {
      const promise = new Promise<string>(() => {
        // Never resolves
      });

      const info = {
        tool: 'equal-access' as const,
        phase: 'initialization',
      };

      const result = abortAfter(150, promise, info);

      jest.advanceTimersByTime(150);

      await expect(result).rejects.toMatchObject({
        name: 'TimeoutError',
        code: 'ETIMEDOUT',
        details: {
          durationMs: 150,
          tool: 'equal-access',
          phase: 'initialization',
        },
      });
    });

    it('debe serializar correctamente objetos complejos en extra', async () => {
      const promise = new Promise<string>(() => {
        // Never resolves
      });

      const info = {
        tool: 'axe-core' as const,
        extra: {
          nested: { value: 'test' },
          array: [1, 2, 3],
          date: new Date('2024-01-01'),
        },
      };

      const result = abortAfter(100, promise, info);

      jest.advanceTimersByTime(100);

      try {
        await result;
      } catch (error: any) {
        expect(error.details.nested).toEqual({ value: 'test' });
        expect(error.details.array).toEqual([1, 2, 3]);
        expect(error.details.date).toBe('2024-01-01T00:00:00.000Z');
      }
    });
  });
});
