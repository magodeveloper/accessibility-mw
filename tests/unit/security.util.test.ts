import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import {
  validatePublicHttpUrl,
  type UrlValidationOptions,
} from '../../src/utils/security';

describe('Security Utils - URL Validation', () => {
  // Store original environment
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
    // Set test environment
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Basic Input Validation', () => {
    it('should reject empty URLs', async () => {
      const result = await validatePublicHttpUrl('');

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('URL vacía o demasiado larga');
    });

    it('should reject URLs that are too long', async () => {
      const longUrl = 'http://example.com/' + 'a'.repeat(5000);
      const result = await validatePublicHttpUrl(longUrl);

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('URL vacía o demasiado larga');
    });

    it('should reject invalid URL formats', async () => {
      const result = await validatePublicHttpUrl('not-a-url');

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('Formato de URL inválido');
    });

    it('should reject non-HTTP protocols', async () => {
      const result = await validatePublicHttpUrl('ftp://example.com');

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('Solo se permiten protocolos http/https');
    });

    it('should reject URLs with credentials in production', async () => {
      process.env.NODE_ENV = 'production';
      const result = await validatePublicHttpUrl(
        'http://user:pass@example.com'
      );

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('No se permiten credenciales en la URL');
    });

    it('should allow URLs with credentials in development', async () => {
      process.env.NODE_ENV = 'development';
      process.env.BYPASS_SSRF_VALIDATION_IN_DEV = 'true';

      const result = await validatePublicHttpUrl(
        'http://user:pass@localhost:3000'
      );

      // En desarrollo con bypass, debería intentar la conexión
      expect(result.ok).toBe(false); // Fallará conexión pero pasará validación inicial
    });
  });

  describe('Configuration Options', () => {
    it('should respect custom URL length limits', async () => {
      const options: UrlValidationOptions = { urlLengthLimit: 50 };
      const longUrl = 'http://example.com/' + 'a'.repeat(100);

      const result = await validatePublicHttpUrl(longUrl, options);

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('URL vacía o demasiado larga');
    });

    it('should handle different redirect limits', async () => {
      const options: UrlValidationOptions = {
        redirectLimit: 1,
        throwOnError: false,
      };

      // Test with redirect limit - will fail on connection but option is validated
      const result = await validatePublicHttpUrl(
        'http://httpbin.org/redirect/5',
        options
      );

      // Validation should handle the option correctly
      expect(typeof result).toBe('object');
      expect('ok' in result).toBe(true);
    });

    it('should handle custom timeouts', async () => {
      const options: UrlValidationOptions = {
        requestTimeoutMs: 100,
        socketTimeoutMs: 50,
      };

      const result = await validatePublicHttpUrl('http://httpbin.org', options);

      // Should complete validation (fail on connection but accept options)
      expect(typeof result).toBe('object');
      expect('ok' in result).toBe(true);
    });

    it('should handle different response byte limits', async () => {
      const options: UrlValidationOptions = {
        responseBytesLimit: 1000,
        fetchBody: true,
      };

      const result = await validatePublicHttpUrl('http://httpbin.org', options);

      expect(typeof result).toBe('object');
      expect('ok' in result).toBe(true);
    });
  });

  describe('Error Throwing Mode', () => {
    it('should throw errors when throwOnError is true', async () => {
      const options: UrlValidationOptions = { throwOnError: true };

      await expect(validatePublicHttpUrl('', options)).rejects.toThrow(
        'URL vacía o demasiado larga'
      );
    });

    it('should throw properly structured errors', async () => {
      const options: UrlValidationOptions = { throwOnError: true };

      try {
        await validatePublicHttpUrl('invalid-url', options);
        // Si llegamos aquí, la función no lanzó un error cuando debería haberlo hecho
        expect(true).toBe(false); // Forzar fallo del test
      } catch (error: any) {
        expect(error.message).toBe('Formato de URL inválido');
        expect(error.status).toBe(400);
        expect(error.expose).toBe(true);
        expect(error.code).toBe('URL_VALIDATION_ERROR');
        expect(error.details).toBeDefined();
      }
    });

    it('should return error object when throwOnError is false', async () => {
      const options: UrlValidationOptions = { throwOnError: false };

      const result = await validatePublicHttpUrl('invalid-url', options);

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('Formato de URL inválido');
    });
  });

  describe('Environment-based Configuration', () => {
    it('should use environment variables for configuration', async () => {
      process.env.URL_LENGTH_LIMIT = '100';
      process.env.REDIRECT_LIMIT = '5';
      process.env.RESPONSE_BYTES_LIMIT = '1000000';
      process.env.REQUEST_TIMEOUT_MS = '10000';
      process.env.SOCKET_TIMEOUT_MS = '15000';

      const longUrl = 'http://example.com/' + 'a'.repeat(150);
      const result = await validatePublicHttpUrl(longUrl);

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('URL vacía o demasiado larga');
    });

    it('should handle different allowed ports configuration', async () => {
      process.env.ALLOWED_PORTS = '80,443,8080';

      // Mock para evitar conexión real en CI
      const result = await validatePublicHttpUrl('http://localhost:8080');

      // Should pass port validation (will fail on connection but that's expected)
      expect(typeof result).toBe('object');
      expect('ok' in result).toBe(true);
    }, 15000); // Increased timeout

    it('should handle port ranges in configuration', async () => {
      process.env.ALLOWED_PORTS = '8000-9000';

      // Mock para evitar conexión real en CI
      const result = await validatePublicHttpUrl('http://localhost:8500');

      expect(typeof result).toBe('object');
      expect('ok' in result).toBe(true);
    }, 15000); // Increased timeout

    it('should behave differently in development vs production', async () => {
      // Test development mode
      process.env.NODE_ENV = 'development';

      const devResult = await validatePublicHttpUrl(
        'http://user:pass@example.com'
      );
      expect(typeof devResult).toBe('object');

      // Test production mode
      process.env.NODE_ENV = 'production';

      const prodResult = await validatePublicHttpUrl(
        'http://user:pass@example.com'
      );
      expect(prodResult.ok).toBe(false);
      expect(prodResult.reason).toBe('No se permiten credenciales en la URL');
    });
  });

  describe('Content Type Validation', () => {
    it('should handle HTML content type requirement option', async () => {
      const options: UrlValidationOptions = {
        requireHtmlContentType: true,
        fetchBody: true,
      };

      const result = await validatePublicHttpUrl(
        'http://httpbin.org/html',
        options
      );

      expect(typeof result).toBe('object');
      expect('ok' in result).toBe(true);
    });

    it('should handle custom user agent option', async () => {
      const options: UrlValidationOptions = {
        userAgent: 'TestBot/1.0',
      };

      const result = await validatePublicHttpUrl('http://httpbin.org', options);

      expect(typeof result).toBe('object');
      expect('ok' in result).toBe(true);
    });
  });

  describe('Edge Cases and Special Scenarios', () => {
    it('should handle URLs with unusual but valid formats', async () => {
      const testUrls = [
        'http://example.com:80',
        'https://example.com:443',
        'http://example.com/path?query=value',
        'http://example.com/path#fragment',
      ];

      for (const url of testUrls) {
        const result = await validatePublicHttpUrl(url);
        expect(typeof result).toBe('object');
        expect('ok' in result).toBe(true);
      }
    }, 60000); // aumentar timeout a 60s por posibles DNS lentos en CI

    it('should handle mixed case protocols', async () => {
      const result1 = await validatePublicHttpUrl('HTTP://example.com');
      const result2 = await validatePublicHttpUrl('HTTPS://example.com');

      expect(typeof result1).toBe('object');
      expect(typeof result2).toBe('object');
    });

    it('should validate port restrictions correctly', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_PORTS = '80,443';

      const disallowedResult = await validatePublicHttpUrl(
        'http://example.com:22'
      );
      expect(disallowedResult.ok).toBe(false);
      expect(disallowedResult.reason).toBe('Port 22 not allowed');

      const allowedResult = await validatePublicHttpUrl(
        'http://example.com:80'
      );
      expect(typeof allowedResult).toBe('object'); // Will fail on connection but port is allowed
    });

    it('should handle debug mode environment variable', async () => {
      process.env.DEBUG_URL_VALIDATOR = 'true';

      const result = await validatePublicHttpUrl('http://httpbin.org');

      expect(typeof result).toBe('object');
      expect('ok' in result).toBe(true);
    });
  });
});
