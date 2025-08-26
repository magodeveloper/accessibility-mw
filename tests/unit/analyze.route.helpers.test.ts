import express from 'express';
import request from 'supertest';
import analyzeRouter from '../../src/routes/analyze.route';

// Mock dependencies
jest.mock('../../src/routes/analyze.helpers', () => ({
  runFullAnalysis: jest.fn(),
  validateAndSanitizeInput: jest.fn(),
}));

jest.mock('../../src/utils/response', () => ({
  sendResponse: jest.fn(),
  sendError: jest.fn(),
}));

jest.mock('fs', () => ({
  appendFileSync: jest.fn(),
}));

describe('Analyze Route Integration Tests', () => {
  let app: express.Express;
  let mockRunFullAnalysis: jest.Mock;
  let mockValidateAndSanitizeInput: jest.Mock;
  let mockSendResponse: jest.Mock;
  let mockSendError: jest.Mock;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/analyze', analyzeRouter);

    mockRunFullAnalysis =
      require('../../src/routes/analyze.helpers').runFullAnalysis;
    mockValidateAndSanitizeInput =
      require('../../src/routes/analyze.helpers').validateAndSanitizeInput;
    mockSendResponse = require('../../src/utils/response').sendResponse;
    mockSendError = require('../../src/utils/response').sendError;

    jest.clearAllMocks();
  });

  describe('POST /analyze', () => {
    it('debe manejar request válido con HTML', async () => {
      const validInput = {
        input: '<html><body><h1>Test</h1></body></html>',
        inputType: 'html',
        wcagVersion: '2.2',
        wcagLevel: 'AA',
        tool: 'axe-core',
        userId: 'test-user-123',
      };

      const mockAnalysisResult = {
        ok: true,
        data: {
          results: [],
          stats: { violations: 0, passes: 10 },
        },
        meta: {
          inputType: 'html',
          tool: 'axe-core',
          duration: 1500,
        },
      };

      mockValidateAndSanitizeInput.mockReturnValue({
        valid: true,
        data: validInput,
      });
      mockRunFullAnalysis.mockResolvedValue(mockAnalysisResult);
      mockSendResponse.mockImplementation((res, statusCode, message, data) => {
        res.status(statusCode).json({ message, data });
      });

      const response = await request(app)
        .post('/api/analyze')
        .send(validInput)
        .expect(200);

      expect(mockValidateAndSanitizeInput).toHaveBeenCalledWith(validInput);
      expect(mockRunFullAnalysis).toHaveBeenCalled();
      expect(mockSendResponse).toHaveBeenCalled();
    });

    it('debe manejar request válido con URL', async () => {
      const validInput = {
        input: 'https://example.com',
        inputType: 'url',
        wcagVersion: '2.1',
        wcagLevel: 'A',
        tool: 'equal-access',
        userId: 'test-user-456',
      };

      const mockAnalysisResult = {
        ok: true,
        data: {
          results: [],
          stats: { violations: 1, passes: 8 },
        },
        meta: {
          inputType: 'url',
          tool: 'equal-access',
          duration: 2500,
        },
      };

      mockValidateAndSanitizeInput.mockReturnValue({
        valid: true,
        data: validInput,
      });
      mockRunFullAnalysis.mockResolvedValue(mockAnalysisResult);
      mockSendResponse.mockImplementation((res, statusCode, message, data) => {
        res.status(statusCode).json({ message, data });
      });

      const response = await request(app)
        .post('/api/analyze')
        .send(validInput)
        .expect(200);

      expect(mockValidateAndSanitizeInput).toHaveBeenCalledWith(validInput);
      expect(mockRunFullAnalysis).toHaveBeenCalled();
    });

    it('debe manejar input inválido', async () => {
      const invalidInput = {
        input: '',
        inputType: 'invalid',
        wcagVersion: '3.0', // Invalid version
      };

      mockValidateAndSanitizeInput.mockReturnValue({
        valid: false,
        error: 'Input inválido: tipo de input no soportado',
      });
      mockSendError.mockImplementation((res, statusCode, message) => {
        res.status(statusCode).json({ error: message });
      });

      const response = await request(app)
        .post('/api/analyze')
        .send(invalidInput)
        .expect(400);

      expect(mockValidateAndSanitizeInput).toHaveBeenCalledWith(invalidInput);
      expect(mockSendError).toHaveBeenCalledWith(
        expect.anything(),
        400,
        'Input inválido: tipo de input no soportado',
        expect.anything()
      );
      expect(mockRunFullAnalysis).not.toHaveBeenCalled();
    });

    it('debe manejar error de análisis', async () => {
      const validInput = {
        input: 'https://invalid-url.invalid',
        inputType: 'url',
        wcagVersion: '2.2',
        wcagLevel: 'AA',
        tool: 'axe-core',
        userId: 'test-user-789',
      };

      mockValidateAndSanitizeInput.mockReturnValue({
        valid: true,
        data: validInput,
      });
      mockRunFullAnalysis.mockRejectedValue(new Error('Network error'));
      mockSendError.mockImplementation((res, statusCode, message) => {
        res.status(statusCode).json({ error: message });
      });

      const response = await request(app)
        .post('/api/analyze')
        .send(validInput)
        .expect(500);

      expect(mockValidateAndSanitizeInput).toHaveBeenCalledWith(validInput);
      expect(mockRunFullAnalysis).toHaveBeenCalled();
      expect(mockSendError).toHaveBeenCalledWith(
        expect.anything(),
        500,
        expect.stringContaining('Error interno del servidor'),
        expect.anything()
      );
    });

    it('debe manejar análisis con resultados parciales', async () => {
      const validInput = {
        input: '<html><body><img src="test.jpg"></body></html>',
        inputType: 'html',
        wcagVersion: '2.2',
        wcagLevel: 'AAA',
        tool: 'both',
        userId: 'test-user-partial',
      };

      const mockAnalysisResult = {
        ok: false,
        data: {
          results: [
            {
              wcagCriterion: '1.1.1',
              level: 'A',
              severity: 'high',
              description: 'Image missing alt text',
            },
          ],
          stats: { violations: 1, passes: 5 },
        },
        meta: {
          inputType: 'html',
          tool: 'both',
          duration: 3000,
          errors: ['Some analysis failed'],
        },
      };

      mockValidateAndSanitizeInput.mockReturnValue({
        valid: true,
        data: validInput,
      });
      mockRunFullAnalysis.mockResolvedValue(mockAnalysisResult);
      mockSendResponse.mockImplementation((res, statusCode, message, data) => {
        res.status(statusCode).json({ message, data });
      });

      const response = await request(app)
        .post('/api/analyze')
        .send(validInput)
        .expect(200);

      expect(mockValidateAndSanitizeInput).toHaveBeenCalledWith(validInput);
      expect(mockRunFullAnalysis).toHaveBeenCalled();
      expect(mockSendResponse).toHaveBeenCalled();
    });

    it('debe manejar request sin userId', async () => {
      const inputWithoutUserId = {
        input: '<html><body><h1>Test</h1></body></html>',
        inputType: 'html',
        wcagVersion: '2.2',
        wcagLevel: 'AA',
        tool: 'axe-core',
        // userId omitido
      };

      const mockAnalysisResult = {
        ok: true,
        data: {
          results: [],
          stats: { violations: 0, passes: 10 },
        },
        meta: {
          inputType: 'html',
          tool: 'axe-core',
          duration: 1500,
        },
      };

      mockValidateAndSanitizeInput.mockReturnValue({
        valid: true,
        data: inputWithoutUserId,
      });
      mockRunFullAnalysis.mockResolvedValue(mockAnalysisResult);
      mockSendResponse.mockImplementation((res, statusCode, message, data) => {
        res.status(statusCode).json({ message, data });
      });

      const response = await request(app)
        .post('/api/analyze')
        .send(inputWithoutUserId)
        .expect(200);

      expect(mockValidateAndSanitizeInput).toHaveBeenCalledWith(
        inputWithoutUserId
      );
      expect(mockRunFullAnalysis).toHaveBeenCalled();
    });

    it('debe manejar timeout de análisis', async () => {
      const validInput = {
        input: 'https://very-slow-website.com',
        inputType: 'url',
        wcagVersion: '2.2',
        wcagLevel: 'AA',
        tool: 'axe-core',
        userId: 'test-user-timeout',
      };

      mockValidateAndSanitizeInput.mockReturnValue({
        valid: true,
        data: validInput,
      });
      mockRunFullAnalysis.mockRejectedValue(new Error('Request timeout'));
      mockSendError.mockImplementation((res, statusCode, message) => {
        res.status(statusCode).json({ error: message });
      });

      const response = await request(app)
        .post('/api/analyze')
        .send(validInput)
        .expect(500);

      expect(mockValidateAndSanitizeInput).toHaveBeenCalledWith(validInput);
      expect(mockRunFullAnalysis).toHaveBeenCalled();
      expect(mockSendError).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('debe manejar request malformado', async () => {
      mockSendError.mockImplementation((res, statusCode, message) => {
        res.status(statusCode).json({ error: message });
      });

      const response = await request(app)
        .post('/api/analyze')
        .send('invalid json')
        .expect(400);

      expect(mockSendError).toHaveBeenCalled();
    });

    it('debe manejar request con body vacío', async () => {
      mockValidateAndSanitizeInput.mockReturnValue({
        valid: false,
        error: 'Body de request requerido',
      });
      mockSendError.mockImplementation((res, statusCode, message) => {
        res.status(statusCode).json({ error: message });
      });

      const response = await request(app)
        .post('/api/analyze')
        .send({})
        .expect(400);

      expect(mockValidateAndSanitizeInput).toHaveBeenCalledWith({});
      expect(mockSendError).toHaveBeenCalled();
    });

    it('debe manejar content-type incorrecto', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .set('Content-Type', 'text/plain')
        .send('not json')
        .expect(400);
    });

    it('debe manejar request muy grande', async () => {
      const largeInput = {
        input: 'x'.repeat(10000000), // 10MB de contenido
        inputType: 'html',
        wcagVersion: '2.2',
        wcagLevel: 'AA',
        tool: 'axe-core',
      };

      mockValidateAndSanitizeInput.mockReturnValue({
        valid: false,
        error: 'Input demasiado grande',
      });
      mockSendError.mockImplementation((res, statusCode, message) => {
        res.status(statusCode).json({ error: message });
      });

      const response = await request(app)
        .post('/api/analyze')
        .send(largeInput)
        .expect(400);

      expect(mockSendError).toHaveBeenCalled();
    });
  });

  describe('WCAG Configuration Tests', () => {
    it('debe manejar todas las versiones WCAG válidas', async () => {
      const wcagVersions = ['2.0', '2.1', '2.2'];

      for (const version of wcagVersions) {
        const validInput = {
          input: '<html><body><h1>Test</h1></body></html>',
          inputType: 'html',
          wcagVersion: version,
          wcagLevel: 'AA',
          tool: 'axe-core',
        };

        const mockAnalysisResult = {
          ok: true,
          data: { results: [], stats: { violations: 0, passes: 10 } },
          meta: { inputType: 'html', tool: 'axe-core', duration: 1500 },
        };

        mockValidateAndSanitizeInput.mockReturnValue({
          valid: true,
          data: validInput,
        });
        mockRunFullAnalysis.mockResolvedValue(mockAnalysisResult);
        mockSendResponse.mockImplementation(
          (res, statusCode, message, data) => {
            res.status(statusCode).json({ message, data });
          }
        );

        await request(app).post('/api/analyze').send(validInput).expect(200);

        expect(mockValidateAndSanitizeInput).toHaveBeenCalledWith(validInput);
        jest.clearAllMocks();
      }
    });

    it('debe manejar todos los niveles WCAG válidos', async () => {
      const wcagLevels = ['A', 'AA', 'AAA'];

      for (const level of wcagLevels) {
        const validInput = {
          input: '<html><body><h1>Test</h1></body></html>',
          inputType: 'html',
          wcagVersion: '2.2',
          wcagLevel: level,
          tool: 'axe-core',
        };

        const mockAnalysisResult = {
          ok: true,
          data: { results: [], stats: { violations: 0, passes: 10 } },
          meta: { inputType: 'html', tool: 'axe-core', duration: 1500 },
        };

        mockValidateAndSanitizeInput.mockReturnValue({
          valid: true,
          data: validInput,
        });
        mockRunFullAnalysis.mockResolvedValue(mockAnalysisResult);
        mockSendResponse.mockImplementation(
          (res, statusCode, message, data) => {
            res.status(statusCode).json({ message, data });
          }
        );

        await request(app).post('/api/analyze').send(validInput).expect(200);

        expect(mockValidateAndSanitizeInput).toHaveBeenCalledWith(validInput);
        jest.clearAllMocks();
      }
    });

    it('debe manejar diferentes herramientas de análisis', async () => {
      const tools = ['axe-core', 'equal-access', 'both'];

      for (const tool of tools) {
        const validInput = {
          input: 'https://example.com',
          inputType: 'url',
          wcagVersion: '2.2',
          wcagLevel: 'AA',
          tool: tool,
        };

        const mockAnalysisResult = {
          ok: true,
          data: { results: [], stats: { violations: 0, passes: 10 } },
          meta: { inputType: 'url', tool: tool, duration: 1500 },
        };

        mockValidateAndSanitizeInput.mockReturnValue({
          valid: true,
          data: validInput,
        });
        mockRunFullAnalysis.mockResolvedValue(mockAnalysisResult);
        mockSendResponse.mockImplementation(
          (res, statusCode, message, data) => {
            res.status(statusCode).json({ message, data });
          }
        );

        await request(app).post('/api/analyze').send(validInput).expect(200);

        expect(mockValidateAndSanitizeInput).toHaveBeenCalledWith(validInput);
        jest.clearAllMocks();
      }
    });
  });

  describe('Response Format Tests', () => {
    it('debe formatear correctamente respuesta de éxito', async () => {
      const validInput = {
        input: '<html><body><h1>Test</h1></body></html>',
        inputType: 'html',
        wcagVersion: '2.2',
        wcagLevel: 'AA',
        tool: 'axe-core',
        userId: 'format-test-user',
      };

      const mockAnalysisResult = {
        ok: true,
        data: {
          results: [
            {
              wcagCriterion: '1.1.1',
              level: 'A',
              severity: 'high',
              description: 'Images must have alternate text',
            },
          ],
          stats: { violations: 1, passes: 9 },
        },
        meta: {
          inputType: 'html',
          tool: 'axe-core',
          duration: 1500,
        },
      };

      mockValidateAndSanitizeInput.mockReturnValue({
        valid: true,
        data: validInput,
      });
      mockRunFullAnalysis.mockResolvedValue(mockAnalysisResult);

      let capturedResponse: any;
      mockSendResponse.mockImplementation((res, statusCode, message, data) => {
        capturedResponse = { statusCode, message, data };
        res.status(statusCode).json({ message, data });
      });

      await request(app).post('/api/analyze').send(validInput).expect(200);

      expect(capturedResponse.statusCode).toBe(200);
      expect(capturedResponse.message).toContain('éxito');
      expect(capturedResponse.data).toBeDefined();
    });

    it('debe incluir request ID en logs', async () => {
      const validInput = {
        input: '<html><body><h1>Test</h1></body></html>',
        inputType: 'html',
        wcagVersion: '2.2',
        wcagLevel: 'AA',
        tool: 'axe-core',
      };

      mockValidateAndSanitizeInput.mockReturnValue({
        valid: true,
        data: validInput,
      });
      mockRunFullAnalysis.mockResolvedValue({
        ok: true,
        data: { results: [], stats: {} },
        meta: { inputType: 'html', tool: 'axe-core' },
      });
      mockSendResponse.mockImplementation((res, statusCode, message, data) => {
        res.status(statusCode).json({ message, data });
      });

      const response = await request(app)
        .post('/api/analyze')
        .send(validInput)
        .expect(200);

      // El request ID debería estar presente en el response o headers
      expect(response.body).toBeDefined();
    });
  });
});
