/**
 * Comprehensive Tests for gateway.middleware.ts
 *
 * Coverage Focus:
 * - Gateway secret validation (happy path + errors)
 * - Optional validation flow
 * - requireGateway enforcement
 * - Helper functions (isFromGateway, logGatewayInfo)
 * - Edge cases and error handling
 *
 * Target: 100% branch coverage
 */

import { NextFunction, Request, Response } from 'express';
import * as gatewayConfig from '../../src/config/gateway.config';
import {
  GatewayValidatedRequest,
  isFromGateway,
  logGatewayInfo,
  optionalValidateGatewaySecret,
  requireGateway,
  validateGatewaySecret,
} from '../../src/middlewares/gateway.middleware';
import { advancedLogger } from '../../src/services/logging.service';

// Mock dependencies
jest.mock('../../src/config/gateway.config');
jest.mock('../../src/services/logging.service');

describe('gateway.middleware', () => {
  let mockRequest: Partial<GatewayValidatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let getMock: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup get mock for headers
    getMock = jest.fn();

    // Setup request mock
    mockRequest = {
      get: getMock,
      path: '/api/test',
      method: 'GET',
      id: 'test-request-id',
      ip: '127.0.0.1',
    };

    // Setup response mock
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    // Setup next mock
    mockNext = jest.fn();

    // Default gateway config mock
    (gatewayConfig.isGatewayValidationEnabled as jest.Mock).mockReturnValue(
      true
    );
    (gatewayConfig.validateSecret as jest.Mock).mockReturnValue(true);
    (gatewayConfig.GATEWAY_SECRET_HEADER as string) = 'X-Gateway-Secret';
  });

  describe('validateGatewaySecret', () => {
    describe('when gateway validation is disabled', () => {
      it('should skip validation and call next()', () => {
        (gatewayConfig.isGatewayValidationEnabled as jest.Mock).mockReturnValue(
          false
        );

        validateGatewaySecret(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(advancedLogger.debug).toHaveBeenCalledWith(
          'Gateway validation disabled - skipping validation',
          expect.objectContaining({
            requestId: 'test-request-id',
            path: '/api/test',
            method: 'GET',
          })
        );
        expect(mockNext).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });
    });

    describe('when gateway secret header is missing', () => {
      it('should return 403 with MISSING_GATEWAY_SECRET', () => {
        getMock.mockImplementation((header: string) => {
          if (header === 'X-Gateway-Secret') return undefined;
          if (header === 'user-agent') return 'TestAgent/1.0';
          return undefined;
        });

        validateGatewaySecret(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(advancedLogger.warn).toHaveBeenCalledWith(
          'Gateway secret validation failed - Missing header',
          expect.objectContaining({
            requestId: 'test-request-id',
            path: '/api/test',
            method: 'GET',
            ip: '127.0.0.1',
            userAgent: 'TestAgent/1.0',
            code: 'MISSING_GATEWAY_SECRET',
          })
        );

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'Forbidden',
          message:
            'Missing required header: X-Gateway-Secret. Direct access to this service is not allowed.',
          code: 'MISSING_GATEWAY_SECRET',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('when gateway secret is invalid', () => {
      it('should return 403 with INVALID_GATEWAY_SECRET', () => {
        const invalidSecret = 'wrong-secret';
        getMock.mockImplementation((header: string) => {
          if (header === 'X-Gateway-Secret') return invalidSecret;
          if (header === 'user-agent') return 'TestAgent/1.0';
          return undefined;
        });

        (gatewayConfig.validateSecret as jest.Mock).mockReturnValue(false);

        validateGatewaySecret(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(gatewayConfig.validateSecret).toHaveBeenCalledWith(
          invalidSecret
        );

        expect(advancedLogger.warn).toHaveBeenCalledWith(
          'Gateway secret validation failed - Invalid secret',
          expect.objectContaining({
            requestId: 'test-request-id',
            path: '/api/test',
            method: 'GET',
            ip: '127.0.0.1',
            userAgent: 'TestAgent/1.0',
            providedSecretLength: invalidSecret.length,
            code: 'INVALID_GATEWAY_SECRET',
          })
        );

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'Forbidden',
          message: 'Invalid gateway secret. Access denied.',
          code: 'INVALID_GATEWAY_SECRET',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('when gateway secret is valid', () => {
      it('should validate and call next()', () => {
        const validSecret = 'valid-secret-key';
        getMock.mockReturnValue(validSecret);
        (gatewayConfig.validateSecret as jest.Mock).mockReturnValue(true);

        validateGatewaySecret(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(gatewayConfig.validateSecret).toHaveBeenCalledWith(validSecret);

        expect(advancedLogger.debug).toHaveBeenCalledWith(
          'Gateway secret validated successfully',
          expect.objectContaining({
            requestId: 'test-request-id',
            path: '/api/test',
            method: 'GET',
          })
        );

        expect(mockNext).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });
    });

    describe('when request has no id', () => {
      it('should use "unknown" as requestId', () => {
        delete mockRequest.id;
        getMock.mockReturnValue(undefined);

        validateGatewaySecret(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            requestId: 'unknown',
          })
        );
      });
    });

    describe('when request has numeric id', () => {
      it('should convert id to string', () => {
        mockRequest.id = 12345 as any;
        getMock.mockReturnValue(undefined);

        validateGatewaySecret(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            requestId: '12345',
          })
        );
      });
    });
  });

  describe('optionalValidateGatewaySecret', () => {
    describe('when gateway validation is disabled', () => {
      it('should mark as validated and call next()', () => {
        (gatewayConfig.isGatewayValidationEnabled as jest.Mock).mockReturnValue(
          false
        );

        optionalValidateGatewaySecret(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockRequest.gatewayValidated).toBe(true);
        expect(mockNext).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });
    });

    describe('when secret is valid', () => {
      it('should mark gatewayValidated as true', () => {
        const validSecret = 'valid-secret';
        getMock.mockReturnValue(validSecret);
        (gatewayConfig.validateSecret as jest.Mock).mockReturnValue(true);

        optionalValidateGatewaySecret(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(gatewayConfig.validateSecret).toHaveBeenCalledWith(validSecret);
        expect(mockRequest.gatewayValidated).toBe(true);

        expect(advancedLogger.debug).toHaveBeenCalledWith(
          'Optional gateway validation - Valid secret',
          expect.objectContaining({
            requestId: 'test-request-id',
            path: '/api/test',
          })
        );

        expect(mockNext).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });
    });

    describe('when secret is invalid', () => {
      it('should mark gatewayValidated as false and still call next()', () => {
        const invalidSecret = 'invalid-secret';
        getMock.mockReturnValue(invalidSecret);
        (gatewayConfig.validateSecret as jest.Mock).mockReturnValue(false);

        optionalValidateGatewaySecret(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockRequest.gatewayValidated).toBe(false);

        expect(advancedLogger.debug).toHaveBeenCalledWith(
          'Optional gateway validation - Invalid or missing secret',
          expect.objectContaining({
            requestId: 'test-request-id',
            path: '/api/test',
            reason: 'invalid',
          })
        );

        expect(mockNext).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });
    });

    describe('when secret is missing', () => {
      it('should mark gatewayValidated as false with reason "missing"', () => {
        getMock.mockReturnValue(undefined);

        optionalValidateGatewaySecret(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockRequest.gatewayValidated).toBe(false);

        expect(advancedLogger.debug).toHaveBeenCalledWith(
          'Optional gateway validation - Invalid or missing secret',
          expect.objectContaining({
            requestId: 'test-request-id',
            path: '/api/test',
            reason: 'missing',
          })
        );

        expect(mockNext).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });
    });

    describe('when request has no id', () => {
      it('should use "unknown" as requestId', () => {
        delete mockRequest.id;
        getMock.mockReturnValue(undefined);

        optionalValidateGatewaySecret(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(advancedLogger.debug).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            requestId: 'unknown',
          })
        );
      });
    });
  });

  describe('isFromGateway', () => {
    it('should return true if gatewayValidated is true', () => {
      mockRequest.gatewayValidated = true;

      const result = isFromGateway(mockRequest as Request);

      expect(result).toBe(true);
    });

    it('should return false if gatewayValidated is false', () => {
      mockRequest.gatewayValidated = false;

      const result = isFromGateway(mockRequest as Request);

      expect(result).toBe(false);
    });

    it('should return false if gatewayValidated is undefined', () => {
      delete mockRequest.gatewayValidated;

      const result = isFromGateway(mockRequest as Request);

      expect(result).toBe(false);
    });

    it('should return false if gatewayValidated is null', () => {
      mockRequest.gatewayValidated = null as any;

      const result = isFromGateway(mockRequest as Request);

      expect(result).toBe(false);
    });
  });

  describe('requireGateway', () => {
    describe('when request is from gateway', () => {
      it('should call next()', () => {
        mockRequest.gatewayValidated = true;

        requireGateway(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });
    });

    describe('when request is not from gateway', () => {
      it('should return 403 with GATEWAY_REQUIRED', () => {
        mockRequest.gatewayValidated = false;

        requireGateway(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(advancedLogger.warn).toHaveBeenCalledWith(
          'Gateway required but request not from Gateway',
          expect.objectContaining({
            requestId: 'test-request-id',
            path: '/api/test',
            method: 'GET',
            ip: '127.0.0.1',
            code: 'GATEWAY_REQUIRED',
          })
        );

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'Forbidden',
          message: 'This endpoint can only be accessed through the Gateway.',
          code: 'GATEWAY_REQUIRED',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 403 when gatewayValidated is undefined', () => {
        delete mockRequest.gatewayValidated;

        requireGateway(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('when request has no id', () => {
      it('should use "unknown" as requestId', () => {
        delete mockRequest.id;
        mockRequest.gatewayValidated = false;

        requireGateway(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            requestId: 'unknown',
          })
        );
      });
    });

    describe('when request has numeric id', () => {
      it('should convert id to string', () => {
        mockRequest.id = 99999 as any;
        mockRequest.gatewayValidated = false;

        requireGateway(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            requestId: '99999',
          })
        );
      });
    });
  });

  describe('logGatewayInfo', () => {
    it('should log info when request is from gateway', () => {
      mockRequest.gatewayValidated = true;
      getMock.mockReturnValue('valid-secret');

      logGatewayInfo(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(advancedLogger.info).toHaveBeenCalledWith(
        'Gateway validation info',
        expect.objectContaining({
          requestId: 'test-request-id',
          fromGateway: true,
          path: '/api/test',
          method: 'GET',
          hasGatewayHeader: true,
        })
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should log info when request is not from gateway', () => {
      mockRequest.gatewayValidated = false;
      getMock.mockReturnValue(undefined);

      logGatewayInfo(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(advancedLogger.info).toHaveBeenCalledWith(
        'Gateway validation info',
        expect.objectContaining({
          requestId: 'test-request-id',
          fromGateway: false,
          path: '/api/test',
          method: 'GET',
          hasGatewayHeader: false,
        })
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should detect gateway header even if validation failed', () => {
      mockRequest.gatewayValidated = false;
      getMock.mockReturnValue('invalid-secret');

      logGatewayInfo(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(advancedLogger.info).toHaveBeenCalledWith(
        'Gateway validation info',
        expect.objectContaining({
          fromGateway: false,
          hasGatewayHeader: true,
        })
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle missing id', () => {
      delete mockRequest.id;
      mockRequest.gatewayValidated = true;
      getMock.mockReturnValue('valid-secret');

      logGatewayInfo(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(advancedLogger.info).toHaveBeenCalledWith(
        'Gateway validation info',
        expect.objectContaining({
          requestId: 'unknown',
        })
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle numeric id', () => {
      mockRequest.id = 54321 as any;
      mockRequest.gatewayValidated = true;
      getMock.mockReturnValue('valid-secret');

      logGatewayInfo(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(advancedLogger.info).toHaveBeenCalledWith(
        'Gateway validation info',
        expect.objectContaining({
          requestId: '54321',
        })
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
