/**
 * Comprehensive Tests for user-context.middleware.ts
 *
 * Coverage Focus:
 * - User context extraction from headers
 * - requireUserContext enforcement
 * - requireUserRole authorization
 * - Helper functions (getUserContext, hasUserContext)
 * - Log enrichment and context logging
 * - Edge cases and error handling
 *
 * Target: 100% branch coverage
 */

import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { NextFunction, Request, Response } from 'express';
import {
  enrichLogsWithUserContext,
  extractUserContext,
  getUserContext,
  hasUserContext,
  logUserContextInfo,
  requireUserContext,
  requireUserRole,
  UserContextRequest,
} from '../../src/middlewares/user-context.middleware';
import { advancedLogger } from '../../src/services/logging.service';
import {
  USER_CONTEXT_HEADERS,
  userContextService,
} from '../../src/services/user-context.service';

// Mock dependencies
jest.mock('../../src/services/logging.service');
jest.mock('../../src/services/user-context.service', () => {
  const actual = jest.requireActual<typeof import('../../src/services/user-context.service')>('../../src/services/user-context.service');
  return {
    ...actual,
    userContextService: {
      run: jest.fn((context: any, callback: () => void) => callback()),
      getContext: jest.fn(),
      hasAnyRole: jest.fn(),
      createContextLogger: jest.fn(),
      getContextSummary: jest.fn(),
    },
  };
});

