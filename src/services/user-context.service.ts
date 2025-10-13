/**
 * User Context Service
 *
 * Este servicio gestiona el contexto de usuario extraído del Gateway,
 * usando AsyncLocalStorage para mantener el contexto por request sin
 * necesidad de pasar el objeto request por toda la aplicación.
 *
 * Coincide con el patrón implementado en los microservicios .NET:
 * - Analysis API: IUserContextService
 * - Reports API: IUserContextService
 * - Users API: IUserContextService
 */

import { AsyncLocalStorage } from 'async_hooks';
import { advancedLogger } from './logging.service';

/**
 * Información del usuario extraída del Gateway
 */
export interface UserContext {
  /**
   * ID único del usuario (GUID o número)
   */
  userId?: string;

  /**
   * Email del usuario
   */
  email?: string;

  /**
   * Rol del usuario (Admin, User, Guest, etc.)
   */
  role?: string;

  /**
   * Nombre completo del usuario
   */
  name?: string;

  /**
   * Timestamp de cuándo se extrajo el contexto
   */
  extractedAt?: Date;

  /**
   * Request ID asociado (para correlación de logs)
   */
  requestId?: string;
}

/**
 * Headers del Gateway que contienen información de usuario
 */
export const USER_CONTEXT_HEADERS = {
  userId: 'x-user-id',
  email: 'x-user-email',
  role: 'x-user-role',
  name: 'x-user-name',
} as const;

/**
 * AsyncLocalStorage para mantener contexto por request
 * Similar a IHttpContextAccessor en .NET
 */
const asyncLocalStorage = new AsyncLocalStorage<UserContext>();

/**
 * Clase para gestionar el User Context
 */
class UserContextService {
  /**
   * Establece el contexto de usuario para el request actual
   *
   * @param {UserContext} context - Contexto del usuario
   */
  setContext(context: UserContext): void {
    const store = asyncLocalStorage.getStore();
    if (store) {
      // Ya existe un store, actualizar
      Object.assign(store, context);
      advancedLogger.debug('User context updated', {
        userId: context.userId,
        email: context.email,
        role: context.role,
        requestId: context.requestId,
      });
    } else {
      advancedLogger.warn(
        'Attempted to set user context outside async context',
        {
          userId: context.userId,
          requestId: context.requestId,
        }
      );
    }
  }

  /**
   * Ejecuta una función con un contexto de usuario específico
   *
   * @param {UserContext} context - Contexto del usuario
   * @param {Function} callback - Función a ejecutar
   * @returns {T} Resultado de la función
   */
  run<T>(context: UserContext, callback: () => T): T {
    return asyncLocalStorage.run(context, callback);
  }

  /**
   * Obtiene el contexto de usuario del request actual
   *
   * @returns {UserContext | undefined} Contexto del usuario o undefined
   */
  getContext(): UserContext | undefined {
    return asyncLocalStorage.getStore();
  }

  /**
   * Obtiene el User ID del contexto actual
   *
   * @returns {string | undefined} User ID o undefined
   */
  getUserId(): string | undefined {
    return this.getContext()?.userId;
  }

  /**
   * Obtiene el email del contexto actual
   *
   * @returns {string | undefined} Email o undefined
   */
  getEmail(): string | undefined {
    return this.getContext()?.email;
  }

  /**
   * Obtiene el rol del contexto actual
   *
   * @returns {string | undefined} Rol o undefined
   */
  getRole(): string | undefined {
    return this.getContext()?.role;
  }

  /**
   * Obtiene el nombre del contexto actual
   *
   * @returns {string | undefined} Nombre o undefined
   */
  getName(): string | undefined {
    return this.getContext()?.name;
  }

  /**
   * Obtiene el Request ID del contexto actual
   *
   * @returns {string | undefined} Request ID o undefined
   */
  getRequestId(): string | undefined {
    return this.getContext()?.requestId;
  }

  /**
   * Verifica si hay un contexto de usuario establecido
   *
   * @returns {boolean} true si hay contexto, false en caso contrario
   */
  hasContext(): boolean {
    return this.getContext() !== undefined;
  }

  /**
   * Verifica si el usuario actual tiene un rol específico
   *
   * @param {string} role - Rol a verificar
   * @returns {boolean} true si el usuario tiene el rol, false en caso contrario
   */
  hasRole(role: string): boolean {
    const userRole = this.getRole();
    if (!userRole) return false;

    // Comparación case-insensitive
    return userRole.toLowerCase() === role.toLowerCase();
  }

  /**
   * Verifica si el usuario actual tiene alguno de los roles especificados
   *
   * @param {string[]} roles - Roles a verificar
   * @returns {boolean} true si el usuario tiene alguno de los roles, false en caso contrario
   */
  hasAnyRole(roles: string[]): boolean {
    return roles.some(role => this.hasRole(role));
  }

  /**
   * Obtiene un resumen del contexto para logging
   *
   * @returns {object} Objeto con información resumida del contexto
   */
  getContextSummary(): {
    userId?: string;
    email?: string;
    role?: string;
    name?: string;
    requestId?: string;
    hasContext: boolean;
  } {
    const context = this.getContext();
    return {
      userId: context?.userId,
      email: context?.email,
      role: context?.role,
      name: context?.name,
      requestId: context?.requestId,
      hasContext: context !== undefined,
    };
  }

  /**
   * Limpia el contexto actual (útil para testing)
   */
  clearContext(): void {
    const store = asyncLocalStorage.getStore();
    if (store) {
      Object.keys(store).forEach(key => {
        delete store[key as keyof UserContext];
      });
      advancedLogger.debug('User context cleared');
    }
  }

  /**
   * Crea un child logger con el contexto de usuario actual
   *
   * @returns {typeof advancedLogger} Logger con contexto de usuario
   */
  createContextLogger(): typeof advancedLogger {
    const context = this.getContext();
    if (context) {
      return advancedLogger.child({
        userId: context.userId,
        userEmail: context.email,
        userRole: context.role,
        userName: context.name,
      });
    }
    return advancedLogger;
  }

  /**
   * Serializa el contexto para propagación a otros servicios
   * Útil para llamadas HTTP a microservicios
   *
   * @returns {Record<string, string>} Headers para propagar
   */
  toHeaders(): Record<string, string> {
    const context = this.getContext();
    const headers: Record<string, string> = {};

    if (context?.userId) {
      headers[USER_CONTEXT_HEADERS.userId] = context.userId;
    }
    if (context?.email) {
      headers[USER_CONTEXT_HEADERS.email] = context.email;
    }
    if (context?.role) {
      headers[USER_CONTEXT_HEADERS.role] = context.role;
    }
    if (context?.name) {
      headers[USER_CONTEXT_HEADERS.name] = context.name;
    }

    return headers;
  }

  /**
   * Deserializa contexto desde headers (para testing o propagación)
   *
   * @param {Record<string, string | undefined>} headers - Headers a deserializar
   * @returns {UserContext} Contexto extraído
   */
  fromHeaders(headers: Record<string, string | undefined>): UserContext {
    return {
      userId: headers[USER_CONTEXT_HEADERS.userId],
      email: headers[USER_CONTEXT_HEADERS.email],
      role: headers[USER_CONTEXT_HEADERS.role],
      name: headers[USER_CONTEXT_HEADERS.name],
      extractedAt: new Date(),
    };
  }
}

/**
 * Instancia singleton del servicio
 */
export const userContextService = new UserContextService();

export default userContextService;
