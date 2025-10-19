/**
 * Environment Utility Tests
 * Tests for environment configuration parsing and feature flags
 */

import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import {
  ENV,
  FeatureFlags,
  getEnvironmentConfig,
} from '../../src/utils/environment';

describe('Environment Utility', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env to a clean state
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getEnvironmentConfig', () => {
    describe('Default Configuration', () => {
      it('should return default configuration when no environment variables are set', () => {
        // Clear all relevant env vars
        delete process.env.NODE_ENV;
        delete process.env.PORT;
        delete process.env.HOST;
        delete process.env.ANALYZE_TIMEOUT_MS;
        delete process.env.NAVIGATION_TIMEOUT_MS;
        delete process.env.WRAP_MARGIN_MS;
        delete process.env.CACHE_MAX_ENTRIES;
        delete process.env.CACHE_MAX_MEMORY_MB;
        delete process.env.CACHE_TTL_MS;
        delete process.env.BROWSER_POOL_SIZE;
        delete process.env.RATE_LIMIT_WINDOW_MS;
        delete process.env.RATE_LIMIT_MAX_REQUESTS;
        delete process.env.ANALYZE_RATE_LIMIT_MAX;
        delete process.env.TRUST_PROXY;
        delete process.env.CORS_ORIGINS;
        delete process.env.ANALYSIS_API_URL;
        delete process.env.REPORTS_API_URL;
        delete process.env.HEALTHCHECK_TIMEOUT_MS;
        delete process.env.ENABLE_FILE_LOGGING;

        const config = getEnvironmentConfig();

        expect(config).toEqual({
          PORT: 3001,
          HOST: '0.0.0.0', // Default when NODE_ENV is undefined (not development)
          NODE_ENV: 'development',
          ANALYZE_TIMEOUT_MS: 30000, // Not production, so uses non-prod default
          NAVIGATION_TIMEOUT_MS: 12000,
          WRAP_MARGIN_MS: 3000,
          CACHE_MAX_ENTRIES: 100, // Not production, so uses non-prod default
          CACHE_MAX_MEMORY_MB: 50, // Not production, so uses non-prod default
          CACHE_TTL_MS: 300000,
          BROWSER_POOL_SIZE: 3, // Not production, so uses non-prod default
          RATE_LIMIT_WINDOW_MS: 60000,
          RATE_LIMIT_MAX_REQUESTS: 100, // Not production, so uses non-prod default
          ANALYZE_RATE_LIMIT_MAX: 20, // Not production, so uses non-prod default
          TRUST_PROXY: false,
          CORS_ORIGINS: [],
          ANALYSIS_API_URL: 'http://localhost:8082',
          REPORTS_API_URL: 'http://localhost:8083',
          HEALTHCHECK_TIMEOUT_MS: 15000,
          ENABLE_FILE_LOGGING: false, // Not development, so false
        });
      });

      it('should parse numeric environment variables correctly', () => {
        process.env.PORT = '8080';
        process.env.ANALYZE_TIMEOUT_MS = '15000';
        process.env.NAVIGATION_TIMEOUT_MS = '10000';
        process.env.WRAP_MARGIN_MS = '2000';
        process.env.CACHE_MAX_ENTRIES = '150';
        process.env.CACHE_MAX_MEMORY_MB = '75';
        process.env.CACHE_TTL_MS = '600000';
        process.env.BROWSER_POOL_SIZE = '4';
        process.env.RATE_LIMIT_WINDOW_MS = '120000';
        process.env.RATE_LIMIT_MAX_REQUESTS = '75';
        process.env.ANALYZE_RATE_LIMIT_MAX = '15';
        process.env.HEALTHCHECK_TIMEOUT_MS = '20000';

        const config = getEnvironmentConfig();

        expect(config.PORT).toBe(8080);
        expect(config.ANALYZE_TIMEOUT_MS).toBe(15000);
        expect(config.NAVIGATION_TIMEOUT_MS).toBe(10000);
        expect(config.WRAP_MARGIN_MS).toBe(2000);
        expect(config.CACHE_MAX_ENTRIES).toBe(150);
        expect(config.CACHE_MAX_MEMORY_MB).toBe(75);
        expect(config.CACHE_TTL_MS).toBe(600000);
        expect(config.BROWSER_POOL_SIZE).toBe(4);
        expect(config.RATE_LIMIT_WINDOW_MS).toBe(120000);
        expect(config.RATE_LIMIT_MAX_REQUESTS).toBe(75);
        expect(config.ANALYZE_RATE_LIMIT_MAX).toBe(15);
        expect(config.HEALTHCHECK_TIMEOUT_MS).toBe(20000);
      });

      it('should parse boolean environment variables correctly', () => {
        process.env.TRUST_PROXY = 'true';
        process.env.ENABLE_FILE_LOGGING = 'false';

        const config = getEnvironmentConfig();

        expect(config.TRUST_PROXY).toBe(true);
        expect(config.ENABLE_FILE_LOGGING).toBe(false);
      });

      it('should parse boolean environment variables with case insensitivity', () => {
        process.env.TRUST_PROXY = 'TRUE';
        process.env.ENABLE_FILE_LOGGING = 'False';

        const config = getEnvironmentConfig();

        expect(config.TRUST_PROXY).toBe(true);
        expect(config.ENABLE_FILE_LOGGING).toBe(false);
      });

      it('should parse CORS_ORIGINS correctly', () => {
        process.env.CORS_ORIGINS =
          'https://example.com, https://app.example.com , https://admin.example.com';

        const config = getEnvironmentConfig();

        expect(config.CORS_ORIGINS).toEqual([
          'https://example.com',
          'https://app.example.com',
          'https://admin.example.com',
        ]);
      });

      it('should handle empty CORS_ORIGINS', () => {
        process.env.CORS_ORIGINS = '';

        const config = getEnvironmentConfig();

        expect(config.CORS_ORIGINS).toEqual([]);
      });

      it('should handle CORS_ORIGINS with empty segments', () => {
        process.env.CORS_ORIGINS =
          'https://example.com,, ,https://app.example.com';

        const config = getEnvironmentConfig();

        expect(config.CORS_ORIGINS).toEqual([
          'https://example.com',
          'https://app.example.com',
        ]);
      });
    });

    describe('Production Environment Configuration', () => {
      it('should use production defaults when NODE_ENV is production', () => {
        // Limpiar variables relevantes para asegurar estado limpio
        delete process.env.BROWSER_POOL_SIZE;
        delete process.env.PORT;
        delete process.env.HOST;
        delete process.env.ANALYZE_TIMEOUT_MS;
        delete process.env.CACHE_MAX_ENTRIES;
        delete process.env.CACHE_MAX_MEMORY_MB;
        delete process.env.RATE_LIMIT_MAX_REQUESTS;
        delete process.env.ANALYZE_RATE_LIMIT_MAX;
        delete process.env.ENABLE_FILE_LOGGING;

        process.env.NODE_ENV = 'production';

        const config = getEnvironmentConfig();

        expect(config.NODE_ENV).toBe('production');
        expect(config.HOST).toBe('0.0.0.0'); // Production default
        expect(config.ANALYZE_TIMEOUT_MS).toBe(25000); // Production default
        expect(config.CACHE_MAX_ENTRIES).toBe(200); // Production default
        expect(config.CACHE_MAX_MEMORY_MB).toBe(100); // Production default
        expect(config.BROWSER_POOL_SIZE).toBe(5); // Production default
        expect(config.RATE_LIMIT_MAX_REQUESTS).toBe(50); // Production default
        expect(config.ANALYZE_RATE_LIMIT_MAX).toBe(10); // Production default
        expect(config.ENABLE_FILE_LOGGING).toBe(false); // Production default (no isDev)
      });

      it('should override production defaults with explicit environment variables', () => {
        process.env.NODE_ENV = 'production';
        process.env.HOST = 'custom.host.com';
        process.env.ANALYZE_TIMEOUT_MS = '35000';
        process.env.CACHE_MAX_ENTRIES = '300';
        process.env.CACHE_MAX_MEMORY_MB = '150';
        process.env.BROWSER_POOL_SIZE = '7';
        process.env.RATE_LIMIT_MAX_REQUESTS = '75';
        process.env.ANALYZE_RATE_LIMIT_MAX = '15';
        process.env.ENABLE_FILE_LOGGING = 'true';

        const config = getEnvironmentConfig();

        expect(config.HOST).toBe('custom.host.com');
        expect(config.ANALYZE_TIMEOUT_MS).toBe(35000);
        expect(config.CACHE_MAX_ENTRIES).toBe(300);
        expect(config.CACHE_MAX_MEMORY_MB).toBe(150);
        expect(config.BROWSER_POOL_SIZE).toBe(7);
        expect(config.RATE_LIMIT_MAX_REQUESTS).toBe(75);
        expect(config.ANALYZE_RATE_LIMIT_MAX).toBe(15);
        expect(config.ENABLE_FILE_LOGGING).toBe(true);
      });
    });

    describe('Development Environment Configuration', () => {
      it('should use development defaults when NODE_ENV is development', () => {
        // Limpiar variables relevantes para asegurar estado limpio
        delete process.env.BROWSER_POOL_SIZE;
        delete process.env.PORT;
        delete process.env.HOST;
        delete process.env.ANALYZE_TIMEOUT_MS;
        delete process.env.CACHE_MAX_ENTRIES;
        delete process.env.CACHE_MAX_MEMORY_MB;
        delete process.env.RATE_LIMIT_MAX_REQUESTS;
        delete process.env.ANALYZE_RATE_LIMIT_MAX;
        delete process.env.ENABLE_FILE_LOGGING;

        process.env.NODE_ENV = 'development';

        const config = getEnvironmentConfig();

        expect(config.NODE_ENV).toBe('development');
        expect(config.HOST).toBe('127.0.0.1'); // Development default (127.0.0.1 in implementation)
        expect(config.ANALYZE_TIMEOUT_MS).toBe(30000); // Development default
        expect(config.CACHE_MAX_ENTRIES).toBe(100); // Development default
        expect(config.CACHE_MAX_MEMORY_MB).toBe(50); // Development default
        expect(config.BROWSER_POOL_SIZE).toBe(3); // Development default
        expect(config.RATE_LIMIT_MAX_REQUESTS).toBe(100); // Development default
        expect(config.ANALYZE_RATE_LIMIT_MAX).toBe(20); // Development default
        expect(config.ENABLE_FILE_LOGGING).toBe(true); // Development enables file logging
      });
    });

    describe('Custom Environment Configuration', () => {
      it('should handle custom NODE_ENV values', () => {
        // Limpiar variables relevantes para asegurar estado limpio
        delete process.env.BROWSER_POOL_SIZE;
        delete process.env.PORT;
        delete process.env.HOST;
        delete process.env.ANALYZE_TIMEOUT_MS;
        delete process.env.CACHE_MAX_ENTRIES;
        delete process.env.CACHE_MAX_MEMORY_MB;
        delete process.env.RATE_LIMIT_MAX_REQUESTS;
        delete process.env.ANALYZE_RATE_LIMIT_MAX;
        delete process.env.ENABLE_FILE_LOGGING;

        process.env.NODE_ENV = 'staging';

        const config = getEnvironmentConfig();

        expect(config.NODE_ENV).toBe('staging');
        expect(config.HOST).toBe('0.0.0.0'); // Not development, so not localhost
        expect(config.ANALYZE_TIMEOUT_MS).toBe(30000); // Not production, so not 25000
        expect(config.ENABLE_FILE_LOGGING).toBe(false); // Not development, so false
      });

      it('should handle all custom environment variables', () => {
        // Limpiar directamente algunas variables de entorno clave
        delete process.env.REPORTS_API_URL;
        delete process.env.ANALYSIS_API_URL;
        delete process.env.PORT;
        delete process.env.HOST;
        delete process.env.NODE_ENV;

        process.env.PORT = '9000';
        process.env.HOST = 'api.example.com';
        process.env.NODE_ENV = 'testing';
        process.env.ANALYZE_TIMEOUT_MS = '45000';
        process.env.NAVIGATION_TIMEOUT_MS = '8000';
        process.env.WRAP_MARGIN_MS = '5000';
        process.env.CACHE_MAX_ENTRIES = '500';
        process.env.CACHE_MAX_MEMORY_MB = '200';
        process.env.CACHE_TTL_MS = '900000';
        process.env.BROWSER_POOL_SIZE = '10';
        process.env.RATE_LIMIT_WINDOW_MS = '180000';
        process.env.RATE_LIMIT_MAX_REQUESTS = '200';
        process.env.ANALYZE_RATE_LIMIT_MAX = '30';
        process.env.TRUST_PROXY = 'true';
        process.env.CORS_ORIGINS =
          'https://staging.example.com,https://test.example.com';
        process.env.ANALYSIS_API_URL = 'http://analysis.internal:8080';
        process.env.REPORTS_API_URL = 'http://reports.internal:8080';
        process.env.HEALTHCHECK_TIMEOUT_MS = '10000';
        process.env.ENABLE_FILE_LOGGING = 'true';

        const config = getEnvironmentConfig();

        // Verificación individual de cada propiedad para facilitar la depuración
        expect(config.PORT).toBe(9000);
        expect(config.HOST).toBe('api.example.com');
        expect(config.NODE_ENV).toBe('testing');
        expect(config.ANALYZE_TIMEOUT_MS).toBe(45000);
        expect(config.NAVIGATION_TIMEOUT_MS).toBe(8000);
        expect(config.WRAP_MARGIN_MS).toBe(5000);
        expect(config.CACHE_MAX_ENTRIES).toBe(500);
        expect(config.CACHE_MAX_MEMORY_MB).toBe(200);
        expect(config.CACHE_TTL_MS).toBe(900000);
        expect(config.BROWSER_POOL_SIZE).toBe(10);
        expect(config.RATE_LIMIT_WINDOW_MS).toBe(180000);
        expect(config.RATE_LIMIT_MAX_REQUESTS).toBe(200);
        expect(config.ANALYZE_RATE_LIMIT_MAX).toBe(30);
        expect(config.TRUST_PROXY).toBe(true);
        expect(config.CORS_ORIGINS).toEqual([
          'https://staging.example.com',
          'https://test.example.com',
        ]);
        expect(config.ANALYSIS_API_URL).toBe('http://analysis.internal:8080');
        expect(config.REPORTS_API_URL).toBe('http://reports.internal:8080');
        expect(config.HEALTHCHECK_TIMEOUT_MS).toBe(10000);
        expect(config.ENABLE_FILE_LOGGING).toBe(true);

        // Imprimir el valor para depuración
        console.log(
          `REPORTS_API_URL en environment: ${process.env.REPORTS_API_URL}`
        );
        console.log(`REPORTS_API_URL en config: ${config.REPORTS_API_URL}`);
      });
    });

    describe('Edge Cases and Error Handling', () => {
      it('should handle invalid numeric values gracefully', () => {
        process.env.PORT = 'invalid';
        process.env.ANALYZE_TIMEOUT_MS = 'not-a-number';
        process.env.BROWSER_POOL_SIZE = '';

        const config = getEnvironmentConfig();

        expect(config.PORT).toBeNaN();
        expect(config.ANALYZE_TIMEOUT_MS).toBeNaN();
        expect(config.BROWSER_POOL_SIZE).toBeNaN();
      });

      it('should handle boolean-like strings correctly', () => {
        process.env.TRUST_PROXY = '1';
        process.env.ENABLE_FILE_LOGGING = '0';

        const config = getEnvironmentConfig();

        expect(config.TRUST_PROXY).toBe(false); // Only 'true' (case insensitive) should be true
        expect(config.ENABLE_FILE_LOGGING).toBe(false);
      });

      it('should handle malformed CORS_ORIGINS gracefully', () => {
        process.env.CORS_ORIGINS = 'invalid,, , ,valid-origin';

        const config = getEnvironmentConfig();

        expect(config.CORS_ORIGINS).toEqual(['invalid', 'valid-origin']);
      });
    });
  });

  describe('FeatureFlags', () => {
    describe('Environment Detection', () => {
      it('should detect production environment', () => {
        process.env.NODE_ENV = 'production';
        expect(FeatureFlags.isProduction()).toBe(true);
        expect(FeatureFlags.isDevelopment()).toBe(false);
        expect(FeatureFlags.isTest()).toBe(false);
      });

      it('should detect development environment', () => {
        process.env.NODE_ENV = 'development';
        expect(FeatureFlags.isProduction()).toBe(false);
        expect(FeatureFlags.isDevelopment()).toBe(true);
        expect(FeatureFlags.isTest()).toBe(false);
      });

      it('should detect test environment', () => {
        process.env.NODE_ENV = 'test';
        expect(FeatureFlags.isProduction()).toBe(false);
        expect(FeatureFlags.isDevelopment()).toBe(false);
        expect(FeatureFlags.isTest()).toBe(true);
      });

      it('should handle undefined NODE_ENV', () => {
        delete process.env.NODE_ENV;
        expect(FeatureFlags.isProduction()).toBe(false);
        expect(FeatureFlags.isDevelopment()).toBe(false);
        expect(FeatureFlags.isTest()).toBe(false);
      });
    });

    describe('Performance Features', () => {
      it('should enable caching by default', () => {
        delete process.env.ENABLE_CACHING;
        expect(FeatureFlags.enableCaching()).toBe(true);
      });

      it('should disable caching when explicitly set to false', () => {
        process.env.ENABLE_CACHING = 'false';
        expect(FeatureFlags.enableCaching()).toBe(false);
      });

      it('should enable caching when explicitly set to true', () => {
        process.env.ENABLE_CACHING = 'true';
        expect(FeatureFlags.enableCaching()).toBe(true);
      });

      it('should handle case-insensitive caching flag', () => {
        process.env.ENABLE_CACHING = 'TRUE';
        expect(FeatureFlags.enableCaching()).toBe(true);

        process.env.ENABLE_CACHING = 'False';
        expect(FeatureFlags.enableCaching()).toBe(false);
      });

      it('should enable metrics by default', () => {
        delete process.env.ENABLE_METRICS;
        expect(FeatureFlags.enableMetrics()).toBe(true);
      });

      it('should handle metrics flag correctly', () => {
        process.env.ENABLE_METRICS = 'false';
        expect(FeatureFlags.enableMetrics()).toBe(false);

        process.env.ENABLE_METRICS = 'true';
        expect(FeatureFlags.enableMetrics()).toBe(true);
      });

      it('should enable deep health checks by default', () => {
        delete process.env.ENABLE_DEEP_HEALTH;
        expect(FeatureFlags.enableDeepHealthChecks()).toBe(true);
      });

      it('should handle deep health checks flag correctly', () => {
        process.env.ENABLE_DEEP_HEALTH = 'false';
        expect(FeatureFlags.enableDeepHealthChecks()).toBe(false);

        process.env.ENABLE_DEEP_HEALTH = 'true';
        expect(FeatureFlags.enableDeepHealthChecks()).toBe(true);
      });
    });

    describe('Security Features', () => {
      it('should enforce rate limit by default', () => {
        delete process.env.ENFORCE_RATE_LIMIT;
        expect(FeatureFlags.enforceRateLimit()).toBe(true);
      });

      it('should handle rate limit enforcement flag correctly', () => {
        process.env.ENFORCE_RATE_LIMIT = 'false';
        expect(FeatureFlags.enforceRateLimit()).toBe(false);

        process.env.ENFORCE_RATE_LIMIT = 'true';
        expect(FeatureFlags.enforceRateLimit()).toBe(true);
      });

      it('should enable SSRF protection by default', () => {
        delete process.env.ENABLE_SSRF_PROTECTION;
        expect(FeatureFlags.enableSSRFProtection()).toBe(true);
      });

      it('should handle SSRF protection flag correctly', () => {
        process.env.ENABLE_SSRF_PROTECTION = 'false';
        expect(FeatureFlags.enableSSRFProtection()).toBe(false);

        process.env.ENABLE_SSRF_PROTECTION = 'true';
        expect(FeatureFlags.enableSSRFProtection()).toBe(true);
      });
    });

    describe('Development Features', () => {
      it('should disable verbose logging by default', () => {
        delete process.env.VERBOSE_LOGGING;
        expect(FeatureFlags.verboseLogging()).toBe(false);
      });

      it('should handle verbose logging flag correctly', () => {
        process.env.VERBOSE_LOGGING = 'true';
        expect(FeatureFlags.verboseLogging()).toBe(true);

        process.env.VERBOSE_LOGGING = 'false';
        expect(FeatureFlags.verboseLogging()).toBe(false);
      });

      it('should disable playwright debug by default', () => {
        delete process.env.PLAYWRIGHT_DEBUG;
        expect(FeatureFlags.enablePlaywrightDebug()).toBe(false);
      });

      it('should handle playwright debug flag correctly', () => {
        process.env.PLAYWRIGHT_DEBUG = 'true';
        expect(FeatureFlags.enablePlaywrightDebug()).toBe(true);

        process.env.PLAYWRIGHT_DEBUG = 'false';
        expect(FeatureFlags.enablePlaywrightDebug()).toBe(false);
      });
    });

    describe('Feature Flag Edge Cases', () => {
      it('should handle case-insensitive feature flags', () => {
        process.env.VERBOSE_LOGGING = 'TRUE';
        expect(FeatureFlags.verboseLogging()).toBe(true);

        process.env.VERBOSE_LOGGING = 'False';
        expect(FeatureFlags.verboseLogging()).toBe(false);

        process.env.VERBOSE_LOGGING = 'tRuE';
        expect(FeatureFlags.verboseLogging()).toBe(true);
      });

      it('should treat non-true values as false', () => {
        process.env.VERBOSE_LOGGING = '1';
        expect(FeatureFlags.verboseLogging()).toBe(false);

        process.env.VERBOSE_LOGGING = 'yes';
        expect(FeatureFlags.verboseLogging()).toBe(false);

        process.env.VERBOSE_LOGGING = 'on';
        expect(FeatureFlags.verboseLogging()).toBe(false);
      });
    });
  });

  describe('ENV Singleton', () => {
    it('should export environment configuration as singleton', () => {
      expect(ENV).toBeDefined();
      expect(typeof ENV).toBe('object');
      expect(ENV).toHaveProperty('PORT');
      expect(ENV).toHaveProperty('NODE_ENV');
      expect(ENV).toHaveProperty('ANALYZE_TIMEOUT_MS');
    });

    it('should have consistent structure with EnvironmentConfig interface', () => {
      expect(ENV).toHaveProperty('PORT');
      expect(ENV).toHaveProperty('HOST');
      expect(ENV).toHaveProperty('NODE_ENV');
      expect(ENV).toHaveProperty('ANALYZE_TIMEOUT_MS');
      expect(ENV).toHaveProperty('NAVIGATION_TIMEOUT_MS');
      expect(ENV).toHaveProperty('WRAP_MARGIN_MS');
      expect(ENV).toHaveProperty('CACHE_MAX_ENTRIES');
      expect(ENV).toHaveProperty('CACHE_MAX_MEMORY_MB');
      expect(ENV).toHaveProperty('CACHE_TTL_MS');
      expect(ENV).toHaveProperty('BROWSER_POOL_SIZE');
      expect(ENV).toHaveProperty('RATE_LIMIT_WINDOW_MS');
      expect(ENV).toHaveProperty('RATE_LIMIT_MAX_REQUESTS');
      expect(ENV).toHaveProperty('ANALYZE_RATE_LIMIT_MAX');
      expect(ENV).toHaveProperty('TRUST_PROXY');
      expect(ENV).toHaveProperty('CORS_ORIGINS');
      expect(ENV).toHaveProperty('ANALYSIS_API_URL');
      expect(ENV).toHaveProperty('HEALTHCHECK_TIMEOUT_MS');
      expect(ENV).toHaveProperty('ENABLE_FILE_LOGGING');
    });

    it('should have correct types for all properties', () => {
      expect(typeof ENV.PORT).toBe('number');
      expect(typeof ENV.HOST).toBe('string');
      expect(typeof ENV.NODE_ENV).toBe('string');
      expect(typeof ENV.ANALYZE_TIMEOUT_MS).toBe('number');
      expect(typeof ENV.NAVIGATION_TIMEOUT_MS).toBe('number');
      expect(typeof ENV.WRAP_MARGIN_MS).toBe('number');
      expect(typeof ENV.CACHE_MAX_ENTRIES).toBe('number');
      expect(typeof ENV.CACHE_MAX_MEMORY_MB).toBe('number');
      expect(typeof ENV.CACHE_TTL_MS).toBe('number');
      expect(typeof ENV.BROWSER_POOL_SIZE).toBe('number');
      expect(typeof ENV.RATE_LIMIT_WINDOW_MS).toBe('number');
      expect(typeof ENV.RATE_LIMIT_MAX_REQUESTS).toBe('number');
      expect(typeof ENV.ANALYZE_RATE_LIMIT_MAX).toBe('number');
      expect(typeof ENV.TRUST_PROXY).toBe('boolean');
      expect(Array.isArray(ENV.CORS_ORIGINS)).toBe(true);
      expect(typeof ENV.ANALYSIS_API_URL).toBe('string');
      expect(typeof ENV.HEALTHCHECK_TIMEOUT_MS).toBe('number');
      expect(typeof ENV.ENABLE_FILE_LOGGING).toBe('boolean');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle mixed environment configurations correctly', () => {
      delete process.env.HOST; // Limpiar para usar defaults
      process.env.NODE_ENV = 'production';
      process.env.PORT = '443';
      process.env.ENABLE_FILE_LOGGING = 'true'; // Override production default
      process.env.CORS_ORIGINS = 'https://app.example.com';
      process.env.VERBOSE_LOGGING = 'true';

      const config = getEnvironmentConfig();

      expect(config.NODE_ENV).toBe('production');
      expect(config.PORT).toBe(443);
      expect(config.HOST).toBe('0.0.0.0'); // Production default
      expect(config.ANALYZE_TIMEOUT_MS).toBe(25000); // Production default
      expect(config.ENABLE_FILE_LOGGING).toBe(true); // Override
      expect(config.CORS_ORIGINS).toEqual(['https://app.example.com']);
      expect(FeatureFlags.isProduction()).toBe(true);
      expect(FeatureFlags.verboseLogging()).toBe(true);
    });

    it('should handle development with custom overrides', () => {
      delete process.env.HOST; // Limpiar para usar defaults
      process.env.NODE_ENV = 'development';
      process.env.BROWSER_POOL_SIZE = '1'; // Override for development
      process.env.ENABLE_METRICS = 'false';
      process.env.CORS_ORIGINS = 'http://localhost:3000,http://localhost:3001';

      const config = getEnvironmentConfig();

      expect(config.NODE_ENV).toBe('development');
      expect(config.BROWSER_POOL_SIZE).toBe(1); // Override
      expect(config.HOST).toBe('127.0.0.1'); // Development default
      expect(config.ENABLE_FILE_LOGGING).toBe(true); // Development default
      expect(config.CORS_ORIGINS).toEqual([
        'http://localhost:3000',
        'http://localhost:3001',
      ]);
      expect(FeatureFlags.isDevelopment()).toBe(true);
      expect(FeatureFlags.enableMetrics()).toBe(false);
    });
  });
});
