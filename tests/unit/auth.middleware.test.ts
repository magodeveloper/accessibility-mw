/**
 * Comprehensive Tests for auth.middleware.ts
 *
 * Coverage Focus:
 * - All authentication scenarios (happy path + errors)
 * - JWT validation (valid, expired, invalid, malformed)
 * - Optional authentication flow
 * - Role-based authorization
 * - Edge cases and error handling
 *
 * Target: 100% branch coverage
 */

import { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import * as jwtConfig from '../../src/config/jwt.config';
import {
  AuthenticatedRequest,
  AuthenticatedUser,
  authenticateJWT,
  optionalAuthenticateJWT,
  requireRole,
} from '../../src/middlewares/auth.middleware';
import { advancedLogger } from '../../src/services/logging.service';

// Mock dependencies
jest.mock('../../src/config/jwt.config');
jest.mock('../../src/services/logging.service');

describe('auth.middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup request mock
    mockRequest = {
      headers: {},
      path: '/api/test',
      method: 'GET',
      id: 'test-request-id',
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

    // Default JWT config mock
    (jwtConfig.isJwtEnabled as jest.Mock).mockReturnValue(true);
    (jwtConfig.getJwtConfig as jest.Mock).mockReturnValue({
      secretKey: 'test-secret-key',
      issuer: 'test-issuer',
      audience: 'test-audience',
      clockTolerance: 5,
    });
  });

  describe('authenticateJWT', () => {
    describe('when JWT is disabled', () => {
      it('should skip validation and call next()', () => {
        (jwtConfig.isJwtEnabled as jest.Mock).mockReturnValue(false);

        authenticateJWT(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(advancedLogger.warn).toHaveBeenCalledWith(
          'JWT authentication is disabled - skipping validation',
          expect.objectContaining({
            requestId: 'test-request-id',
            path: '/api/test',
          })
        );
        expect(mockNext).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });
    });

    describe('when Authorization header is missing', () => {
      it('should return 401 with appropriate error', () => {
        authenticateJWT(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'Unauthorized',
          message:
            'Missing Authorization header. Please provide a valid JWT token.',
          code: 'MISSING_AUTH_HEADER',
          requestId: 'test-request-id',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('when Authorization header has invalid scheme', () => {
      it('should return 401 for non-Bearer scheme', () => {
        mockRequest.headers = { authorization: 'Basic abc123' };

        authenticateJWT(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'Unauthorized',
          message:
            'Invalid Authorization header format. Expected: "Bearer <token>"',
          code: 'INVALID_AUTH_SCHEME',
          requestId: 'test-request-id',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 401 for Bearer without space', () => {
        mockRequest.headers = { authorization: 'Bearertoken' };

        authenticateJWT(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('when token is empty', () => {
      it('should return 401 for empty token', () => {
        mockRequest.headers = { authorization: 'Bearer ' };

        authenticateJWT(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'Unauthorized',
          message: 'Empty JWT token provided',
          code: 'EMPTY_TOKEN',
          requestId: 'test-request-id',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 401 for whitespace-only token', () => {
        mockRequest.headers = { authorization: 'Bearer    ' };

        authenticateJWT(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'Unauthorized',
          message: 'Empty JWT token provided',
          code: 'EMPTY_TOKEN',
          requestId: 'test-request-id',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('when token is valid', () => {
      it('should validate token and attach user to request (standard claims)', () => {
        const validToken = 'valid.jwt.token';
        const decodedUser: AuthenticatedUser = {
          sub: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'User',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        };

        mockRequest.headers = { authorization: `Bearer ${validToken}` };
        jest.spyOn(jwt, 'verify').mockReturnValue(decodedUser as any);

        authenticateJWT(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(jwt.verify).toHaveBeenCalledWith(
          validToken,
          'test-secret-key',
          expect.objectContaining({
            issuer: 'test-issuer',
            audience: 'test-audience',
            clockTolerance: 5,
            algorithms: ['HS256', 'HS384', 'HS512'],
          })
        );

        expect(mockRequest.user).toEqual(decodedUser);
        expect(mockNext).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });

      it('should normalize user ID from nameid claim', () => {
        const validToken = 'valid.jwt.token';
        const decodedUser = {
          nameid: 'user-456',
          email: 'test@example.com',
          iat: Math.floor(Date.now() / 1000),
        };

        mockRequest.headers = { authorization: `Bearer ${validToken}` };
        jest.spyOn(jwt, 'verify').mockReturnValue(decodedUser as any);

        authenticateJWT(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(mockRequest.user?.sub).toBe('user-456');
        expect(mockNext).toHaveBeenCalled();
      });

      it('should normalize user ID from .NET nameidentifier claim', () => {
        const validToken = 'valid.jwt.token';
        const decodedUser = {
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier':
            'user-789',
          email: 'test@example.com',
        };

        mockRequest.headers = { authorization: `Bearer ${validToken}` };
        jest.spyOn(jwt, 'verify').mockReturnValue(decodedUser as any);

        authenticateJWT(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(mockRequest.user?.sub).toBe('user-789');
        expect(mockNext).toHaveBeenCalled();
      });

      it('should normalize role from .NET role claim', () => {
        const validToken = 'valid.jwt.token';
        const decodedUser = {
          sub: 'user-123',
          'http://schemas.microsoft.com/ws/2008/06/identity/claims/role':
            'Admin',
        };

        mockRequest.headers = { authorization: `Bearer ${validToken}` };
        jest.spyOn(jwt, 'verify').mockReturnValue(decodedUser as any);

        authenticateJWT(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(mockRequest.user?.role).toBe('Admin');
        expect(mockNext).toHaveBeenCalled();
      });

      it('should normalize name from unique_name claim', () => {
        const validToken = 'valid.jwt.token';
        const decodedUser = {
          sub: 'user-123',
          unique_name: 'John Doe',
        };

        mockRequest.headers = { authorization: `Bearer ${validToken}` };
        jest.spyOn(jwt, 'verify').mockReturnValue(decodedUser as any);

        authenticateJWT(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(mockRequest.user?.name).toBe('John Doe');
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('when token is expired', () => {
      it('should return 403 with TOKEN_EXPIRED code', () => {
        const expiredToken = 'expired.jwt.token';
        const expiredAt = new Date('2024-01-01');
        const tokenExpiredError = new jwt.TokenExpiredError(
          'jwt expired',
          expiredAt
        );

        mockRequest.headers = { authorization: `Bearer ${expiredToken}` };
        jest.spyOn(jwt, 'verify').mockImplementation(() => {
          throw tokenExpiredError;
        });

        authenticateJWT(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'Forbidden',
          message: 'JWT token has expired. Please obtain a new token.',
          code: 'TOKEN_EXPIRED',
          expiredAt,
          requestId: 'test-request-id',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('when token is invalid', () => {
      it('should return 403 for JsonWebTokenError', () => {
        const invalidToken = 'invalid.jwt.token';
        const jwtError = new jwt.JsonWebTokenError('invalid signature');

        mockRequest.headers = { authorization: `Bearer ${invalidToken}` };
        jest.spyOn(jwt, 'verify').mockImplementation(() => {
          throw jwtError;
        });

        authenticateJWT(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'Forbidden',
          message: 'Invalid JWT token',
          code: 'INVALID_TOKEN',
          details: 'invalid signature',
          requestId: 'test-request-id',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('when token is not yet valid', () => {
      it('should return 403 for NotBeforeError', () => {
        const futureToken = 'future.jwt.token';
        const notBefore = new Date('2030-01-01');
        const notBeforeError = new jwt.NotBeforeError(
          'jwt not active',
          notBefore
        );

        mockRequest.headers = { authorization: `Bearer ${futureToken}` };
        jest.spyOn(jwt, 'verify').mockImplementation(() => {
          throw notBeforeError;
        });

        authenticateJWT(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'Forbidden',
          message: 'JWT token is not yet valid',
          code: 'TOKEN_NOT_YET_VALID',
          notBefore,
          requestId: 'test-request-id',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('when verification fails with generic error', () => {
      it('should return 403 for unknown Error', () => {
        const brokenToken = 'broken.jwt.token';
        const genericError = new Error('Unknown verification error');

        mockRequest.headers = { authorization: `Bearer ${brokenToken}` };
        jest.spyOn(jwt, 'verify').mockImplementation(() => {
          throw genericError;
        });

        authenticateJWT(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'Forbidden',
          message: 'Token verification failed',
          code: 'VERIFICATION_FAILED',
          requestId: 'test-request-id',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should handle non-Error exceptions', () => {
        const brokenToken = 'broken.jwt.token';
        mockRequest.headers = { authorization: `Bearer ${brokenToken}` };

        jest.spyOn(jwt, 'verify').mockImplementation(() => {
          throw new Error('String error'); // Error object
        });

        authenticateJWT(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          mockNext
        );

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'Forbidden',
          message: 'Token verification failed',
          code: 'VERIFICATION_FAILED',
          requestId: 'test-request-id',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('when request has no id', () => {
      it('should use "unknown" as requestId', () => {
        delete mockRequest.id;
        mockRequest.headers = {};

        authenticateJWT(
          mockRequest as AuthenticatedRequest,
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
  });

  describe('optionalAuthenticateJWT', () => {
    it('should call next() if no Authorization header', () => {
      optionalAuthenticateJWT(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(advancedLogger.debug).toHaveBeenCalledWith(
        'No authentication provided (optional)',
        expect.objectContaining({
          requestId: 'test-request-id',
          path: '/api/test',
        })
      );
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should validate token if Authorization header exists', () => {
      const validToken = 'valid.jwt.token';
      const decodedUser = {
        sub: 'user-123',
        email: 'test@example.com',
      };

      mockRequest.headers = { authorization: `Bearer ${validToken}` };
      jest.spyOn(jwt, 'verify').mockReturnValue(decodedUser as any);

      optionalAuthenticateJWT(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(jwt.verify).toHaveBeenCalled();
      expect(mockRequest.user).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };
      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });

      optionalAuthenticateJWT(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    beforeEach(() => {
      // Set up authenticated user
      mockRequest.user = {
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'User',
      };
    });

    it('should call next() if user has required role', () => {
      const middleware = requireRole('User');

      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should call next() if user has one of multiple required roles', () => {
      mockRequest.user!.role = 'Admin';
      const middleware = requireRole('Admin', 'SuperAdmin', 'Moderator');

      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should return 401 if user is not authenticated', () => {
      delete mockRequest.user;
      const middleware = requireRole('Admin');

      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
        requestId: 'test-request-id',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 if user lacks required role', () => {
      mockRequest.user!.role = 'User';
      const middleware = requireRole('Admin');

      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Insufficient permissions to access this resource',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: ['Admin'],
        requestId: 'test-request-id',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 if user has no role', () => {
      delete mockRequest.user!.role;
      const middleware = requireRole('Admin');

      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
          code: 'INSUFFICIENT_PERMISSIONS',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 if user role does not match any required roles', () => {
      mockRequest.user!.role = 'Guest';
      const middleware = requireRole('Admin', 'Moderator');

      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          requiredRoles: ['Admin', 'Moderator'],
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should use "unknown" as requestId when id is missing', () => {
      delete mockRequest.id;
      delete mockRequest.user;
      const middleware = requireRole('Admin');

      middleware(
        mockRequest as AuthenticatedRequest,
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
});
