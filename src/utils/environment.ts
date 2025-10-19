/**
 * Environment configuration utilities
 * Centralizes environment variable parsing with type safety and defaults
 */

export interface EnvironmentConfig {
  // Server Configuration
  PORT: number;
  HOST: string;
  NODE_ENV: string;

  // Performance & Timeouts
  ANALYZE_TIMEOUT_MS: number;
  NAVIGATION_TIMEOUT_MS: number;
  WRAP_MARGIN_MS: number;

  // Cache Configuration
  CACHE_MAX_ENTRIES: number;
  CACHE_MAX_MEMORY_MB: number;
  CACHE_TTL_MS: number;

  // Browser Pool
  BROWSER_POOL_SIZE: number;

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  ANALYZE_RATE_LIMIT_MAX: number;

  // Security
  TRUST_PROXY: boolean;
  CORS_ORIGINS: string[];

  // External Services
  ANALYSIS_API_URL: string;
  REPORTS_API_URL: string;

  // Health Checks
  HEALTHCHECK_TIMEOUT_MS: number;

  // Logging
  ENABLE_FILE_LOGGING: boolean;
}

/**
 * Parse and validate environment variables with defaults
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const isProd = process.env.NODE_ENV === 'production';
  const isDev = process.env.NODE_ENV === 'development';

  return {
    // Server Configuration
    PORT: parseInt(process.env.PORT ?? '3001', 10),
    HOST: process.env.HOST ?? (isDev ? '127.0.0.1' : '0.0.0.0'),
    NODE_ENV: process.env.NODE_ENV ?? 'development',

    // Performance & Timeouts - Optimized values
    ANALYZE_TIMEOUT_MS: parseInt(
      process.env.ANALYZE_TIMEOUT_MS ?? (isProd ? '25000' : '30000'),
      10
    ),
    NAVIGATION_TIMEOUT_MS: parseInt(
      process.env.NAVIGATION_TIMEOUT_MS ?? '12000',
      10
    ),
    WRAP_MARGIN_MS: parseInt(process.env.WRAP_MARGIN_MS ?? '3000', 10),

    // Cache Configuration - Optimized for performance
    CACHE_MAX_ENTRIES: parseInt(
      process.env.CACHE_MAX_ENTRIES ?? (isProd ? '200' : '100'),
      10
    ),
    CACHE_MAX_MEMORY_MB: parseInt(
      process.env.CACHE_MAX_MEMORY_MB ?? (isProd ? '100' : '50'),
      10
    ),
    CACHE_TTL_MS: parseInt(process.env.CACHE_TTL_MS ?? '300000', 10), // 5 minutes

    // Browser Pool - Adjusted for load
    BROWSER_POOL_SIZE: parseInt(
      process.env.BROWSER_POOL_SIZE ?? (isProd ? '5' : '3'),
      10
    ),

    // Rate Limiting - More restrictive in production
    RATE_LIMIT_WINDOW_MS: parseInt(
      process.env.RATE_LIMIT_WINDOW_MS ?? '60000',
      10
    ),
    RATE_LIMIT_MAX_REQUESTS: parseInt(
      process.env.RATE_LIMIT_MAX_REQUESTS ?? (isProd ? '50' : '100'),
      10
    ),
    ANALYZE_RATE_LIMIT_MAX: parseInt(
      process.env.ANALYZE_RATE_LIMIT_MAX ?? (isProd ? '10' : '20'),
      10
    ),

    // Security
    TRUST_PROXY: (process.env.TRUST_PROXY ?? 'false').toLowerCase() === 'true',
    CORS_ORIGINS: (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),

    // External Services
    ANALYSIS_API_URL: process.env.ANALYSIS_API_URL ?? 'http://localhost:8082',
    REPORTS_API_URL: process.env.REPORTS_API_URL ?? 'http://localhost:8083',

    // Health Checks
    HEALTHCHECK_TIMEOUT_MS: parseInt(
      process.env.HEALTHCHECK_TIMEOUT_MS ?? '15000',
      10
    ),

    // Logging
    ENABLE_FILE_LOGGING:
      (process.env.ENABLE_FILE_LOGGING ?? 'false').toLowerCase() === 'true' ||
      isDev,
  };
}

/**
 * Environment-specific feature flags
 */
export const FeatureFlags = {
  isProduction: () => process.env.NODE_ENV === 'production',
  isDevelopment: () => process.env.NODE_ENV === 'development',
  isTest: () => process.env.NODE_ENV === 'test',

  // Performance features
  enableCaching: () =>
    (process.env.ENABLE_CACHING ?? 'true').toLowerCase() === 'true',
  enableMetrics: () =>
    (process.env.ENABLE_METRICS ?? 'true').toLowerCase() === 'true',
  enableDeepHealthChecks: () =>
    (process.env.ENABLE_DEEP_HEALTH ?? 'true').toLowerCase() === 'true',

  // Security features
  enforceRateLimit: () =>
    (process.env.ENFORCE_RATE_LIMIT ?? 'true').toLowerCase() === 'true',
  enableSSRFProtection: () =>
    (process.env.ENABLE_SSRF_PROTECTION ?? 'true').toLowerCase() === 'true',

  // Development features
  verboseLogging: () =>
    (process.env.VERBOSE_LOGGING ?? 'false').toLowerCase() === 'true',
  enablePlaywrightDebug: () =>
    (process.env.PLAYWRIGHT_DEBUG ?? 'false').toLowerCase() === 'true',
};

// Export singleton instance
export const ENV = getEnvironmentConfig();
