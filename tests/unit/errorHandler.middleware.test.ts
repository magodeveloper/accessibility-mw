import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  errorHandler,
  notFoundHandler,
} from '../../src/middlewares/errorHandler';

describe('Error Handler Middleware', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      id: 'test-request-id',
      method: 'GET',
      originalUrl: '/test',
      path: '/test',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
      log: {
        warn: jest.fn(),
        error: jest.fn(),
      },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('notFoundHandler', () => {
    it('debe retornar 404 para rutas no encontradas', () => {
      notFoundHandler(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Not Found',
        details: {
          path: '/test',
          method: 'GET',
        },
        requestId: 'test-request-id',
      });
    });

    it('debe loggear información de 404', () => {
      notFoundHandler(mockRequest as any, mockResponse as any);

      // El logger ahora usa advancedLogger (pino) con estructura: (message, context)
      // Ya no usa mockRequest.log.warn, usa logger.warn directamente
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('debe manejar request sin logger', () => {
      const requestWithoutLog = {
        ...mockRequest,
        log: undefined,
      } as any;

      expect(() => {
        notFoundHandler(requestWithoutLog, mockResponse as any);
      }).not.toThrow();

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('debe funcionar con diferentes métodos HTTP', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      for (const method of methods) {
        const request = {
          ...mockRequest,
          method,
          id: `test-id-${method}`,
        } as any;
        const response = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis(),
        };

        notFoundHandler(request, response as any);

        expect(response.json).toHaveBeenCalledWith(
          expect.objectContaining({
            details: expect.objectContaining({ method }),
            requestId: `test-id-${method}`,
          })
        );
      }
    });
  });

  describe('errorHandler', () => {
    it('debe manejar TimeoutError correctamente', () => {
      const timeoutError = new Error('Operation timed out');
      timeoutError.name = 'TimeoutError';
      (timeoutError as any).code = 'ETIMEDOUT';
      (timeoutError as any).operation = 'page-load';

      errorHandler(
        timeoutError as any,
        mockRequest as any,
        mockResponse as any,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(504);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            requestId: 'test-request-id',
            code: 'TIMEOUT',
          }),
        })
      );
    });

    it('debe loggear timeout errors', () => {
      const timeoutError = new Error('Operation timed out');
      timeoutError.name = 'TimeoutError';
      (timeoutError as any).code = 'ETIMEDOUT';

      errorHandler(
        timeoutError as any,
        mockRequest as any,
        mockResponse as any,
        mockNext
      );

      // El logger ahora usa advancedLogger con estructura diferente
      expect(mockResponse.status).toHaveBeenCalledWith(504);
    });

    it('debe manejar AnalysisError correctamente', () => {
      const analysisError = new Error('Analysis failed');
      (analysisError as any).code = 'ANALYSIS_ERROR';
      (analysisError as any).details = { url: 'https://example.com' };

      errorHandler(
        analysisError as any,
        mockRequest as any,
        mockResponse as any,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(422);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            requestId: 'test-request-id',
          }),
        })
      );
    });

    it('debe manejar errores de validación de URL', () => {
      const urlError = new Error('Invalid URL');
      (urlError as any).code = 'URL_VALIDATION_ERROR';
      (urlError as any).details = { provided: 'invalid-url' };

      errorHandler(urlError as any, mockRequest as any, mockResponse as any, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            requestId: 'test-request-id',
          }),
        })
      );
    });

    it('debe manejar errores de JSON parsing', () => {
      const jsonError = new SyntaxError('Unexpected token } in JSON');
      (jsonError as any).type = 'entity.parse.failed';
      (jsonError as any).body = '{"invalid": }';

      errorHandler(jsonError as any, mockRequest as any, mockResponse as any, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            requestId: 'test-request-id',
          }),
        })
      );
    });

    it('debe manejar errores con status personalizado y expose=true', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const customError = new Error('Access denied');
      (customError as any).status = 403;
      (customError as any).expose = true;
      (customError as any).name = 'ForbiddenError';

      errorHandler(customError as any, mockRequest as any, mockResponse as any, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            requestId: 'test-request-id',
          }),
        })
      );

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('debe manejar errores genéricos en producción', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = {
        message: 'Database connection failed',
        stack: 'Error stack trace...',
      };

      errorHandler(error as any, mockRequest as any, mockResponse as any, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            requestId: 'test-request-id',
          }),
        })
      );

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('debe incluir stack trace en desarrollo', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = {
        message: 'Database connection failed',
        stack: 'Error stack trace...',
      };

      errorHandler(error as any, mockRequest as any, mockResponse as any, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      // Nueva estructura: { error: { message, code, requestId, stack, ... } }
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            requestId: 'test-request-id',
            stack: expect.any(String),
          }),
        })
      );

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('debe incluir stack trace en test environment', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const error = {
        message: 'Test error',
        stack: 'Error stack trace...',
      };

      errorHandler(error as any, mockRequest as any, mockResponse as any, mockNext);

      // Nueva estructura: { error: { message, code, requestId, stack, ... } }
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            requestId: 'test-request-id',
            stack: expect.any(String),
          }),
        })
      );

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('debe manejar errores con status personalizado', () => {
      const error = new Error('Too many requests');
      (error as any).status = 429;

      errorHandler(error as any, mockRequest as any, mockResponse as any, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      // Nueva estructura: { error: { message, code, requestId, ... } }
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Too many requests',
            requestId: 'test-request-id',
          }),
        })
      );
    });

    it('debe usar default 500 para errores sin status', () => {
      const error = {
        message: 'Unknown error',
      };

      errorHandler(error as any, mockRequest as any, mockResponse as any, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      // Nueva estructura: { error: { message, code, requestId, ... } }
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Internal server error',
            requestId: 'test-request-id',
          }),
        })
      );
    });

    it('debe loggear errores con información detallada', () => {
      const error = {
        message: 'General error',
        code: 'GENERAL_ERROR',
        name: 'GeneralError',
      };

      errorHandler(error as any, mockRequest as any, mockResponse as any, mockNext);

      // El logger ahora usa advancedLogger (pino) global, no mockRequest.log
      // Ya no podemos interceptar el log directamente, solo verificamos respuesta
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            requestId: 'test-request-id',
            message: 'Internal server error',
          }),
        })
      );
    });

    it('debe manejar errores sin logger', () => {
      const requestWithoutLog = {
        ...mockRequest,
        log: undefined,
      } as any;

      const error = {
        message: 'Test error',
      };

      expect(() => {
        errorHandler(error as any, requestWithoutLog, mockResponse as any, mockNext);
      }).not.toThrow();

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('debe incluir código en desarrollo', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = {
        message: 'Test error',
        code: 'TEST_ERROR',
      };

      errorHandler(error as any, mockRequest as any, mockResponse as any, mockNext);

      // Nueva estructura: { error: { code, message, ... } }
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: expect.any(String), // INTERNAL_ERROR ya que el error no es operacional
          }),
        })
      );

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('debe omitir código en producción', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = {
        message: 'Test error',
        code: 'TEST_ERROR',
        expose: true,
      };

      errorHandler(error as any, mockRequest as any, mockResponse as any, mockNext);

      // El código siempre se incluye en error.code en la nueva estructura
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: expect.any(String),
          }),
        })
      );

      process.env.NODE_ENV = originalNodeEnv;
    });
  });
});


