/**
 * User Context Extraction Middleware
 *
 * Este middleware extrae la información de usuario de los headers del Gateway
 * y la almacena en el contexto del request usando AsyncLocalStorage.
 *
 * Headers extraídos del Gateway:
 * - X-User-Id: ID único del usuario
 * - X-User-Email: Email del usuario
 * - X-User-Role: Rol del usuario (Admin, User, Guest, etc.)
 * - X-User-Name: Nombre completo del usuario
 *
 * Implementación equivalente a los microservicios .NET:
 * - Analysis API: UserContextMiddleware
 * - Reports API: UserContextMiddleware
 * - Users API: UserContextMiddleware
 *
 * ORDEN DE MIDDLEWARES (crítico):
 * 1. validateGatewaySecret (valida origen)
 * 2. authenticateJWT (valida usuario)
 * 3. extractUserContext (AQUÍ - extrae contexto de usuario)
 * 4. Rate limiting
 * 5. Business logic
 */

import { NextFunction, Request, Response } from 'express';
import { advancedLogger } from '../services/logging.service';
import {
  USER_CONTEXT_HEADERS,
  UserContext,
  userContextService,
} from '../services/user-context.service';

/**
 * Interfaz extendida de Request con información de contexto
 */
export interface UserContextRequest extends Request {
  userContext?: UserContext;
}

/**
 * Middleware principal para extraer el contexto de usuario
 *
 * Flujo:
 * 1. Extraer headers X-User-* del Gateway
 * 2. Validar que al menos uno existe
 * 3. Crear objeto UserContext
 * 4. Almacenar en AsyncLocalStorage
 * 5. Adjuntar al request para acceso directo
 * 6. Log de evento
 * 7. Continuar (next())
 *
 * @param {Request} req - Request de Express
 * @param {Response} res - Response de Express
 * @param {NextFunction} next - Función next() para continuar
 */
export function extractUserContext(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = String(
    (req as UserContextRequest & { id?: string | number }).id || 'unknown'
  );

  // Extraer headers del Gateway (case-insensitive)
  const userId = req.get(USER_CONTEXT_HEADERS.userId);
  const email = req.get(USER_CONTEXT_HEADERS.email);
  const role = req.get(USER_CONTEXT_HEADERS.role);
  const name = req.get(USER_CONTEXT_HEADERS.name);

  // Crear contexto de usuario
  const userContext: UserContext = {
    userId,
    email,
    role,
    name,
    extractedAt: new Date(),
    requestId,
  };

  // Verificar si hay al menos un header de usuario
  const hasUserInfo = userId || email || role || name;

  if (hasUserInfo) {
    // Almacenar en AsyncLocalStorage para acceso global
    userContextService.run(userContext, () => {
      // Adjuntar al request para acceso directo
      (req as UserContextRequest).userContext = userContext;

      advancedLogger.debug('User context extracted successfully', {
        requestId,
        userId,
        email,
        role,
        name,
        hasUserId: !!userId,
        hasEmail: !!email,
        hasRole: !!role,
        hasName: !!name,
      });

      // Continuar con el contexto establecido
      next();
    });
  } else {
    // No hay información de usuario en los headers
    advancedLogger.debug(
      'No user context headers found - continuing without user context',
      {
        requestId,
        path: req.path,
        method: req.method,
      }
    );

    // Continuar sin contexto de usuario (request anónimo o sin Gateway)
    next();
  }
}

/**
 * Middleware para REQUERIR que exista contexto de usuario
 *
 * Debe usarse DESPUÉS de extractUserContext.
 * Si no hay contexto de usuario, retorna 403.
 *
 * Útil para endpoints que REQUIEREN información de usuario.
 *
 * @param {Request} req - Request de Express
 * @param {Response} res - Response de Express
 * @param {NextFunction} next - Función next() para continuar
 */
