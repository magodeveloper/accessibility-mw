import { describe, expect, it } from '@jest/globals';
import { ApiResponse, error, success } from '../../src/utils/response';

describe('Response Utility', () => {
  describe('success', () => {
    it('debe crear una respuesta exitosa básica', () => {
      const data = { message: 'Test data' };

      const result = success(data);

      expect(result).toEqual({
        ok: true,
        data: { message: 'Test data' },
      });
    });

    it('debe crear una respuesta exitosa con requestId', () => {
      const data = { value: 123 };
      const requestId = 'req-12345';

      const result = success(data, requestId);

      expect(result).toEqual({
        ok: true,
        data: { value: 123 },
        requestId: 'req-12345',
      });
    });

    it('debe manejar diferentes tipos de datos', () => {
      // String
      const stringResult = success('Hello World');
      expect(stringResult.data).toBe('Hello World');
      expect(stringResult.ok).toBe(true);

      // Number
      const numberResult = success(42);
      expect(numberResult.data).toBe(42);
      expect(numberResult.ok).toBe(true);

      // Boolean
      const boolResult = success(true);
      expect(boolResult.data).toBe(true);
      expect(boolResult.ok).toBe(true);

      // Array
      const arrayResult = success([1, 2, 3]);
      expect(arrayResult.data).toEqual([1, 2, 3]);
      expect(arrayResult.ok).toBe(true);

      // Null
      const nullResult = success(null);
      expect(nullResult.data).toBe(null);
      expect(nullResult.ok).toBe(true);
    });

    it('debe preservar el tipo de los datos', () => {
      interface TestData {
        id: number;
        name: string;
        active: boolean;
      }

      const testData: TestData = {
        id: 1,
        name: 'Test User',
        active: true,
      };

      const result: ApiResponse<TestData> = success(testData);

      expect(result.ok).toBe(true);
      expect(result.data).toEqual(testData);
      // TypeScript type checking ensures the type is preserved
    });
  });

  describe('error', () => {
    it('debe crear una respuesta de error básica', () => {
      const errorMessage = 'Something went wrong';

      const result = error(errorMessage);

      expect(result).toEqual({
        ok: false,
        error: 'Something went wrong',
      });
    });

    it('debe crear una respuesta de error con código', () => {
      const errorMessage = 'Validation failed';
      const errorCode = 'VALIDATION_ERROR';

      const result = error(errorMessage, errorCode);

      expect(result).toEqual({
        ok: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
      });
    });

    it('debe crear una respuesta de error con detalles', () => {
      const errorMessage = 'Invalid input';
      const errorCode = 'INVALID_INPUT';
      const details = {
        field: 'email',
        value: 'invalid-email',
        constraint: 'Must be a valid email address',
      };

      const result = error(errorMessage, errorCode, details);

      expect(result).toEqual({
        ok: false,
        error: 'Invalid input',
        code: 'INVALID_INPUT',
        details: {
          field: 'email',
          value: 'invalid-email',
          constraint: 'Must be a valid email address',
        },
      });
    });

    it('debe crear una respuesta de error completa con requestId', () => {
      const errorMessage = 'Server error';
      const errorCode = 'INTERNAL_ERROR';
      const details = { timestamp: '2024-01-01T00:00:00Z' };
      const requestId = 'req-error-123';

      const result = error(errorMessage, errorCode, details, requestId);

      expect(result).toEqual({
        ok: false,
        error: 'Server error',
        code: 'INTERNAL_ERROR',
        details: { timestamp: '2024-01-01T00:00:00Z' },
        requestId: 'req-error-123',
      });
    });

    it('debe manejar errores con solo mensaje y requestId', () => {
      const errorMessage = 'Not found';
      const requestId = 'req-notfound-456';

      const result = error(errorMessage, undefined, undefined, requestId);

      expect(result).toEqual({
        ok: false,
        error: 'Not found',
        requestId: 'req-notfound-456',
      });
    });

    it('debe manejar detalles complejos', () => {
      const errorMessage = 'Multiple validation errors';
      const errorCode = 'VALIDATION_FAILED';
      const details = {
        errors: [
          { field: 'name', message: 'Required field' },
          { field: 'age', message: 'Must be positive number' },
        ],
        total: 2,
        context: {
          userId: 123,
          action: 'create_user',
        },
      };

      const result = error(errorMessage, errorCode, details);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Multiple validation errors');
      expect(result.code).toBe('VALIDATION_FAILED');
      expect(result.details).toEqual(details);
    });
  });

  describe('ApiResponse interface', () => {
    it('debe tener la estructura correcta para respuestas exitosas', () => {
      const successResponse: ApiResponse<string> = {
        ok: true,
        data: 'test data',
        requestId: 'test-req-id',
      };

      expect(successResponse.ok).toBe(true);
      expect(successResponse.data).toBe('test data');
      expect(successResponse.requestId).toBe('test-req-id');
      expect(successResponse.error).toBeUndefined();
      expect(successResponse.code).toBeUndefined();
      expect(successResponse.details).toBeUndefined();
    });

    it('debe tener la estructura correcta para respuestas de error', () => {
      const errorResponse: ApiResponse<never> = {
        ok: false,
        error: 'Test error',
        code: 'TEST_ERROR',
        details: { info: 'additional info' },
        requestId: 'error-req-id',
      };

      expect(errorResponse.ok).toBe(false);
      expect(errorResponse.error).toBe('Test error');
      expect(errorResponse.code).toBe('TEST_ERROR');
      expect(errorResponse.details).toEqual({ info: 'additional info' });
      expect(errorResponse.requestId).toBe('error-req-id');
      expect(errorResponse.data).toBeUndefined();
    });

    it('debe permitir respuestas con campos opcionales', () => {
      const minimalSuccess: ApiResponse<number> = {
        ok: true,
        data: 42,
      };

      expect(minimalSuccess.ok).toBe(true);
      expect(minimalSuccess.data).toBe(42);

      const minimalError: ApiResponse<never> = {
        ok: false,
        error: 'Minimal error',
      };

      expect(minimalError.ok).toBe(false);
      expect(minimalError.error).toBe('Minimal error');
    });
  });
});