describe('user-context.middleware', () => {
  let mockRequest: Partial<UserContextRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let getMock: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup get mock for headers
    getMock = jest.fn() as jest.Mock;

    // Setup request mock
    mockRequest = {
      get: getMock as any,
      path: '/api/test',
      method: 'GET',
      id: 'test-request-id',
      ip: '127.0.0.1',
    };

    // Setup response mock
    jsonMock = jest.fn() as jest.Mock;
    statusMock = jest.fn().mockReturnValue({ json: jsonMock }) as jest.Mock;
    mockResponse = {
      status: statusMock as any,
      json: jsonMock as any,
    };

    // Setup next mock
    mockNext = jest.fn();

    // Configure userContextService.run to execute the callback
    (userContextService.run as jest.Mock).mockImplementation(
      (_context: any, callback: any) => callback()
    );
  });

  describe('extractUserContext', () => {
    describe('when all user headers are present', () => {
      it('should extract full user context and call next', () => {
        getMock.mockImplementation((header: any) => {
          if (header === USER_CONTEXT_HEADERS.userId) return 'user-123';
          if (header === USER_CONTEXT_HEADERS.email) return 'test@example.com';
          if (header === USER_CONTEXT_HEADERS.role) return 'Admin';
          if (header === USER_CONTEXT_HEADERS.name) return 'Test User';
          return undefined;
        });

        extractUserContext(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(userContextService.run).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-123',
            email: 'test@example.com',
            role: 'Admin',
            name: 'Test User',
            requestId: 'test-request-id',
            extractedAt: expect.any(Date),
          }),
          expect.any(Function)
        );

        expect(mockRequest.userContext).toEqual(
          expect.objectContaining({
            userId: 'user-123',
            email: 'test@example.com',
            role: 'Admin',
            name: 'Test User',
          })
        );

        expect(advancedLogger.debug).toHaveBeenCalledWith(
          'User context extracted successfully',
          expect.objectContaining({
            requestId: 'test-request-id',
            userId: 'user-123',
            email: 'test@example.com',
            role: 'Admin',
            name: 'Test User',
            hasUserId: true,
            hasEmail: true,
            hasRole: true,
            hasName: true,
          })
        );

        expect(mockNext).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });
    });

    describe('when only userId is present', () => {
      it('should extract partial context with userId', () => {
        getMock.mockImplementation((header: any) => {
          if (header === USER_CONTEXT_HEADERS.userId) return 'user-456';
          return undefined;
        });

        extractUserContext(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(userContextService.run).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-456',
            email: undefined,
            role: undefined,
            name: undefined,
          }),
          expect.any(Function)
        );

        expect(advancedLogger.debug).toHaveBeenCalledWith(
          'User context extracted successfully',
          expect.objectContaining({
            hasUserId: true,
            hasEmail: false,
            hasRole: false,
            hasName: false,
          })
        );

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('when only email is present', () => {
      it('should extract partial context with email', () => {
        getMock.mockImplementation((header: any) => {
          if (header === USER_CONTEXT_HEADERS.email) return 'only@email.com';
          return undefined;
        });

        extractUserContext(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(userContextService.run).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: undefined,
            email: 'only@email.com',
            role: undefined,
            name: undefined,
          }),
          expect.any(Function)
        );

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('when only role is present', () => {
      it('should extract partial context with role', () => {
        getMock.mockImplementation((header: any) => {
          if (header === USER_CONTEXT_HEADERS.role) return 'User';
          return undefined;
        });

        extractUserContext(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(userContextService.run).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: undefined,
            email: undefined,
            role: 'User',
            name: undefined,
          }),
          expect.any(Function)
        );

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('when only name is present', () => {
      it('should extract partial context with name', () => {
        getMock.mockImplementation((header: any) => {
          if (header === USER_CONTEXT_HEADERS.name) return 'John Doe';
          return undefined;
        });

        extractUserContext(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(userContextService.run).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: undefined,
            email: undefined,
            role: undefined,
            name: 'John Doe',
          }),
          expect.any(Function)
        );

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('when no user headers are present', () => {
      it('should skip context extraction and call next', () => {
        getMock.mockReturnValue(undefined);

        extractUserContext(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(userContextService.run).not.toHaveBeenCalled();

        expect(advancedLogger.debug).toHaveBeenCalledWith(
          'No user context headers found - continuing without user context',
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
        getMock.mockImplementation((header: any) => {
          if (header === USER_CONTEXT_HEADERS.userId) return 'user-789';
          return undefined;
        });

        extractUserContext(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(userContextService.run).toHaveBeenCalledWith(
          expect.objectContaining({
            requestId: 'unknown',
          }),
          expect.any(Function)
        );
      });
    });

    describe('when request has numeric id', () => {
      it('should convert id to string', () => {
        mockRequest.id = 12345 as any;
        getMock.mockImplementation((header: any) => {
          if (header === USER_CONTEXT_HEADERS.userId) return 'user-999';
          return undefined;
        });

        extractUserContext(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(userContextService.run).toHaveBeenCalledWith(
          expect.objectContaining({
            requestId: '12345',
          }),
          expect.any(Function)
        );
      });
    });
  });

  describe('requireUserContext', () => {
    describe('when user context exists with userId', () => {
      it('should call next()', () => {
        (userContextService.getContext as jest.Mock).mockReturnValue({
          userId: 'user-123',
          email: 'test@example.com',
        });

        requireUserContext(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });
    });

    describe('when context exists but userId is missing', () => {
      it('should return 403 with USER_CONTEXT_REQUIRED', () => {
        (userContextService.getContext as jest.Mock).mockReturnValue({
          email: 'test@example.com',
          role: 'User',
        });

        requireUserContext(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(advancedLogger.warn).toHaveBeenCalledWith(
          'User context required but not found',
          expect.objectContaining({
            requestId: 'test-request-id',
            path: '/api/test',
            method: 'GET',
            ip: '127.0.0.1',
            code: 'USER_CONTEXT_REQUIRED',
          })
        );

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'Forbidden',
          message:
            'User context is required. This endpoint can only be accessed with user information.',
          code: 'USER_CONTEXT_REQUIRED',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('when no context exists', () => {
      it('should return 403 with USER_CONTEXT_REQUIRED', () => {
        (userContextService.getContext as jest.Mock).mockReturnValue(undefined);

        requireUserContext(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'USER_CONTEXT_REQUIRED',
          })
        );
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('when request has no id', () => {
      it('should use "unknown" as requestId', () => {
        delete mockRequest.id;
        (userContextService.getContext as jest.Mock).mockReturnValue(undefined);

        requireUserContext(
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
        mockRequest.id = 54321 as any;
        (userContextService.getContext as jest.Mock).mockReturnValue(undefined);

        requireUserContext(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            requestId: '54321',
          })
        );
      });
    });
  });

  describe('requireUserRole', () => {
    beforeEach(() => {
      (userContextService.getContext as jest.Mock).mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'User',
      });
    });

    describe('when user has required role', () => {
      it('should call next() for single role', () => {
        (userContextService.hasAnyRole as jest.Mock).mockReturnValue(true);
        const middleware = requireUserRole('User');

        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(userContextService.hasAnyRole).toHaveBeenCalledWith(['User']);
        expect(mockNext).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });

      it('should call next() for multiple roles', () => {
        (userContextService.hasAnyRole as jest.Mock).mockReturnValue(true);
        const middleware = requireUserRole('Admin', 'User', 'Moderator');

        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(userContextService.hasAnyRole).toHaveBeenCalledWith([
          'Admin',
          'User',
          'Moderator',
        ]);
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('when user lacks required role', () => {
      it('should return 403 with INSUFFICIENT_ROLE', () => {
        (userContextService.hasAnyRole as jest.Mock).mockReturnValue(false);
        const middleware = requireUserRole('Admin');

        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(advancedLogger.warn).toHaveBeenCalledWith(
          'User does not have required role',
          expect.objectContaining({
            requestId: 'test-request-id',
            path: '/api/test',
            method: 'GET',
            userId: 'user-123',
            userRole: 'User',
            requiredRoles: ['Admin'],
            code: 'INSUFFICIENT_ROLE',
          })
        );

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'Forbidden',
          message: 'Insufficient permissions. Required roles: Admin',
          code: 'INSUFFICIENT_ROLE',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should list multiple required roles in error message', () => {
        (userContextService.hasAnyRole as jest.Mock).mockReturnValue(false);
        const middleware = requireUserRole('Admin', 'SuperAdmin');

        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            message:
              'Insufficient permissions. Required roles: Admin, SuperAdmin',
          })
        );
      });
    });

    describe('when context exists but role is missing', () => {
      it('should return 403 with USER_ROLE_REQUIRED', () => {
        (userContextService.getContext as jest.Mock).mockReturnValue({
          userId: 'user-123',
          email: 'test@example.com',
        });

        const middleware = requireUserRole('Admin');

        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(advancedLogger.warn).toHaveBeenCalledWith(
          'User role required but not found in context',
          expect.objectContaining({
            requestId: 'test-request-id',
            path: '/api/test',
            method: 'GET',
            requiredRoles: ['Admin'],
            code: 'USER_ROLE_REQUIRED',
          })
        );

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'Forbidden',
          message: 'User role information is required.',
          code: 'USER_ROLE_REQUIRED',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('when no context exists', () => {
      it('should return 403 with USER_ROLE_REQUIRED', () => {
        (userContextService.getContext as jest.Mock).mockReturnValue(undefined);
        const middleware = requireUserRole('Admin');

        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'USER_ROLE_REQUIRED',
          })
        );
        expect(mockNext).not.toHaveBeenCalled();
      });
    });
  });

  describe('enrichLogsWithUserContext', () => {
    describe('when user context exists with userId', () => {
      it('should create context logger and attach to request', () => {
        const mockContextLogger = { debug: jest.fn() } as any;
        (userContextService.getContext as jest.Mock).mockReturnValue({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'Admin',
        });
        (userContextService.createContextLogger as jest.Mock).mockReturnValue(
          mockContextLogger
        );

        enrichLogsWithUserContext(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(userContextService.createContextLogger).toHaveBeenCalled();
        expect((mockRequest as any).logger).toBe(mockContextLogger);

        expect(mockContextLogger.debug).toHaveBeenCalledWith(
          'Logs enriched with user context',
          {
            userId: 'user-123',
            email: 'test@example.com',
            role: 'Admin',
          }
        );

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('when context exists but userId is missing', () => {
      it('should not enrich logs and call next', () => {
        (userContextService.getContext as jest.Mock).mockReturnValue({
          email: 'test@example.com',
          role: 'User',
        });

        enrichLogsWithUserContext(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(userContextService.createContextLogger).not.toHaveBeenCalled();
        expect((mockRequest as any).logger).toBeUndefined();
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('when no context exists', () => {
      it('should not enrich logs and call next', () => {
        (userContextService.getContext as jest.Mock).mockReturnValue(undefined);

        enrichLogsWithUserContext(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(userContextService.createContextLogger).not.toHaveBeenCalled();
        expect((mockRequest as any).logger).toBeUndefined();
        expect(mockNext).toHaveBeenCalled();
      });
    });
  });

  describe('getUserContext', () => {
    it('should return context from request if present', () => {
      const mockContext = { userId: 'user-123', email: 'test@example.com' };
      mockRequest.userContext = mockContext;

      const result = getUserContext(mockRequest as Request);

      expect(result).toBe(mockContext);
      expect(userContextService.getContext).not.toHaveBeenCalled();
    });

    it('should fallback to AsyncLocalStorage if not in request', () => {
      const mockContext = { userId: 'user-456', email: 'async@example.com' };
      (userContextService.getContext as jest.Mock).mockReturnValue(mockContext);

      const result = getUserContext(mockRequest as Request);

      expect(result).toBe(mockContext);
      expect(userContextService.getContext).toHaveBeenCalled();
    });

    it('should return undefined if no context anywhere', () => {
      (userContextService.getContext as jest.Mock).mockReturnValue(undefined);

      const result = getUserContext(mockRequest as Request);

      expect(result).toBeUndefined();
    });
  });

  describe('hasUserContext', () => {
    it('should return true when context exists in request', () => {
      mockRequest.userContext = { userId: 'user-123' };

      const result = hasUserContext(mockRequest as Request);

      expect(result).toBe(true);
    });

    it('should return true when context exists in AsyncLocalStorage', () => {
      (userContextService.getContext as jest.Mock).mockReturnValue({
        userId: 'user-456',
      });

      const result = hasUserContext(mockRequest as Request);

      expect(result).toBe(true);
    });

    it('should return false when no context exists', () => {
      (userContextService.getContext as jest.Mock).mockReturnValue(undefined);

      const result = hasUserContext(mockRequest as Request);

      expect(result).toBe(false);
    });
  });

  describe('logUserContextInfo', () => {
    it('should log full context summary', () => {
      const mockSummary = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'Admin',
        name: 'Test User',
        hasContext: true,
      };
      (userContextService.getContextSummary as jest.Mock).mockReturnValue(
        mockSummary
      );

      logUserContextInfo(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(userContextService.getContextSummary).toHaveBeenCalled();

      expect(advancedLogger.info).toHaveBeenCalledWith('User context info', {
        requestId: 'test-request-id',
        path: '/api/test',
        method: 'GET',
        ...mockSummary,
      });

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle missing id', () => {
      delete mockRequest.id;
      (userContextService.getContextSummary as jest.Mock).mockReturnValue({
        hasContext: false,
      });

      logUserContextInfo(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(advancedLogger.info).toHaveBeenCalledWith(
        'User context info',
        expect.objectContaining({
          requestId: 'unknown',
        })
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle numeric id', () => {
      mockRequest.id = 99999 as any;
      (userContextService.getContextSummary as jest.Mock).mockReturnValue({
        hasContext: true,
      });

      logUserContextInfo(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(advancedLogger.info).toHaveBeenCalledWith(
        'User context info',
        expect.objectContaining({
          requestId: '99999',
        })
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
