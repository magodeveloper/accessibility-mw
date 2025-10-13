/**
 * Gateway Secret Validation Middleware
 *
 * Este middleware valida que las peticiones provengan del Gateway verificando
 * el header X-Gateway-Secret. Esto previene el acceso directo al servicio
 * bypasseando el Gateway.
 *
 * Implementación equivalente a los microservicios .NET:
 * - Analysis API: GatewaySecretValidationMiddleware
 * - Reports API: GatewaySecretValidationMiddleware
 * - Users API: GatewaySecretValidationMiddleware
 *
 * ORDEN DE MIDDLEWARES (crítico):
 * 1. validateGatewaySecret (PRIMERO - valida origen)
 * 2. authenticateJWT (SEGUNDO - valida usuario)
 * 3. Rate limiting (TERCERO - previene abuso)
 * 4. Business logic (ÚLTIMO - lógica de negocio)
 */

import { NextFunction, Request, Response } from 'express';
import {
  GATEWAY_SECRET_HEADER,
  isGatewayValidationEnabled,
  validateSecret,
} from '../config/gateway.config';
import { advancedLogger } from '../services/logging.service';

/**
 * Interfaz extendida de Request con información de contexto
 */
export interface GatewayValidatedRequest extends Request {
  gatewayValidated?: boolean; // Indica si fue validado por el Gateway
}

/**
 * Middleware principal para validar el Gateway Secret
 *
 * Flujo:
 * 1. Verificar si la validación está habilitada
 * 2. Extraer X-Gateway-Secret header
 * 3. Validar que coincida con el secret configurado
 * 4. Si es válido: continuar (next())
 * 5. Si es inválido: retornar 403 Forbidden
 *
 * @param {Request} req - Request de Express
 * @param {Response} res - Response de Express
 * @param {NextFunction} next - Función next() para continuar
 */
export function validateGatewaySecret(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = String(
    (req as GatewayValidatedRequest & { id?: string | number }).id || 'unknown'
  );

  // Si la validación está deshabilitada (ej: desarrollo local)
  if (!isGatewayValidationEnabled()) {
    advancedLogger.debug('Gateway validation disabled - skipping validation', {
      requestId,
      path: req.path,
      method: req.method,
    });
    return next();
  }

  // Extraer el header X-Gateway-Secret (case-insensitive)
  const providedSecret = req.get(GATEWAY_SECRET_HEADER);

  // Si no hay header
  if (!providedSecret) {
    advancedLogger.warn('Gateway secret validation failed - Missing header', {
      requestId,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      code: 'MISSING_GATEWAY_SECRET',
    });

    res.status(403).json({
      error: 'Forbidden',
      message: `Missing required header: ${GATEWAY_SECRET_HEADER}. Direct access to this service is not allowed.`,
      code: 'MISSING_GATEWAY_SECRET',
      requestId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Validar el secret
  const isValid = validateSecret(providedSecret);

  if (!isValid) {
    advancedLogger.warn('Gateway secret validation failed - Invalid secret', {
      requestId,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      providedSecretLength: providedSecret.length,
      code: 'INVALID_GATEWAY_SECRET',
    });

    res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid gateway secret. Access denied.',
      code: 'INVALID_GATEWAY_SECRET',
      requestId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Secret válido - continuar
  advancedLogger.debug('Gateway secret validated successfully', {
    requestId,
    path: req.path,
    method: req.method,
  });

  next();
}

/**
 * Middleware opcional para validar el Gateway Secret
 *
 * Similar a validateGatewaySecret pero no bloquea si falla.
 * Útil para rutas que pueden ser accedidas directamente o a través del Gateway.
 *
 * Agrega una propiedad `gatewayValidated: boolean` al request.
 *
 * @param {Request} req - Request de Express
 * @param {Response} res - Response de Express
 * @param {NextFunction} next - Función next() para continuar
 */
export function optionalValidateGatewaySecret(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = String(
    (req as GatewayValidatedRequest & { id?: string | number }).id || 'unknown'
  );

  // Si está deshabilitado
  if (!isGatewayValidationEnabled()) {
    (
      req as GatewayValidatedRequest & { gatewayValidated?: boolean }
    ).gatewayValidated = true;
    return next();
  }

  // Extraer y validar secret
  const providedSecret = req.get(GATEWAY_SECRET_HEADER);
  const isValid = providedSecret ? validateSecret(providedSecret) : false;

  // Marcar si vino del Gateway o no
  (
    req as GatewayValidatedRequest & { gatewayValidated?: boolean }
  ).gatewayValidated = isValid;

  if (isValid) {
    advancedLogger.debug('Optional gateway validation - Valid secret', {
      requestId,
      path: req.path,
    });
  } else {
    advancedLogger.debug(
      'Optional gateway validation - Invalid or missing secret',
      {
        requestId,
        path: req.path,
        reason: providedSecret ? 'invalid' : 'missing',
      }
    );
  }

  next();
}

/**
 * Helper para verificar si un request fue validado por el Gateway
 *
 * @param {Request} req - Request de Express
 * @returns {boolean} true si fue validado, false en caso contrario
 */
export function isFromGateway(req: Request): boolean {
  return (
    (req as GatewayValidatedRequest & { gatewayValidated?: boolean })
      .gatewayValidated === true
  );
}

/**
 * Middleware para REQUERIR que la petición venga del Gateway
 *
 * Debe usarse DESPUÉS de optionalValidateGatewaySecret.
 * Si la petición no viene del Gateway, retorna 403.
 *
 * Útil para endpoints que DEBEN ser accedidos solo a través del Gateway.
 *
 * @param {Request} req - Request de Express
 * @param {Response} res - Response de Express
 * @param {NextFunction} next - Función next() para continuar
 */
export function requireGateway(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = String(
    (req as GatewayValidatedRequest & { id?: string | number }).id || 'unknown'
  );

  if (!isFromGateway(req)) {
    advancedLogger.warn('Gateway required but request not from Gateway', {
      requestId,
      path: req.path,
      method: req.method,
      ip: req.ip,
      code: 'GATEWAY_REQUIRED',
    });

    res.status(403).json({
      error: 'Forbidden',
      message: 'This endpoint can only be accessed through the Gateway.',
      code: 'GATEWAY_REQUIRED',
      requestId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
}

/**
 * Middleware para logging de información del Gateway
 *
 * Log adicional si la petición viene del Gateway.
 * Útil para debugging y auditoría.
 *
 * @param {Request} req - Request de Express
 * @param {Response} res - Response de Express
 * @param {NextFunction} next - Función next() para continuar
 */
export function logGatewayInfo(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = String(
    (req as GatewayValidatedRequest & { id?: string | number }).id || 'unknown'
  );
  const fromGateway = isFromGateway(req);

  advancedLogger.info('Gateway validation info', {
    requestId,
    fromGateway,
    path: req.path,
    method: req.method,
    hasGatewayHeader: !!req.get(GATEWAY_SECRET_HEADER),
  });

  next();
}

export default {
  validateGatewaySecret,
  optionalValidateGatewaySecret,
  requireGateway,
  isFromGateway,
  logGatewayInfo,
  GATEWAY_SECRET_HEADER,
};
