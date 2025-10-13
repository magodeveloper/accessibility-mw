/**
 * Comprehensive Tests for user-context.service.ts
 *
 * Coverage Focus:
 * - Context lifecycle (set, get, clear)
 * - All getter methods (getUserId, getEmail, getRole, getName, getRequestId)
 * - Role validation (hasRole, hasAnyRole)
 * - Context utilities (hasContext, getContextSummary)
 * - Header serialization/deserialization (toHeaders, fromHeaders)
 * - Logger creation with context
 * - AsyncLocalStorage edge cases
 *
 * Target: 100% branch coverage
 */

import { advancedLogger } from '../../src/services/logging.service';
import {
  USER_CONTEXT_HEADERS,
  UserContext,
  userContextService,
} from '../../src/services/user-context.service';

// Mock dependencies
jest.mock('../../src/services/logging.service');

describe('user-context.service', () => {
  const getMockContext = (): UserContext => ({
    userId: 'user-123',
    email: 'test@example.com',
    role: 'Admin',
    name: 'Test User',
    requestId: 'req-456',
    extractedAt: new Date('2025-01-01T00:00:00Z'),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Ensure clean state after each test
    userContextService.clearContext();
  });

  describe('run and setContext', () => {
    it('should execute callback within async context', () => {
      const result = userContextService.run(getMockContext(), () => {
        return userContextService.getUserId();
      });

      expect(result).toBe('user-123');
    });

    it('should maintain context across multiple calls within run', () => {
      userContextService.run(getMockContext(), () => {
        expect(userContextService.getUserId()).toBe('user-123');
        expect(userContextService.getEmail()).toBe('test@example.com');
        expect(userContextService.getRole()).toBe('Admin');
        expect(userContextService.getName()).toBe('Test User');
        expect(userContextService.getRequestId()).toBe('req-456');
      });
    });

    it('should update context when setContext is called within run', () => {
      userContextService.run(getMockContext(), () => {
        expect(userContextService.getUserId()).toBe('user-123');

        userContextService.setContext({
          ...getMockContext(),
          userId: 'user-789',
          email: 'updated@example.com',
        });

        expect(userContextService.getUserId()).toBe('user-789');
        expect(userContextService.getEmail()).toBe('updated@example.com');
        expect(advancedLogger.debug).toHaveBeenCalledWith(
          'User context updated',
          expect.objectContaining({
            userId: 'user-789',
            email: 'updated@example.com',
            role: 'Admin',
            requestId: 'req-456',
          })
        );
      });
    });

    it('should warn when setContext is called outside async context', () => {
      userContextService.setContext(getMockContext());

      expect(advancedLogger.warn).toHaveBeenCalledWith(
        'Attempted to set user context outside async context',
        expect.objectContaining({
          userId: 'user-123',
          requestId: 'req-456',
        })
      );
    });
  });

  describe('getContext', () => {
    it('should return undefined when no context is set', () => {
      const context = userContextService.getContext();

      expect(context).toBeUndefined();
    });

    it('should return context when within run', () => {
      userContextService.run(getMockContext(), () => {
        const context = userContextService.getContext();

        expect(context).toEqual(getMockContext());
      });
    });
  });

  describe('getUserId', () => {
    it('should return userId from context', () => {
      userContextService.run(getMockContext(), () => {
        expect(userContextService.getUserId()).toBe('user-123');
      });
    });

    it('should return undefined when no context', () => {
      expect(userContextService.getUserId()).toBeUndefined();
    });

    it('should return undefined when context has no userId', () => {
      userContextService.run({ email: 'test@example.com' }, () => {
        expect(userContextService.getUserId()).toBeUndefined();
      });
    });
  });

  describe('getEmail', () => {
    it('should return email from context', () => {
      userContextService.run(getMockContext(), () => {
        expect(userContextService.getEmail()).toBe('test@example.com');
      });
    });

    it('should return undefined when no context', () => {
      expect(userContextService.getEmail()).toBeUndefined();
    });

    it('should return undefined when context has no email', () => {
      userContextService.run({ userId: 'user-123' }, () => {
        expect(userContextService.getEmail()).toBeUndefined();
      });
    });
  });

  describe('getRole', () => {
    it('should return role from context', () => {
      userContextService.run(getMockContext(), () => {
        expect(userContextService.getRole()).toBe('Admin');
      });
    });

    it('should return undefined when no context', () => {
      expect(userContextService.getRole()).toBeUndefined();
    });

    it('should return undefined when context has no role', () => {
      userContextService.run({ userId: 'user-123' }, () => {
        expect(userContextService.getRole()).toBeUndefined();
      });
    });
  });

  describe('getName', () => {
    it('should return name from context', () => {
      userContextService.run(getMockContext(), () => {
        expect(userContextService.getName()).toBe('Test User');
      });
    });

    it('should return undefined when no context', () => {
      expect(userContextService.getName()).toBeUndefined();
    });

    it('should return undefined when context has no name', () => {
      userContextService.run({ userId: 'user-123' }, () => {
        expect(userContextService.getName()).toBeUndefined();
      });
    });
  });

  describe('getRequestId', () => {
    it('should return requestId from context', () => {
      userContextService.run(getMockContext(), () => {
        expect(userContextService.getRequestId()).toBe('req-456');
      });
    });

    it('should return undefined when no context', () => {
      expect(userContextService.getRequestId()).toBeUndefined();
    });

    it('should return undefined when context has no requestId', () => {
      userContextService.run({ userId: 'user-123' }, () => {
        expect(userContextService.getRequestId()).toBeUndefined();
      });
    });
  });

  describe('hasContext', () => {
    it('should return true when context exists', () => {
      userContextService.run(getMockContext(), () => {
        expect(userContextService.hasContext()).toBe(true);
      });
    });

    it('should return false when no context', () => {
      expect(userContextService.hasContext()).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return true when user has exact role', () => {
      userContextService.run(getMockContext(), () => {
        expect(userContextService.hasRole('Admin')).toBe(true);
      });
    });

    it('should return true with case-insensitive match', () => {
      userContextService.run(getMockContext(), () => {
        expect(userContextService.hasRole('admin')).toBe(true);
        expect(userContextService.hasRole('ADMIN')).toBe(true);
        expect(userContextService.hasRole('AdMiN')).toBe(true);
      });
    });

    it('should return false when role does not match', () => {
      userContextService.run(getMockContext(), () => {
        expect(userContextService.hasRole('User')).toBe(false);
        expect(userContextService.hasRole('Guest')).toBe(false);
      });
    });

    it('should return false when no role in context', () => {
      userContextService.run({ userId: 'user-123' }, () => {
        expect(userContextService.hasRole('Admin')).toBe(false);
      });
    });

    it('should return false when no context', () => {
      expect(userContextService.hasRole('Admin')).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('should return true when user has one of the roles', () => {
      userContextService.run(getMockContext(), () => {
        expect(userContextService.hasAnyRole(['Admin', 'Moderator'])).toBe(
          true
        );
        expect(userContextService.hasAnyRole(['User', 'Admin', 'Guest'])).toBe(
          true
        );
      });
    });

    it('should return true with case-insensitive match', () => {
      userContextService.run(getMockContext(), () => {
        expect(userContextService.hasAnyRole(['user', 'admin'])).toBe(true);
        expect(userContextService.hasAnyRole(['ADMIN'])).toBe(true);
      });
    });

    it('should return false when user has none of the roles', () => {
      userContextService.run(getMockContext(), () => {
        expect(
          userContextService.hasAnyRole(['User', 'Guest', 'Moderator'])
        ).toBe(false);
      });
    });

    it('should return false when empty roles array', () => {
      userContextService.run(getMockContext(), () => {
        expect(userContextService.hasAnyRole([])).toBe(false);
      });
    });

    it('should return false when no context', () => {
      expect(userContextService.hasAnyRole(['Admin'])).toBe(false);
    });
  });

  describe('getContextSummary', () => {
    it('should return full summary when context exists', () => {
      userContextService.run(getMockContext(), () => {
        const summary = userContextService.getContextSummary();

        expect(summary).toEqual({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'Admin',
          name: 'Test User',
          requestId: 'req-456',
          hasContext: true,
        });
      });
    });

    it('should return partial summary when some fields are missing', () => {
      userContextService.run(
        { userId: 'user-123', email: 'test@example.com' },
        () => {
          const summary = userContextService.getContextSummary();

          expect(summary).toEqual({
            userId: 'user-123',
            email: 'test@example.com',
            role: undefined,
            name: undefined,
            requestId: undefined,
            hasContext: true,
          });
        }
      );
    });

    it('should return empty summary when no context', () => {
      const summary = userContextService.getContextSummary();

      expect(summary).toEqual({
        userId: undefined,
        email: undefined,
        role: undefined,
        name: undefined,
        requestId: undefined,
        hasContext: false,
      });
    });
  });

  describe('clearContext', () => {
    it('should clear all context fields', () => {
      userContextService.run(getMockContext(), () => {
        expect(userContextService.hasContext()).toBe(true);

        userContextService.clearContext();

        const context = userContextService.getContext();
        expect(context).toBeDefined(); // Store still exists
        expect(Object.keys(context!).length).toBe(0); // But it's empty

        expect(advancedLogger.debug).toHaveBeenCalledWith(
          'User context cleared'
        );
      });
    });

    it('should handle clearing when no context exists', () => {
      userContextService.clearContext();

      // Should not throw and should not log
      expect(advancedLogger.debug).not.toHaveBeenCalledWith(
        'User context cleared'
      );
    });
  });

  describe('createContextLogger', () => {
    it('should create child logger with user context', () => {
      const mockChildLogger = { info: jest.fn() } as any;
      (advancedLogger.child as jest.Mock) = jest
        .fn()
        .mockReturnValue(mockChildLogger);

      userContextService.run(getMockContext(), () => {
        const logger = userContextService.createContextLogger();

        expect(advancedLogger.child).toHaveBeenCalledWith({
          userId: 'user-123',
          userEmail: 'test@example.com',
          userRole: 'Admin',
          userName: 'Test User',
        });
        expect(logger).toBe(mockChildLogger);
      });
    });

    it('should return base logger when no context', () => {
      const logger = userContextService.createContextLogger();

      expect(logger).toBe(advancedLogger);
      expect(advancedLogger.child).not.toHaveBeenCalled();
    });
  });

  describe('toHeaders', () => {
    it('should serialize full context to headers', () => {
      userContextService.run(getMockContext(), () => {
        const headers = userContextService.toHeaders();

        expect(headers).toEqual({
          [USER_CONTEXT_HEADERS.userId]: 'user-123',
          [USER_CONTEXT_HEADERS.email]: 'test@example.com',
          [USER_CONTEXT_HEADERS.role]: 'Admin',
          [USER_CONTEXT_HEADERS.name]: 'Test User',
        });
      });
    });

    it('should only include present fields', () => {
      userContextService.run(
        { userId: 'user-123', email: 'test@example.com' },
        () => {
          const headers = userContextService.toHeaders();

          expect(headers).toEqual({
            [USER_CONTEXT_HEADERS.userId]: 'user-123',
            [USER_CONTEXT_HEADERS.email]: 'test@example.com',
          });
          expect(headers[USER_CONTEXT_HEADERS.role]).toBeUndefined();
          expect(headers[USER_CONTEXT_HEADERS.name]).toBeUndefined();
        }
      );
    });

    it('should return empty object when no context', () => {
      const headers = userContextService.toHeaders();

      expect(headers).toEqual({});
    });

    it('should not include extractedAt or requestId in headers', () => {
      userContextService.run(getMockContext(), () => {
        const headers = userContextService.toHeaders();

        expect(headers).not.toHaveProperty('extractedAt');
        expect(headers).not.toHaveProperty('requestId');
      });
    });
  });

  describe('fromHeaders', () => {
    it('should deserialize headers to context', () => {
      const headers = {
        [USER_CONTEXT_HEADERS.userId]: 'user-999',
        [USER_CONTEXT_HEADERS.email]: 'new@example.com',
        [USER_CONTEXT_HEADERS.role]: 'Moderator',
        [USER_CONTEXT_HEADERS.name]: 'New User',
      };

      const context = userContextService.fromHeaders(headers);

      expect(context).toEqual({
        userId: 'user-999',
        email: 'new@example.com',
        role: 'Moderator',
        name: 'New User',
        extractedAt: expect.any(Date),
      });
      expect(context.extractedAt).toBeInstanceOf(Date);
    });

    it('should handle partial headers', () => {
      const headers = {
        [USER_CONTEXT_HEADERS.userId]: 'user-777',
      };

      const context = userContextService.fromHeaders(headers);

      expect(context).toEqual({
        userId: 'user-777',
        email: undefined,
        role: undefined,
        name: undefined,
        extractedAt: expect.any(Date),
      });
    });

    it('should handle empty headers', () => {
      const context = userContextService.fromHeaders({});

      expect(context).toEqual({
        userId: undefined,
        email: undefined,
        role: undefined,
        name: undefined,
        extractedAt: expect.any(Date),
      });
    });

    it('should ignore unknown headers', () => {
      const headers = {
        [USER_CONTEXT_HEADERS.userId]: 'user-555',
        'x-unknown-header': 'should-be-ignored',
        authorization: 'Bearer token',
      };

      const context = userContextService.fromHeaders(headers);

      expect(context).toEqual({
        userId: 'user-555',
        email: undefined,
        role: undefined,
        name: undefined,
        extractedAt: expect.any(Date),
      });
      expect(context).not.toHaveProperty('x-unknown-header');
      expect(context).not.toHaveProperty('authorization');
    });
  });

  describe('USER_CONTEXT_HEADERS constant', () => {
    it('should have correct header names', () => {
      expect(USER_CONTEXT_HEADERS.userId).toBe('x-user-id');
      expect(USER_CONTEXT_HEADERS.email).toBe('x-user-email');
      expect(USER_CONTEXT_HEADERS.role).toBe('x-user-role');
      expect(USER_CONTEXT_HEADERS.name).toBe('x-user-name');
    });
  });

  describe('integration: round-trip serialization', () => {
    it('should maintain data through toHeaders and fromHeaders', () => {
      userContextService.run(getMockContext(), () => {
        const headers = userContextService.toHeaders();
        const reconstructed = userContextService.fromHeaders(headers);

        expect(reconstructed.userId).toBe(getMockContext().userId);
        expect(reconstructed.email).toBe(getMockContext().email);
        expect(reconstructed.role).toBe(getMockContext().role);
        expect(reconstructed.name).toBe(getMockContext().name);
        // Note: extractedAt and requestId are not preserved in headers
      });
    });
  });

  describe('nested async contexts', () => {
    it('should maintain separate contexts in nested runs', () => {
      userContextService.run({ userId: 'outer-user' }, () => {
        expect(userContextService.getUserId()).toBe('outer-user');

        userContextService.run({ userId: 'inner-user' }, () => {
          expect(userContextService.getUserId()).toBe('inner-user');
        });

        // Should return to outer context after inner completes
        expect(userContextService.getUserId()).toBe('outer-user');
      });
    });
  });
});
