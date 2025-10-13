import { z } from 'zod';

/**
 * JWT Configuration Schema
 * Validates JWT environment variables with strict requirements
 */
const jwtConfigSchema = z.object({
  secretKey: z
    .string()
    .min(32, 'JWT Secret Key must be at least 32 characters for security')
    .describe('Secret key for signing JWT tokens'),
  issuer: z
    .string()
    .url('JWT Issuer must be a valid URL')
    .describe('JWT token issuer (iss claim)'),
  audience: z
    .string()
    .url('JWT Audience must be a valid URL')
    .describe('JWT token audience (aud claim)'),
  expiryHours: z
    .number()
    .int()
    .positive()
    .default(24)
    .describe('Token expiration time in hours'),
  clockTolerance: z
    .number()
    .int()
    .nonnegative()
    .default(0)
    .describe('Clock skew tolerance in seconds'),
});

export type JwtConfig = z.infer<typeof jwtConfigSchema>;

/**
 * Load and validate JWT configuration from environment variables
 * Throws error if configuration is invalid or missing
 */
export function loadJwtConfig(): JwtConfig {
  const rawConfig = {
    secretKey: process.env.JWT_SECRET_KEY,
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
    expiryHours: process.env.JWT_EXPIRY_HOURS
      ? parseInt(process.env.JWT_EXPIRY_HOURS, 10)
      : 24,
    clockTolerance: process.env.JWT_CLOCK_TOLERANCE
      ? parseInt(process.env.JWT_CLOCK_TOLERANCE, 10)
      : 0,
  };

  try {
    return jwtConfigSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map(
        (e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`
      );
      throw new Error(
        `JWT Configuration Error:\n${messages.join('\n')}\n\n` +
          'Please check your environment variables:\n' +
          '- JWT_SECRET_KEY (required, min 32 chars)\n' +
          '- JWT_ISSUER (required, must be valid URL)\n' +
          '- JWT_AUDIENCE (required, must be valid URL)\n' +
          '- JWT_EXPIRY_HOURS (optional, default: 24)\n' +
          '- JWT_CLOCK_TOLERANCE (optional, default: 0)'
      );
    }
    throw error;
  }
}

/**
 * Check if JWT authentication is enabled
 * Returns true if all required JWT environment variables are present
 */
export function isJwtEnabled(): boolean {
  return !!(
    process.env.JWT_SECRET_KEY &&
    process.env.JWT_ISSUER &&
    process.env.JWT_AUDIENCE
  );
}

/**
 * Global JWT configuration instance
 * Lazy-loaded on first access
 */
let jwtConfigInstance: JwtConfig | null = null;

/**
 * Get JWT configuration singleton
 * Throws error if JWT is not properly configured
 */
export function getJwtConfig(): JwtConfig {
  if (!jwtConfigInstance) {
    if (!isJwtEnabled()) {
      throw new Error(
        'JWT Authentication is not configured. ' +
          'Set JWT_SECRET_KEY, JWT_ISSUER, and JWT_AUDIENCE environment variables.'
      );
    }
    jwtConfigInstance = loadJwtConfig();
  }
  return jwtConfigInstance;
}

/**
 * Reset JWT configuration (useful for testing)
 */
export function resetJwtConfig(): void {
  jwtConfigInstance = null;
}