export function requireUserContext(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = String(
    (req as UserContextRequest & { id?: string | number }).id || 'unknown'
  );
  const context = userContextService.getContext();

  if (!context?.userId) {
    advancedLogger.warn('User context required but not found', {
      requestId,
      path: req.path,
      method: req.method,
      ip: req.ip,
      code: 'USER_CONTEXT_REQUIRED',
    });

    res.status(403).json({
      error: 'Forbidden',
      message:
        'User context is required. This endpoint can only be accessed with user information.',
      code: 'USER_CONTEXT_REQUIRED',
      requestId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
}

/**
 * Middleware para REQUERIR un rol específico
 *
 * Debe usarse DESPUÉS de extractUserContext.
 * Verifica que el usuario tenga el rol requerido.
 *
 * @param {...string} allowedRoles - Roles permitidos
 * @returns {Function} Middleware de Express
 */
export function requireUserRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = String(
      (req as UserContextRequest & { id?: string | number }).id || 'unknown'
    );
    const context = userContextService.getContext();

    if (!context?.role) {
      advancedLogger.warn('User role required but not found in context', {
        requestId,
        path: req.path,
        method: req.method,
        requiredRoles: allowedRoles,
        code: 'USER_ROLE_REQUIRED',
      });

      res.status(403).json({
        error: 'Forbidden',
        message: 'User role information is required.',
        code: 'USER_ROLE_REQUIRED',
        requestId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Verificar si el usuario tiene alguno de los roles permitidos
    const hasRequiredRole = userContextService.hasAnyRole(allowedRoles);

    if (!hasRequiredRole) {
      advancedLogger.warn('User does not have required role', {
        requestId,
        path: req.path,
        method: req.method,
        userId: context.userId,
        userRole: context.role,
        requiredRoles: allowedRoles,
        code: 'INSUFFICIENT_ROLE',
      });

      res.status(403).json({
        error: 'Forbidden',
        message: `Insufficient permissions. Required roles: ${allowedRoles.join(
          ', '
        )}`,
        code: 'INSUFFICIENT_ROLE',
        requestId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    advancedLogger.debug('User role verified successfully', {
      requestId,
      userId: context.userId,
      userRole: context.role,
      requiredRoles: allowedRoles,
    });

    next();
  };
}

/**
 * Middleware para enriquecer logs con información de usuario
 *
 * Agrega automáticamente información de usuario a todos los logs
 * que ocurran durante el procesamiento del request.
 *
 * @param {Request} req - Request de Express
 * @param {Response} res - Response de Express
 * @param {NextFunction} next - Función next() para continuar
 */
export function enrichLogsWithUserContext(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const context = userContextService.getContext();

  if (context?.userId) {
    // Crear child logger con contexto de usuario
    const contextLogger = userContextService.createContextLogger();

    // Adjuntar al request para que otros middlewares lo usen
    (req as UserContextRequest & { logger?: typeof advancedLogger }).logger =
      contextLogger;

    contextLogger.debug('Logs enriched with user context', {
      userId: context.userId,
      email: context.email,
      role: context.role,
    });
  }

  next();
}

/**
 * Helper para obtener el contexto de usuario del request
 *
 * @param {Request} req - Request de Express
 * @returns {UserContext | undefined} Contexto de usuario o undefined
 */
export function getUserContext(req: Request): UserContext | undefined {
  // Intentar obtener del request directamente
  const requestContext = (req as UserContextRequest).userContext;
  if (requestContext) {
    return requestContext;
  }

  // Intentar obtener de AsyncLocalStorage
  return userContextService.getContext();
}

/**
 * Helper para verificar si el request tiene contexto de usuario
 *
 * @param {Request} req - Request de Express
 * @returns {boolean} true si hay contexto, false en caso contrario
 */
export function hasUserContext(req: Request): boolean {
  return getUserContext(req) !== undefined;
}

/**
 * Middleware para logging de información de usuario
 *
 * Log detallado del contexto de usuario extraído.
 * Útil para debugging y auditoría.
 *
 * @param {Request} req - Request de Express
 * @param {Response} res - Response de Express
 * @param {NextFunction} next - Función next() para continuar
 */
export function logUserContextInfo(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = String(
    (req as UserContextRequest & { id?: string | number }).id || 'unknown'
  );
  const summary = userContextService.getContextSummary();

  advancedLogger.info('User context info', {
    requestId,
    path: req.path,
    method: req.method,
    ...summary,
  });

  next();
}

export default {
  extractUserContext,
  requireUserContext,
  requireUserRole,
  enrichLogsWithUserContext,
  getUserContext,
  hasUserContext,
  logUserContextInfo,
};
