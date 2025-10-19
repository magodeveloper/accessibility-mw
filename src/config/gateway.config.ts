/**
 * Gateway Secret Configuration
 *
 * Este módulo gestiona la configuración del Gateway Secret,
 * que es usado para validar que las peticiones provienen del Gateway
 * y no directamente de clientes externos.
 *
 * Coincide con el patrón implementado en los microservicios .NET:
 * - Analysis API
 * - Reports API
 * - Users API
 */

import { z, ZodIssue } from 'zod';
import { advancedLogger } from '../services/logging.service';

/**
 * Configuración del Gateway Secret
 */
export interface GatewayConfig {
  /**
   * Secret compartido entre Gateway y servicios
   * Debe ser una cadena aleatoria fuerte (mínimo 32 caracteres)
   */
  secret: string;

  /**
   * Indica si la validación está habilitada
   * En desarrollo puede deshabilitarse para facilitar testing
   */
  enabled: boolean;
}

/**
 * Schema Zod para validar la configuración del Gateway
 */
const gatewayConfigSchema = z.object({
  secret: z.string().min(32, {
    message:
      'GATEWAY_SECRET debe tener al menos 32 caracteres para seguridad adecuada',
  }),
  enabled: z.boolean().default(true),
});

/**
 * Variables de entorno requeridas para Gateway Secret
 */
const REQUIRED_ENV_VARS = {
  secret: 'GATEWAY_SECRET',
  enabled: 'GATEWAY_VALIDATION_ENABLED',
} as const;

/**
 * Caché de configuración (singleton)
 */
let cachedConfig: GatewayConfig | null = null;

/**
 * Carga y valida la configuración del Gateway desde variables de entorno
 *
 * @returns {GatewayConfig} Configuración validada del Gateway
 * @throws {Error} Si la configuración es inválida o faltan variables requeridas
 */
export function loadGatewayConfig(): GatewayConfig {
  const secret = process.env[REQUIRED_ENV_VARS.secret];
  const enabled = process.env[REQUIRED_ENV_VARS.enabled];

  // Parsear enabled como boolean
  const enabledBool = enabled === 'true' || enabled === '1';

  // Si está deshabilitado, no validamos el secret
  if (!enabledBool) {
    advancedLogger.warn(
      '⚠️  Gateway Secret validation is DISABLED - requests will not be validated'
    );
    return {
      secret: secret || '',
      enabled: false,
    };
  }

  // Si está habilitado, validar que exista el secret
  if (!secret) {
    const errorMessage = `Missing required environment variable: ${REQUIRED_ENV_VARS.secret}`;
    advancedLogger.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Validar configuración con Zod
  try {
    const config = gatewayConfigSchema.parse({
      secret,
      enabled: enabledBool,
    });

    advancedLogger.info('✅ Gateway Secret configuration loaded successfully');
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues
        .map(
          (issue: ZodIssue) => `  - ${issue.path.join('.')}: ${issue.message}`
        )
        .join('\n');

      const fullError = `Invalid Gateway configuration:\n${errorMessages}`;
      advancedLogger.error(fullError);
      throw new Error(fullError);
    }
    throw error;
  }
}

/**
 * Verifica si la validación del Gateway Secret está habilitada
 *
 * @returns {boolean} true si está habilitado, false en caso contrario
 */
export function isGatewayValidationEnabled(): boolean {
  const enabled = process.env[REQUIRED_ENV_VARS.enabled];
  return enabled === 'true' || enabled === '1';
}

/**
 * Obtiene la configuración del Gateway (usa caché)
 *
 * @returns {GatewayConfig} Configuración del Gateway
 * @throws {Error} Si la configuración no puede cargarse
 */
export function getGatewayConfig(): GatewayConfig {
  if (!cachedConfig) {
    cachedConfig = loadGatewayConfig();
  }
  return cachedConfig;
}

/**
 * Limpia el caché de configuración
 * Útil para testing o recarga de configuración
 */
export function resetGatewayConfig(): void {
  cachedConfig = null;
}

/**
 * Valida que un secret proporcionado coincida con el configurado
 *
 * @param {string} providedSecret - Secret proporcionado en el header
 * @returns {boolean} true si coincide, false en caso contrario
 */
export function validateSecret(providedSecret: string): boolean {
  if (!isGatewayValidationEnabled()) {
    return true; // Si está deshabilitado, siempre válido
  }

  const config = getGatewayConfig();

  // Comparación segura contra timing attacks
  // En Node.js, usar crypto.timingSafeEqual es más seguro
  // pero requiere buffers del mismo tamaño

  if (!providedSecret || providedSecret.length !== config.secret.length) {
    return false;
  }

  // Comparación simple (para producción considerar crypto.timingSafeEqual)
  return providedSecret === config.secret;
}

/**
 * Obtiene el nombre del header donde se espera el Gateway Secret
 */
export const GATEWAY_SECRET_HEADER = 'x-gateway-secret';

export default {
  loadGatewayConfig,
  isGatewayValidationEnabled,
  getGatewayConfig,
  resetGatewayConfig,
  validateSecret,
  GATEWAY_SECRET_HEADER,
};
