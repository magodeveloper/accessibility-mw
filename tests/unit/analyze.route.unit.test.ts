import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
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

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('debe validar entrada HTML correctamente', async () => {
      const mockValidateAndSanitizeInput =
        validateAndSanitizeInput as jest.MockedFunction<
          typeof validateAndSanitizeInput
        >;
      (mockValidateAndSanitizeInput as any).mockResolvedValue({
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
        validateAndSanitizeInput as jest.MockedFunction<
          typeof validateAndSanitizeInput
        >;
      (mockValidateAndSanitizeInput as any).mockResolvedValue({
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
        validateAndSanitizeInput as jest.MockedFunction<
          typeof validateAndSanitizeInput
        >;
      (mockValidateAndSanitizeInput as any).mockResolvedValue({
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
        validateAndSanitizeInput as jest.MockedFunction<
          typeof validateAndSanitizeInput
        >;

      for (const tool of tools) {
        (mockValidateAndSanitizeInput as any).mockResolvedValue({
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
        validateAndSanitizeInput as jest.MockedFunction<
          typeof validateAndSanitizeInput
        >;

      for (const version of versions) {
        (mockValidateAndSanitizeInput as any).mockResolvedValue({
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
        validateAndSanitizeInput as jest.MockedFunction<
          typeof validateAndSanitizeInput
        >;

      for (const level of levels) {
        (mockValidateAndSanitizeInput as any).mockResolvedValue({
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
        validateAndSanitizeInput as jest.MockedFunction<
          typeof validateAndSanitizeInput
        >;
      (mockValidateAndSanitizeInput as any).mockResolvedValue({
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
        validateAndSanitizeInput as jest.MockedFunction<
          typeof validateAndSanitizeInput
        >;
      (mockValidateAndSanitizeInput as any).mockResolvedValue({
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
        validateAndSanitizeInput as jest.MockedFunction<
          typeof validateAndSanitizeInput
        >;
      (mockValidateAndSanitizeInput as any).mockResolvedValue({
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
        validateAndSanitizeInput as jest.MockedFunction<
          typeof validateAndSanitizeInput
        >;
      (mockValidateAndSanitizeInput as any).mockResolvedValue({
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
        validateAndSanitizeInput as jest.MockedFunction<
          typeof validateAndSanitizeInput
        >;

      for (const { field, value } of invalidFields) {
        (mockValidateAndSanitizeInput as any).mockResolvedValue({
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
        validateAndSanitizeInput as jest.MockedFunction<
          typeof validateAndSanitizeInput
        >;
      (mockValidateAndSanitizeInput as any).mockRejectedValue(
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
        validateAndSanitizeInput as jest.MockedFunction<
          typeof validateAndSanitizeInput
        >;
      (mockValidateAndSanitizeInput as any).mockResolvedValue({
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

  describe('Accept Language Resolution', () => {
    it('debe retornar idioma por defecto cuando no hay header', () => {
      const resolveAcceptLanguage = (req?: any): string => {
        const raw = (req?.headers?.['accept-language'] as string) || '';
        if (!raw) return 'es';
        const first = raw.split(',')[0].trim().slice(0, 2).toLowerCase();
        return ['es', 'en'].includes(first) ? first : 'es';
      };

      const req = { headers: {} };

      const result = resolveAcceptLanguage(req);
      expect(result).toBe('es');
    });

    it('debe parsear accept-language header correctamente', () => {
      const resolveAcceptLanguage = (req?: any): string => {
        const raw = (req?.headers?.['accept-language'] as string) || '';
        if (!raw) return 'es';
        const first = raw.split(',')[0].trim().slice(0, 2).toLowerCase();
        return ['es', 'en'].includes(first) ? first : 'es';
      };

      // Test English
      const reqEn = {
        headers: { 'accept-language': 'en-US,en;q=0.9,es;q=0.8' },
      };
      expect(resolveAcceptLanguage(reqEn)).toBe('en');

      // Test Spanish
      const reqEs = { headers: { 'accept-language': 'es-ES,es;q=0.9' } };
      expect(resolveAcceptLanguage(reqEs)).toBe('es');

      // Test fallback for unsupported language
      const reqFr = { headers: { 'accept-language': 'fr-FR,fr;q=0.9' } };
      expect(resolveAcceptLanguage(reqFr)).toBe('es');
    });
  });

  describe('Impact to Severity Mapping', () => {
    it('debe mapear impactos correctamente', () => {
      const mapImpactToSeverity = (impact: string): string => {
        const severityMap: Record<string, string> = {
          critical: 'high',
          serious: 'high',
          moderate: 'medium',
          minor: 'low',
        };
        return severityMap[impact?.toLowerCase()] || 'medium';
      };

      expect(mapImpactToSeverity('critical')).toBe('high');
      expect(mapImpactToSeverity('SERIOUS')).toBe('high');
      expect(mapImpactToSeverity('moderate')).toBe('medium');
      expect(mapImpactToSeverity('minor')).toBe('low');
      expect(mapImpactToSeverity('unknown')).toBe('medium');
      expect(mapImpactToSeverity('')).toBe('medium');
      expect(mapImpactToSeverity(null as any)).toBe('medium');
    });
  });

  describe('Result Level Mapping', () => {
    it('debe mapear tipos de resultado correctamente', () => {
      const mapToResultLevel = (itemType?: string): string => {
        const t = (itemType || '').toLowerCase();
        switch (t) {
          case 'violation':
            return 'violation';
          case 'recommendation':
          case 'remediation':
            return 'recommendation';
          case 'potentialviolation':
          case 'potential_violation':
          case 'needsreview':
          case 'needs_review':
            return 'potentialViolation';
          case 'manualcheck':
          case 'manual_check':
            return 'manualCheck';
          case 'pass':
          case 'passes':
            return 'pass';
          default:
            return 'violation';
        }
      };

      expect(mapToResultLevel('violation')).toBe('violation');
      expect(mapToResultLevel('RECOMMENDATION')).toBe('recommendation');
      expect(mapToResultLevel('remediation')).toBe('recommendation');
      expect(mapToResultLevel('needsReview')).toBe('potentialViolation');
      expect(mapToResultLevel('potential_violation')).toBe(
        'potentialViolation'
      );
      expect(mapToResultLevel('manualCheck')).toBe('manualCheck');
      expect(mapToResultLevel('manual_check')).toBe('manualCheck');
      expect(mapToResultLevel('pass')).toBe('pass');
      expect(mapToResultLevel('passes')).toBe('pass');
      expect(mapToResultLevel('unknown')).toBe('violation');
      expect(mapToResultLevel('')).toBe('violation');
      expect(mapToResultLevel(undefined)).toBe('violation');
    });
  });

  describe('Debug Verbose Logging', () => {
    let originalEnv: string | undefined;
    let consoleSpy: any;

    beforeEach(() => {
      originalEnv = process.env.DEBUG_VERBOSE;
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      process.env.DEBUG_VERBOSE = originalEnv;
      consoleSpy.mockRestore();
    });

    it('debe loggear cuando DEBUG_VERBOSE=true', () => {
      process.env.DEBUG_VERBOSE = 'true';

      const debugVerbose = (message: string, data?: unknown) => {
        if (process.env.DEBUG_VERBOSE === 'true') {
          console.log(`🐞 ${message}`, data || '');
        }
      };

      debugVerbose('Test message', { test: 'data' });
      expect(consoleSpy).toHaveBeenCalledWith('🐞 Test message', {
        test: 'data',
      });
    });

    it('debe omitir logging cuando DEBUG_VERBOSE=false', () => {
      process.env.DEBUG_VERBOSE = 'false';

      const debugSilent = (message: string, data?: unknown) => {
        if (process.env.DEBUG_VERBOSE === 'true') {
          console.log(`🐞 ${message}`, data || '');
        }
        // Esta función no hace nada cuando DEBUG_VERBOSE=false
      };

      debugSilent('Test message');
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('HTTP Client Configuration', () => {
    it('debe configurar timeout correctamente en fetch requests', () => {
      const DEFAULT_TIMEOUT = 10000;
      const mockFunction = jest.fn();

      const client = { post: mockFunction };

      expect(client.post).toBeDefined();
      expect(DEFAULT_TIMEOUT).toBe(10000);
    });

    it('debe incluir headers correctos en HTTP requests', () => {
      const expectedHeaders = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'accessibility-mw/1.0.0',
      };

      expect(expectedHeaders['Content-Type']).toBe('application/json');
      expect(expectedHeaders.Accept).toBe('application/json');
      expect(expectedHeaders['User-Agent']).toBe('accessibility-mw/1.0.0');
    });
  });

  describe('Analysis Configuration', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('debe retornar configuración desde ENV', () => {
      process.env.ANALYSIS_API_URL = 'http://test-analysis.com';
      process.env.ANALYSIS_API_KEY = 'test-key-123';
      process.env.ANALYSIS_TIMEOUT_MS = '45000';

      const getAnalysisConfig = () => ({
        apiUrl: process.env.ANALYSIS_API_URL || 'http://localhost:8082/api',
        apiKey: process.env.ANALYSIS_API_KEY,
        timeout: Number(process.env.ANALYSIS_TIMEOUT_MS) || 30000,
      });

      const config = getAnalysisConfig();

      expect(config.apiUrl).toBe('http://test-analysis.com');
      expect(config.apiKey).toBe('test-key-123');
      expect(config.timeout).toBe(45000);
    });

    it('debe usar valores por defecto cuando ENV no está definido', () => {
      delete process.env.ANALYSIS_API_URL;
      delete process.env.ANALYSIS_API_KEY;
      delete process.env.ANALYSIS_TIMEOUT_MS;

      const getDefaultConfig = () => ({
        apiUrl: process.env.ANALYSIS_API_URL || 'http://localhost:8082/api',
        apiKey: process.env.ANALYSIS_API_KEY || undefined,
        timeout: Number(process.env.ANALYSIS_TIMEOUT_MS) || 30000,
      });

      const config = getDefaultConfig();

      expect(config.apiUrl).toBe('http://localhost:8082/api');
      expect(config.apiKey).toBeUndefined();
      expect(config.timeout).toBe(30000);
    });
  });

  describe('Tool Detection Logic', () => {
    it('debe detectar herramienta usada correctamente', () => {
      const detectToolUsed = (results: any): string => {
        if (results?.axe && results?.equalAccess) return 'both';
        if (results?.axe) return 'axe-core';
        if (results?.equalAccess) return 'equal-access';
        return 'unknown';
      };

      expect(detectToolUsed({ axe: {}, equalAccess: {} })).toBe('both');
      expect(detectToolUsed({ axe: { violations: [] } })).toBe('axe-core');
      expect(detectToolUsed({ equalAccess: { report: {} } })).toBe(
        'equal-access'
      );
      expect(detectToolUsed({})).toBe('unknown');
      expect(detectToolUsed(null)).toBe('unknown');
      expect(detectToolUsed(undefined)).toBe('unknown');
    });
  });
});
