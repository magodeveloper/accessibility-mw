import express from 'express';
import request from 'supertest';

// Simple direct testing approach
const app = express();
app.use(express.json());

// Mock the requestId middleware
app.use((req: any, res, next) => {
  (req as any).requestId = 'test-request-id';
  next();
});

// Import the route after setting up mocks
jest.mock('../../src/routes/analyze.helpers');
jest.mock('../../src/services/logging.service');
jest.mock('../../src/utils/environment');

const mockValidateAndSanitizeInput = jest.fn();
const mockPerformAnalysis = jest.fn();

// Set up the mocks before importing
const analyzeMocks = {
  validateAndSanitizeInput: mockValidateAndSanitizeInput,
  performAnalysis: mockPerformAnalysis,
  validateUrlIfNeeded: jest.fn().mockReturnValue({ isValid: true }),
  runAnalysisTools: jest.fn().mockResolvedValue({ ok: true }),
  extractStats: jest.fn().mockReturnValue({}),
  buildUnified: jest.fn().mockReturnValue({ results: [] }),
};

const loggingMocks = {
  advancedLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
};

const envMocks = {
  ENV: {
    MAX_ANALYSIS_TIMEOUT: 30000,
    NODE_ENV: 'test',
  },
};

require('../../src/routes/analyze.helpers').validateAndSanitizeInput =
  analyzeMocks.validateAndSanitizeInput;
require('../../src/routes/analyze.helpers').performAnalysis =
  analyzeMocks.performAnalysis;
require('../../src/routes/analyze.helpers').validateUrlIfNeeded =
  analyzeMocks.validateUrlIfNeeded;
require('../../src/routes/analyze.helpers').runAnalysisTools =
  analyzeMocks.runAnalysisTools;
require('../../src/routes/analyze.helpers').extractStats =
  analyzeMocks.extractStats;
require('../../src/routes/analyze.helpers').buildUnified =
  analyzeMocks.buildUnified;

require('../../src/services/logging.service').advancedLogger =
  loggingMocks.advancedLogger;
require('../../src/utils/environment').ENV = envMocks.ENV;

// Import and mount the router after mocks are set up
const { analyzeRouter } = require('../../src/routes/analyze.route');
app.use('/api/analyze', analyzeRouter);

describe('Analyze Route Basic Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default setup for validation
    mockValidateAndSanitizeInput.mockReturnValue({
      isValid: true,
      data: {
        inputType: 'html',
        value: '<html></html>',
        tool: 'axe-core',
        wcagVersion: '2.2',
        wcagLevel: 'AA',
      },
    });

    mockPerformAnalysis.mockResolvedValue({
      ok: true,
      data: {
        meta: { tool: 'axe-core' },
        results: [],
        requestId: 'test-request-id',
      },
    });
  });

  it('should return 400 for validation errors', async () => {
    // Setup validation to fail
    mockValidateAndSanitizeInput.mockReturnValue({
      isValid: false,
      error: { code: 'VALIDATION_ERROR', message: 'Missing value' },
    });

    const response = await request(app).post('/api/analyze').send({
      inputType: 'html',
      tool: 'axe-core',
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('ok', false);
  });

  it('should handle malformed JSON', async () => {
    const response = await request(app)
      .post('/api/analyze')
      .set('Content-Type', 'application/json')
      .send('{"invalid": json}');

    expect(response.status).toBe(400);
  });
});
