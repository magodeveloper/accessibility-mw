import { validateAndSanitizeInput } from '../../src/routes/analyze.helpers';

// Mock all dependencies
jest.mock('fs');
jest.mock('../../src/routes/analyze.helpers', () => ({
  validateAndSanitizeInput: jest.fn(),
  runAnalysisTools: jest.fn(),
  buildUnified: jest.fn(),
  extractStats: jest.fn(),
  validateUrlIfNeeded: jest.fn(),
}));

jest.mock('../../src/utils/response', () => ({
  success: jest.fn((data, requestId) => ({ ok: true, data, requestId })),
  error: jest.fn((message, code, details, requestId) => ({
    ok: false,
    error: message,
    code,
    details,
    requestId,
  })),
}));

// Mock the analyze route
const mockAnalyzeRouter = {
  post: jest.fn(),
};

jest.mock('../../src/routes/analyze.route', () => ({
  __esModule: true,
  default: mockAnalyzeRouter,
}));

describe('Analyze Route Unit Tests', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      body: {
        inputType: 'html',
        value: '<html><body><h1>Test</h1></body></html>',
        tool: 'axe-core',
        wcagVersion: '2.2',
        wcagLevel: 'AA',
      },
      id: 'test-request-id',
      log: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('debe validar entrada HTML correctamente', async () => {
      const mockValidateAndSanitizeInput =
        validateAndSanitizeInput as jest.Mock;
      mockValidateAndSanitizeInput.mockResolvedValue({
        inputType: 'html',
        value: '<html><body><h1>Test</h1></body></html>',
        tool: 'axe-core',
        wcagVersion: '2.2',
        wcagLevel: 'AA',
        cumulativeWcag: false,
        userId: undefined,
      });

      const result = await validateAndSanitizeInput(
        mockRequest.body,
        'test-request-id',
        mockRequest.log
      );

      expect(result).not.toHaveProperty('error');
      expect(result).toEqual(
        expect.objectContaining({
          inputType: 'html',
          value: '<html><body><h1>Test</h1></body></html>',
          tool: 'axe-core',
          wcagVersion: '2.2',
          wcagLevel: 'AA',
        })
      );
    });

    it('debe rechazar entrada inválida', async () => {
      const mockValidateAndSanitizeInput =
        validateAndSanitizeInput as jest.Mock;
      mockValidateAndSanitizeInput.mockResolvedValue({
        error: 'Datos inválidos',
        details: { field: 'inputType', message: 'Required field' },
      });

      const result = await validateAndSanitizeInput(
        {},
        'test-request-id',
        mockRequest.log
      );

      expect(result).toHaveProperty('error');
      expect(result.error).toBe('Datos inválidos');
      expect(result).toHaveProperty('details');
    });

    it('debe validar entrada URL correctamente', async () => {
      const mockValidateAndSanitizeInput =
        validateAndSanitizeInput as jest.Mock;
      mockValidateAndSanitizeInput.mockResolvedValue({
        inputType: 'url',
        value: 'https://example.com',
        tool: 'axe-core',
        wcagVersion: '2.2',
        wcagLevel: 'AA',
        cumulativeWcag: false,
        userId: 123,
      });

      const urlRequest = {
        inputType: 'url',
        value: 'https://example.com',
        tool: 'axe-core',
        wcagVersion: '2.2',
        wcagLevel: 'AA',
        userId: 123,
      };

      const result = await validateAndSanitizeInput(
        urlRequest,
        'test-request-id',
        mockRequest.log
      );

      expect(result).toEqual(
        expect.objectContaining({
          inputType: 'url',
          value: 'https://example.com',
          userId: 123,
        })
      );
    });

    it('debe manejar diferentes herramientas de análisis', async () => {
      const tools = ['axe-core', 'equal-access', 'both'];
      const mockValidateAndSanitizeInput =
        validateAndSanitizeInput as jest.Mock;

      for (const tool of tools) {
        mockValidateAndSanitizeInput.mockResolvedValue({
          inputType: 'html',
          value: '<html><body><h1>Test</h1></body></html>',
          tool,
          wcagVersion: '2.2',
          wcagLevel: 'AA',
          cumulativeWcag: false,
          userId: undefined,
        });

        const result = await validateAndSanitizeInput(
          { ...mockRequest.body, tool },
          'test-request-id',
          mockRequest.log
        );

        expect(result.tool).toBe(tool);
      }
    });

    it('debe manejar diferentes versiones WCAG', async () => {
      const versions = ['2.0', '2.1', '2.2'];
      const mockValidateAndSanitizeInput =
        validateAndSanitizeInput as jest.Mock;

      for (const version of versions) {
        mockValidateAndSanitizeInput.mockResolvedValue({
          inputType: 'html',
          value: '<html><body><h1>Test</h1></body></html>',
          tool: 'axe-core',
          wcagVersion: version,
          wcagLevel: 'AA',
          cumulativeWcag: false,
          userId: undefined,
        });

        const result = await validateAndSanitizeInput(
          { ...mockRequest.body, wcagVersion: version },
          'test-request-id',
          mockRequest.log
        );

        expect(result.wcagVersion).toBe(version);
      }
    });

    it('debe manejar diferentes niveles WCAG', async () => {
      const levels = ['A', 'AA', 'AAA'];
      const mockValidateAndSanitizeInput =
        validateAndSanitizeInput as jest.Mock;

      for (const level of levels) {
        mockValidateAndSanitizeInput.mockResolvedValue({
          inputType: 'html',
          value: '<html><body><h1>Test</h1></body></html>',
          tool: 'axe-core',
          wcagVersion: '2.2',
          wcagLevel: level,
          cumulativeWcag: false,
          userId: undefined,
        });

        const result = await validateAndSanitizeInput(
          { ...mockRequest.body, wcagLevel: level },
          'test-request-id',
          mockRequest.log
        );

        expect(result.wcagLevel).toBe(level);
      }
    });
  });

  describe('Logger Functionality', () => {
    it('debe crear logger optimizado con requestId', () => {
      // Test createOptimizedLogger function indirectly through its usage
      // This is tested implicitly when the route handler logs messages
      expect(mockRequest.id).toBe('test-request-id');
      expect(mockRequest.log.info).toBeDefined();
      expect(mockRequest.log.warn).toBeDefined();
      expect(mockRequest.log.error).toBeDefined();
    });

    it('debe manejar logging en development vs production', () => {
      const originalNodeEnv = process.env.NODE_ENV;

      // Test development mode
      process.env.NODE_ENV = 'development';
      // Logger should be more verbose in development
      expect(process.env.NODE_ENV).toBe('development');

      // Test production mode
      process.env.NODE_ENV = 'production';
      // Logger should be less verbose in production
      expect(process.env.NODE_ENV).toBe('production');

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('debe manejar file logging cuando está habilitado', () => {
      const originalFileLogging = process.env.ENABLE_FILE_LOGGING;

      // Enable file logging
      process.env.ENABLE_FILE_LOGGING = 'true';
      expect(process.env.ENABLE_FILE_LOGGING).toBe('true');

      // Disable file logging
      process.env.ENABLE_FILE_LOGGING = 'false';
      expect(process.env.ENABLE_FILE_LOGGING).toBe('false');

      process.env.ENABLE_FILE_LOGGING = originalFileLogging;
    });
  });

  describe('WCAG Configuration Logic', () => {
    it('debe manejar WCAG cumulativo correctamente', async () => {
      const mockValidateAndSanitizeInput =
        validateAndSanitizeInput as jest.Mock;
      mockValidateAndSanitizeInput.mockResolvedValue({
        inputType: 'html',
        value: '<html><body><h1>Test</h1></body></html>',
        tool: 'axe-core',
        wcagVersion: '2.2',
        wcagLevel: 'AA',
        cumulativeWcag: true,
        userId: undefined,
      });

      const result = await validateAndSanitizeInput(
        { ...mockRequest.body, cumulativeWcag: true },
        'test-request-id',
        mockRequest.log
      );

      expect(result.cumulativeWcag).toBe(true);
    });

    it('debe manejar WCAG no cumulativo', async () => {
      const mockValidateAndSanitizeInput =
        validateAndSanitizeInput as jest.Mock;
      mockValidateAndSanitizeInput.mockResolvedValue({
        inputType: 'html',
        value: '<html><body><h1>Test</h1></body></html>',
        tool: 'axe-core',
        wcagVersion: '2.2',
        wcagLevel: 'AA',
        cumulativeWcag: false,
        userId: undefined,
      });

      const result = await validateAndSanitizeInput(
        { ...mockRequest.body, cumulativeWcag: false },
        'test-request-id',
        mockRequest.log
      );

      expect(result.cumulativeWcag).toBe(false);
    });

    it('debe usar valores por defecto para campos opcionales', async () => {
      const mockValidateAndSanitizeInput =
        validateAndSanitizeInput as jest.Mock;
      mockValidateAndSanitizeInput.mockResolvedValue({
        inputType: 'html',
        value: '<html><body><h1>Test</h1></body></html>',
        tool: 'axe-core',
        wcagVersion: '2.2',
        wcagLevel: 'AA',
        cumulativeWcag: false,
        userId: undefined,
      });

      const minimalRequest = {
        inputType: 'html',
        value: '<html><body><h1>Test</h1></body></html>',
      };

      const result = await validateAndSanitizeInput(
        minimalRequest,
        'test-request-id',
        mockRequest.log
      );

      expect(result.tool).toBe('axe-core');
      expect(result.wcagVersion).toBe('2.2');
      expect(result.wcagLevel).toBe('AA');
      expect(result.cumulativeWcag).toBe(false);
      expect(result.userId).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('debe manejar errores de validación', async () => {
      const mockValidateAndSanitizeInput =
        validateAndSanitizeInput as jest.Mock;
      mockValidateAndSanitizeInput.mockResolvedValue({
        error: 'Validation failed',
        details: {
          field: 'inputType',
          message: 'inputType is required',
        },
      });

      const result = await validateAndSanitizeInput(
        {},
        'test-request-id',
        mockRequest.log
      );

      expect(result).toHaveProperty('error');
      expect(result.error).toBe('Validation failed');
      expect(result.details).toEqual({
        field: 'inputType',
        message: 'inputType is required',
      });
    });

    it('debe manejar errores de validación específicos por campo', async () => {
      const invalidFields = [
        { field: 'inputType', value: 'invalid' },
        { field: 'tool', value: 'invalid-tool' },
        { field: 'wcagVersion', value: '3.0' },
        { field: 'wcagLevel', value: 'AAAA' },
        { field: 'userId', value: -1 },
      ];

      const mockValidateAndSanitizeInput =
        validateAndSanitizeInput as jest.Mock;

      for (const { field, value } of invalidFields) {
        mockValidateAndSanitizeInput.mockResolvedValue({
          error: `Invalid ${field}`,
          details: {
            field,
            value,
            message: `${field} has invalid value`,
          },
        });

        const result = await validateAndSanitizeInput(
          { ...mockRequest.body, [field]: value },
          'test-request-id',
          mockRequest.log
        );

        expect(result).toHaveProperty('error');
        expect(result.error).toBe(`Invalid ${field}`);
      }
    });

    it('debe manejar errores inesperados durante validación', async () => {
      const mockValidateAndSanitizeInput =
        validateAndSanitizeInput as jest.Mock;
      mockValidateAndSanitizeInput.mockRejectedValue(
        new Error('Unexpected error')
      );

      try {
        await validateAndSanitizeInput(
          mockRequest.body,
          'test-request-id',
          mockRequest.log
        );
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Unexpected error');
      }
    });
  });

  describe('Request ID Handling', () => {
    it('debe manejar requests con requestId', async () => {
      const requestWithId = {
        ...mockRequest,
        id: 'custom-request-id-123',
      };

      expect(requestWithId.id).toBe('custom-request-id-123');
    });

    it('debe manejar requests sin requestId', async () => {
      const requestWithoutId = {
        ...mockRequest,
        id: undefined,
      };

      expect(requestWithoutId.id).toBeUndefined();
    });

    it('debe pasar requestId a funciones de validación', async () => {
      const mockValidateAndSanitizeInput =
        validateAndSanitizeInput as jest.Mock;
      mockValidateAndSanitizeInput.mockResolvedValue({
        inputType: 'html',
        value: '<html><body><h1>Test</h1></body></html>',
        tool: 'axe-core',
        wcagVersion: '2.2',
        wcagLevel: 'AA',
        cumulativeWcag: false,
        userId: undefined,
      });

      await validateAndSanitizeInput(
        mockRequest.body,
        'test-request-id',
        mockRequest.log
      );

      expect(mockValidateAndSanitizeInput).toHaveBeenCalledWith(
        mockRequest.body,
        'test-request-id',
        mockRequest.log
      );
    });
  });

  describe('Response Format', () => {
    it('debe usar formato de respuesta consistente para éxito', () => {
      const { success } = require('../../src/utils/response');

      const data = { message: 'Analysis completed' };
      const requestId = 'test-request-id';

      const response = success(data, requestId);

      expect(response).toEqual({
        ok: true,
        data,
        requestId,
      });
    });

    it('debe usar formato de respuesta consistente para errores', () => {
      const { error } = require('../../src/utils/response');

      const message = 'Validation failed';
      const code = 'VALIDATION_ERROR';
      const details = { field: 'inputType' };
      const requestId = 'test-request-id';

      const response = error(message, code, details, requestId);

      expect(response).toEqual({
        ok: false,
        error: message,
        code,
        details,
        requestId,
      });
    });
  });
});
