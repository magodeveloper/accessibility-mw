import { Request, Response, NextFunction } from 'express';
import { notFoundHandler, errorHandler } from '../../src/middlewares/errorHandler';

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

      expect(mockRequest.log.warn).toHaveBeenCalledWith(
        {
          requestId: 'test-request-id',
          path: '/test',
          method: 'GET',
        },
        'Route not found'
      );
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
      
      methods.forEach((method) => {
        const request = { 
          ...mockRequest, 
          method,
          id: `test-id-${method}`
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
      });
    });
  });

  describe('errorHandler', () => {
    it('debe manejar TimeoutError correctamente', () => {
      const timeoutError = {
        name: 'TimeoutError',
        code: 'ETIMEDOUT',
        message: 'Operation timed out',
        operation: 'page-load',
      };

      errorHandler(timeoutError as any, mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(504);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: 'La operación excedió el tiempo límite',
        details: {
          timeout: true,
          operation: 'page-load',
        },
        requestId: 'test-request-id',
      });
    });

    it('debe loggear timeout errors', () => {
      const timeoutError = {
        name: 'TimeoutError',
        code: 'ETIMEDOUT',
        message: 'Operation timed out',
      };

      errorHandler(timeoutError as any, mockRequest as any, mockResponse as any);

      expect(mockRequest.log.warn).toHaveBeenCalledWith(
        {
          requestId: 'test-request-id',
          err: { message: 'Operation timed out', code: 'ETIMEDOUT' },
        },
        'Timeout error'
      );
    });

    it('debe manejar AnalysisError correctamente', () => {
      const analysisError = {
        code: 'ANALYSIS_ERROR',
        message: 'Analysis failed',
        details: { url: 'https://example.com' },
      };

      errorHandler(analysisError as any, mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(422);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Error durante el análisis de accesibilidad',
        details: { url: 'https://example.com' },
        requestId: 'test-request-id',
      });
    });

    it('debe manejar errores de validación de URL', () => {
      const urlError = {
        code: 'URL_VALIDATION_ERROR',
        message: 'Invalid URL',
        details: { provided: 'invalid-url' },
      };

      errorHandler(urlError as any, mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: 'URL proporcionada no es válida',
        details: { provided: 'invalid-url' },
        requestId: 'test-request-id',
      });
    });

    it('debe manejar errores de JSON parsing', () => {
      const jsonError = {
        name: 'SyntaxError',
        type: 'entity.parse.failed',
        message: 'Unexpected token } in JSON',
        body: '{"invalid": }',
      };

      errorHandler(jsonError as any, mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: 'JSON inválido',
        details: {
          formErrors: ['Unexpected token } in JSON'],
          fieldErrors: {},
        },
        requestId: 'test-request-id',
      });
    });

    it('debe manejar errores con status personalizado y expose=true', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const customError = new Error('Access denied');
      (customError as any).status = 403;
      (customError as any).expose = true;
      (customError as any).name = 'ForbiddenError';

      errorHandler(customError as any, mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Access denied',
        details: {},
        requestId: 'test-request-id',
      });

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('debe manejar errores genéricos en producción', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = {
        message: 'Database connection failed',
        stack: 'Error stack trace...',
      };

      errorHandler(error as any, mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Internal Server Error',
        details: {},
        requestId: 'test-request-id',
      });

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('debe incluir stack trace en desarrollo', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = {
        message: 'Database connection failed',
        stack: 'Error stack trace...',
      };

      errorHandler(error as any, mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Database connection failed',
        details: {},
        requestId: 'test-request-id',
        stack: 'Error stack trace...',
      });

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('debe incluir stack trace en test environment', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const error = {
        message: 'Test error',
        stack: 'Error stack trace...',
      };

      errorHandler(error as any, mockRequest as any, mockResponse as any);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: 'Error stack trace...',
          requestId: 'test-request-id',
        })
      );

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('debe manejar errores con status personalizado', () => {
      const error = new Error('Too many requests');
      (error as any).status = 429;

      errorHandler(error as any, mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: 'Too many requests',
          requestId: 'test-request-id',
        })
      );
    });

    it('debe usar default 500 para errores sin status', () => {
      const error = {
        message: 'Unknown error',
      };

      errorHandler(error as any, mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: 'Unknown error',
          requestId: 'test-request-id',
        })
      );
    });

    it('debe loggear errores con información detallada', () => {
      const error = {
        message: 'General error',
        code: 'GENERAL_ERROR',
        name: 'GeneralError',
      };

      errorHandler(error as any, mockRequest as any, mockResponse as any);

      expect(mockRequest.log.error).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-request-id',
          err: expect.objectContaining({
            message: 'General error',
            code: 'GENERAL_ERROR',
            name: 'GeneralError',
          }),
          status: 500,
          url: '/test',
          method: 'GET',
          userAgent: 'test-user-agent',
          ip: '127.0.0.1',
        }),
        'Unhandled error'
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
        errorHandler(error as any, requestWithoutLog, mockResponse as any);
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

      errorHandler(error as any, mockRequest as any, mockResponse as any);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'TEST_ERROR',
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

      errorHandler(error as any, mockRequest as any, mockResponse as any);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.not.objectContaining({
          code: 'TEST_ERROR',
        })
      );

      process.env.NODE_ENV = originalNodeEnv;
    });
  });
});
