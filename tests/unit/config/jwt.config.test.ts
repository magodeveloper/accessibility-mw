/**
 * Tests para JWT Configuration
 * Cobertura objetivo: 90%+
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('JWT Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules and environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('loadJwtConfig', () => {
    it('should load valid JWT configuration', async () => {
      // Arrange
      process.env.JWT_SECRET_KEY = 'a'.repeat(64);
      process.env.JWT_ISSUER = 'https://api.example.com';
      process.env.JWT_AUDIENCE = 'https://example.com';
      process.env.JWT_EXPIRY_HOURS = '24';
      process.env.JWT_CLOCK_TOLERANCE = '60';

      // Act
      const { loadJwtConfig } = await import('../../../src/config/jwt.config');
      const config = loadJwtConfig();

      // Assert
      expect(config).toBeDefined();
      expect(config.secretKey).toBe('a'.repeat(64));
      expect(config.issuer).toBe('https://api.example.com');
      expect(config.audience).toBe('https://example.com');
      expect(config.expiryHours).toBe(24);
      expect(config.clockTolerance).toBe(60);
    });

    it('should use default values for optional parameters', async () => {
      // Arrange
      process.env.JWT_SECRET_KEY = 'a'.repeat(64);
      process.env.JWT_ISSUER = 'https://api.example.com';
      process.env.JWT_AUDIENCE = 'https://example.com';
      delete process.env.JWT_EXPIRY_HOURS;
      delete process.env.JWT_CLOCK_TOLERANCE;

      // Act
      const { loadJwtConfig } = await import('../../../src/config/jwt.config');
      const config = loadJwtConfig();

      // Assert
      expect(config.expiryHours).toBe(24); // default
      expect(config.clockTolerance).toBe(0); // default
    });

    it('should throw error when JWT_SECRET_KEY is missing', async () => {
      // Arrange
      delete process.env.JWT_SECRET_KEY;
      process.env.JWT_ISSUER = 'https://api.example.com';
      process.env.JWT_AUDIENCE = 'https://example.com';

      // Act & Assert
      const { loadJwtConfig } = await import('../../../src/config/jwt.config');
      expect(() => loadJwtConfig()).toThrow(/JWT Configuration Error/);
    });

    it('should throw error when JWT_SECRET_KEY is too short', async () => {
      // Arrange
      process.env.JWT_SECRET_KEY = 'tooshort'; // < 32 chars
      process.env.JWT_ISSUER = 'https://api.example.com';
      process.env.JWT_AUDIENCE = 'https://example.com';

      // Act & Assert
      const { loadJwtConfig } = await import('../../../src/config/jwt.config');
      expect(() => loadJwtConfig()).toThrow(/at least 32 characters/);
    });

    it('should accept JWT_SECRET_KEY with exactly 32 characters', async () => {
      // Arrange
      process.env.JWT_SECRET_KEY = 'a'.repeat(32);
      process.env.JWT_ISSUER = 'https://api.example.com';
      process.env.JWT_AUDIENCE = 'https://example.com';

      // Act
      const { loadJwtConfig } = await import('../../../src/config/jwt.config');
      const config = loadJwtConfig();

      // Assert
      expect(config.secretKey).toHaveLength(32);
    });

    it('should throw error when JWT_ISSUER is missing', async () => {
      // Arrange
      process.env.JWT_SECRET_KEY = 'a'.repeat(64);
      delete process.env.JWT_ISSUER;
      process.env.JWT_AUDIENCE = 'https://example.com';

      // Act & Assert
      const { loadJwtConfig } = await import('../../../src/config/jwt.config');
      expect(() => loadJwtConfig()).toThrow(/JWT Configuration Error/);
    });

    it('should throw error when JWT_ISSUER is not a valid URL', async () => {
      // Arrange
      process.env.JWT_SECRET_KEY = 'a'.repeat(64);
      process.env.JWT_ISSUER = 'not-a-valid-url';
      process.env.JWT_AUDIENCE = 'https://example.com';

      // Act & Assert
      const { loadJwtConfig } = await import('../../../src/config/jwt.config');
      expect(() => loadJwtConfig()).toThrow(/valid URL/);
    });

    it('should throw error when JWT_AUDIENCE is missing', async () => {
      // Arrange
      process.env.JWT_SECRET_KEY = 'a'.repeat(64);
      process.env.JWT_ISSUER = 'https://api.example.com';
      delete process.env.JWT_AUDIENCE;

      // Act & Assert
      const { loadJwtConfig } = await import('../../../src/config/jwt.config');
      expect(() => loadJwtConfig()).toThrow(/JWT Configuration Error/);
    });

    it('should throw error when JWT_AUDIENCE is not a valid URL', async () => {
      // Arrange
      process.env.JWT_SECRET_KEY = 'a'.repeat(64);
      process.env.JWT_ISSUER = 'https://api.example.com';
      process.env.JWT_AUDIENCE = 'invalid-url';

      // Act & Assert
      const { loadJwtConfig } = await import('../../../src/config/jwt.config');
      expect(() => loadJwtConfig()).toThrow(/valid URL/);
    });

    it('should throw error when JWT_EXPIRY_HOURS is negative', async () => {
      // Arrange
      process.env.JWT_SECRET_KEY = 'a'.repeat(64);
      process.env.JWT_ISSUER = 'https://api.example.com';
      process.env.JWT_AUDIENCE = 'https://example.com';
      process.env.JWT_EXPIRY_HOURS = '-5';

      // Act & Assert
      const { loadJwtConfig } = await import('../../../src/config/jwt.config');
      expect(() => loadJwtConfig()).toThrow(/JWT Configuration Error/);
    });

    it('should throw error when JWT_EXPIRY_HOURS is zero', async () => {
      // Arrange
      process.env.JWT_SECRET_KEY = 'a'.repeat(64);
      process.env.JWT_ISSUER = 'https://api.example.com';
      process.env.JWT_AUDIENCE = 'https://example.com';
      process.env.JWT_EXPIRY_HOURS = '0';

      // Act & Assert
      const { loadJwtConfig } = await import('../../../src/config/jwt.config');
      expect(() => loadJwtConfig()).toThrow(/JWT Configuration Error/);
    });

    it('should throw error when JWT_CLOCK_TOLERANCE is negative', async () => {
      // Arrange
      process.env.JWT_SECRET_KEY = 'a'.repeat(64);
      process.env.JWT_ISSUER = 'https://api.example.com';
      process.env.JWT_AUDIENCE = 'https://example.com';
      process.env.JWT_CLOCK_TOLERANCE = '-10';

      // Act & Assert
      const { loadJwtConfig } = await import('../../../src/config/jwt.config');
      expect(() => loadJwtConfig()).toThrow(/JWT Configuration Error/);
    });

    it('should accept JWT_CLOCK_TOLERANCE of zero', async () => {
      // Arrange
      process.env.JWT_SECRET_KEY = 'a'.repeat(64);
      process.env.JWT_ISSUER = 'https://api.example.com';
      process.env.JWT_AUDIENCE = 'https://example.com';
      process.env.JWT_CLOCK_TOLERANCE = '0';

      // Act
      const { loadJwtConfig } = await import('../../../src/config/jwt.config');
      const config = loadJwtConfig();

      // Assert
      expect(config.clockTolerance).toBe(0);
    });

    it('should accept various valid URL formats for issuer', async () => {
      // Arrange
      const validUrls = [
        'https://api.example.com',
        'http://localhost:8080',
        'https://api.example.com:443',
        'https://api.example.com/auth',
        'https://sub.domain.example.com',
      ];

      for (const url of validUrls) {
        jest.resetModules();
        process.env = { ...originalEnv };
        process.env.JWT_SECRET_KEY = 'a'.repeat(64);
        process.env.JWT_ISSUER = url;
        process.env.JWT_AUDIENCE = 'https://example.com';

        // Act
        const { loadJwtConfig } = await import('../../../src/config/jwt.config');
        const config = loadJwtConfig();

        // Assert
        expect(config.issuer).toBe(url);
      }
    });

    it('should handle non-numeric JWT_EXPIRY_HOURS gracefully', async () => {
      // Arrange
      process.env.JWT_SECRET_KEY = 'a'.repeat(64);
      process.env.JWT_ISSUER = 'https://api.example.com';
      process.env.JWT_AUDIENCE = 'https://example.com';
      process.env.JWT_EXPIRY_HOURS = 'not-a-number';

      // Act & Assert
      const { loadJwtConfig } = await import('../../../src/config/jwt.config');
      expect(() => loadJwtConfig()).toThrow(/JWT Configuration Error/);
    });
  });

  describe('isJwtEnabled', () => {
    it('should return true when all required JWT variables are set', async () => {
      // Arrange
      process.env.JWT_SECRET_KEY = 'a'.repeat(64);
      process.env.JWT_ISSUER = 'https://api.example.com';
      process.env.JWT_AUDIENCE = 'https://example.com';

      // Act
      const { isJwtEnabled } = await import('../../../src/config/jwt.config');
      const result = isJwtEnabled();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when JWT_SECRET_KEY is missing', async () => {
      // Arrange
      delete process.env.JWT_SECRET_KEY;
      process.env.JWT_ISSUER = 'https://api.example.com';
      process.env.JWT_AUDIENCE = 'https://example.com';

      // Act
      const { isJwtEnabled } = await import('../../../src/config/jwt.config');
      const result = isJwtEnabled();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when JWT_ISSUER is missing', async () => {
      // Arrange
      process.env.JWT_SECRET_KEY = 'a'.repeat(64);
      delete process.env.JWT_ISSUER;
      process.env.JWT_AUDIENCE = 'https://example.com';

      // Act
      const { isJwtEnabled } = await import('../../../src/config/jwt.config');
      const result = isJwtEnabled();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when JWT_AUDIENCE is missing', async () => {
      // Arrange
      process.env.JWT_SECRET_KEY = 'a'.repeat(64);
      process.env.JWT_ISSUER = 'https://api.example.com';
      delete process.env.JWT_AUDIENCE;

      // Act
      const { isJwtEnabled } = await import('../../../src/config/jwt.config');
      const result = isJwtEnabled();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when all JWT variables are missing', async () => {
      // Arrange
      delete process.env.JWT_SECRET_KEY;
      delete process.env.JWT_ISSUER;
      delete process.env.JWT_AUDIENCE;

      // Act
      const { isJwtEnabled } = await import('../../../src/config/jwt.config');
      const result = isJwtEnabled();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when JWT_SECRET_KEY is empty string', async () => {
      // Arrange
      process.env.JWT_SECRET_KEY = '';
      process.env.JWT_ISSUER = 'https://api.example.com';
      process.env.JWT_AUDIENCE = 'https://example.com';

      // Act
      const { isJwtEnabled } = await import('../../../src/config/jwt.config');
      const result = isJwtEnabled();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getJwtConfig', () => {
    it('should return JWT configuration when properly configured', async () => {
      // Arrange
      process.env.JWT_SECRET_KEY = 'a'.repeat(64);
      process.env.JWT_ISSUER = 'https://api.example.com';
      process.env.JWT_AUDIENCE = 'https://example.com';

      // Act
      const { getJwtConfig } = await import('../../../src/config/jwt.config');
      const config = getJwtConfig();

      // Assert
      expect(config).toBeDefined();
      expect(config.secretKey).toBe('a'.repeat(64));
    });

    it('should throw error when JWT is not configured', async () => {
      // Arrange
      delete process.env.JWT_SECRET_KEY;
      delete process.env.JWT_ISSUER;
      delete process.env.JWT_AUDIENCE;

      // Act & Assert
      const { getJwtConfig } = await import('../../../src/config/jwt.config');
      expect(() => getJwtConfig()).toThrow(/not configured/);
    });

    it('should return cached configuration on subsequent calls', async () => {
      // Arrange
      process.env.JWT_SECRET_KEY = 'a'.repeat(64);
      process.env.JWT_ISSUER = 'https://api.example.com';
      process.env.JWT_AUDIENCE = 'https://example.com';

      // Act
      const { getJwtConfig } = await import('../../../src/config/jwt.config');
      const config1 = getJwtConfig();
      const config2 = getJwtConfig();

      // Assert
      expect(config1).toBe(config2); // Same reference
    });

    it('should throw error with helpful message when config is invalid', async () => {
      // Arrange
      process.env.JWT_SECRET_KEY = 'short'; // Too short
      process.env.JWT_ISSUER = 'https://api.example.com';
      process.env.JWT_AUDIENCE = 'https://example.com';

      // Act & Assert
      const { getJwtConfig } = await import('../../../src/config/jwt.config');
      expect(() => getJwtConfig()).toThrow(/at least 32 characters/);
    });
  });

  describe('resetJwtConfig', () => {
    it('should reset JWT configuration singleton', async () => {
      // Arrange
      process.env.JWT_SECRET_KEY = 'a'.repeat(64);
      process.env.JWT_ISSUER = 'https://api.example.com';
      process.env.JWT_AUDIENCE = 'https://example.com';

      // Act
      const { getJwtConfig, resetJwtConfig } = await import('../../../src/config/jwt.config');
      const config1 = getJwtConfig();
      resetJwtConfig();
      
      // Change environment
      process.env.JWT_SECRET_KEY = 'b'.repeat(64);
      const config2 = getJwtConfig();

      // Assert
      expect(config1).not.toBe(config2);
      expect(config1.secretKey).toBe('a'.repeat(64));
      expect(config2.secretKey).toBe('b'.repeat(64));
    });

    it('should allow reconfiguration after reset', async () => {
      // Arrange
      process.env.JWT_SECRET_KEY = 'a'.repeat(64);
      process.env.JWT_ISSUER = 'https://api.example.com';
      process.env.JWT_AUDIENCE = 'https://example.com';

      // Act
      const { getJwtConfig, resetJwtConfig } = await import('../../../src/config/jwt.config');
      getJwtConfig();
      resetJwtConfig();

      // Should not throw
      expect(() => getJwtConfig()).not.toThrow();
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle special characters in JWT_SECRET_KEY', async () => {
      // Arrange
      const secretWithSpecialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/' + 'a'.repeat(32);
      process.env.JWT_SECRET_KEY = secretWithSpecialChars;
      process.env.JWT_ISSUER = 'https://api.example.com';
      process.env.JWT_AUDIENCE = 'https://example.com';

      // Act
      const { loadJwtConfig } = await import('../../../src/config/jwt.config');
      const config = loadJwtConfig();

      // Assert
      expect(config.secretKey).toBe(secretWithSpecialChars);
    });

    it('should handle base64 encoded secrets', async () => {
      // Arrange
      const base64Secret = Buffer.from('my-secret-key-12345').toString('base64').repeat(2);
      process.env.JWT_SECRET_KEY = base64Secret;
      process.env.JWT_ISSUER = 'https://api.example.com';
      process.env.JWT_AUDIENCE = 'https://example.com';

      // Act
      const { loadJwtConfig } = await import('../../../src/config/jwt.config');
      const config = loadJwtConfig();

      // Assert
      expect(config.secretKey).toBe(base64Secret);
    });

    it('should handle URLs with query parameters', async () => {
      // Arrange
      process.env.JWT_SECRET_KEY = 'a'.repeat(64);
      process.env.JWT_ISSUER = 'https://api.example.com?param=value';
      process.env.JWT_AUDIENCE = 'https://example.com?app=web';

      // Act
      const { loadJwtConfig } = await import('../../../src/config/jwt.config');
      const config = loadJwtConfig();

      // Assert
      expect(config.issuer).toContain('?param=value');
      expect(config.audience).toContain('?app=web');
    });

    it('should handle very large expiry hours', async () => {
      // Arrange
      process.env.JWT_SECRET_KEY = 'a'.repeat(64);
      process.env.JWT_ISSUER = 'https://api.example.com';
      process.env.JWT_AUDIENCE = 'https://example.com';
      process.env.JWT_EXPIRY_HOURS = '8760'; // 1 year

      // Act
      const { loadJwtConfig } = await import('../../../src/config/jwt.config');
      const config = loadJwtConfig();

      // Assert
      expect(config.expiryHours).toBe(8760);
    });

    it('should handle very large clock tolerance', async () => {
      // Arrange
      process.env.JWT_SECRET_KEY = 'a'.repeat(64);
      process.env.JWT_ISSUER = 'https://api.example.com';
      process.env.JWT_AUDIENCE = 'https://example.com';
      process.env.JWT_CLOCK_TOLERANCE = '3600'; // 1 hour

      // Act
      const { loadJwtConfig } = await import('../../../src/config/jwt.config');
      const config = loadJwtConfig();

      // Assert
      expect(config.clockTolerance).toBe(3600);
    });
  });

  describe('Error Messages', () => {
    it('should provide helpful error message listing all required variables', async () => {
      // Arrange
      delete process.env.JWT_SECRET_KEY;
      process.env.JWT_ISSUER = 'https://api.example.com';
      process.env.JWT_AUDIENCE = 'https://example.com';

      // Act & Assert
      const { loadJwtConfig } = await import('../../../src/config/jwt.config');
      try {
        loadJwtConfig();
        throw new Error('Should have thrown error');
      } catch (error) {
        expect((error as Error).message).toContain('JWT_SECRET_KEY');
        expect((error as Error).message).toContain('JWT_ISSUER');
        expect((error as Error).message).toContain('JWT_AUDIENCE');
      }
    });

    it('should include field path in error message', async () => {
      // Arrange
      process.env.JWT_SECRET_KEY = 'short';
      process.env.JWT_ISSUER = 'https://api.example.com';
      process.env.JWT_AUDIENCE = 'https://example.com';

      // Act & Assert
      const { loadJwtConfig } = await import('../../../src/config/jwt.config');
      try {
        loadJwtConfig();
        throw new Error('Expected error was not thrown');
      } catch (error) {
        expect((error as Error).message).toContain('secretKey');
      }
    });
  });
});
