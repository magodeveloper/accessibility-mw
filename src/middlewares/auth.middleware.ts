import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { getJwtConfig, isJwtEnabled } from '../config/jwt.config';
import { advancedLogger } from '../services/logging.service';

/**
 * Extended JWT payload with user information
 * Matches the claims structure from .NET microservices
 */
export interface AuthenticatedUser extends JwtPayload {
  // Standard JWT claims
  sub?: string; // Subject (user ID)
  email?: string;
  name?: string;
  role?: string;

  // Alternative claim names (compatibility with different JWT implementations)
  nameid?: string; // NameIdentifier (alternative to sub)
  unique_name?: string; // Alternative to name
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'?: string;
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'?: string;
}

/**
 * Extended Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * JWT Authentication Middleware
 *
 * Validates JWT Bearer tokens in Authorization header
 * Follows the same validation pattern as .NET microservices:
 * - Validates issuer, audience, lifetime, and signature
 * - Extracts user claims and attaches to request
 * - Returns 401 for missing/invalid tokens
 * - Returns 403 for expired/malformed tokens
 *
 * Usage:
 *   app.use('/api/protected', authenticateJWT);
 */
export function authenticateJWT(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const requestId =
    (req as AuthenticatedRequest & { id?: string }).id || 'unknown';

  // Skip authentication if JWT is not configured (development mode)
  if (!isJwtEnabled()) {
    advancedLogger.warn(
      'JWT authentication is disabled - skipping validation',
      {
        requestId,
        path: req.path,
      }
    );
    return next();
  }

  // Extract Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    advancedLogger.warn('Missing Authorization header', {
      requestId,
      path: req.path,
      method: req.method,
    });

    res.status(401).json({
      error: 'Unauthorized',
      message:
        'Missing Authorization header. Please provide a valid JWT token.',
      code: 'MISSING_AUTH_HEADER',
      requestId,
    });
    return;
  }

  // Validate Bearer scheme
  if (!authHeader.startsWith('Bearer ')) {
    advancedLogger.warn('Invalid Authorization scheme', {
      requestId,
      path: req.path,
      authHeader: authHeader.substring(0, 20) + '...',
    });

    res.status(401).json({
      error: 'Unauthorized',
      message:
        'Invalid Authorization header format. Expected: "Bearer <token>"',
      code: 'INVALID_AUTH_SCHEME',
      requestId,
    });
    return;
  }

  // Extract token
  const token = authHeader.substring(7); // Remove "Bearer " prefix

  if (!token || token.trim() === '') {
    advancedLogger.warn('Empty JWT token', {
      requestId,
      path: req.path,
    });

    res.status(401).json({
      error: 'Unauthorized',
      message: 'Empty JWT token provided',
      code: 'EMPTY_TOKEN',
      requestId,
    });
    return;
  }

  // Verify token
  try {
    const jwtConfig = getJwtConfig();

    const decoded = jwt.verify(token, jwtConfig.secretKey, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      clockTolerance: jwtConfig.clockTolerance,
      algorithms: ['HS256', 'HS384', 'HS512'], // HMAC algorithms only
    }) as AuthenticatedUser;

    // Normalize user ID from different claim names
    const userId =
      decoded.sub ||
      decoded.nameid ||
      decoded[
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'
      ];

    // Normalize role from different claim names
    const role =
      decoded.role ||
      decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

    // Normalize name
    const userName = decoded.name || decoded.unique_name;

    // Attach normalized user to request
    req.user = {
      ...decoded,
      sub: userId,
      name: userName,
      role: role,
    };

    advancedLogger.info('JWT authentication successful', {
      requestId,
      userId,
      email: decoded.email,
      role,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    // Handle specific JWT errors
    // IMPORTANT: Check most specific errors first (TokenExpiredError, NotBeforeError)
    // before checking base class (JsonWebTokenError) to avoid incorrect error handling
    if (error instanceof jwt.TokenExpiredError) {
      advancedLogger.warn('JWT token expired', {
        requestId,
        path: req.path,
        expiredAt: error.expiredAt,
      });

      res.status(403).json({
        error: 'Forbidden',
        message: 'JWT token has expired. Please obtain a new token.',
        code: 'TOKEN_EXPIRED',
        expiredAt: error.expiredAt,
        requestId,
      });
      return;
    }

    if (error instanceof jwt.NotBeforeError) {
      advancedLogger.warn('JWT token not yet valid', {
        requestId,
        path: req.path,
        notBefore: error.date,
      });

      res.status(403).json({
        error: 'Forbidden',
        message: 'JWT token is not yet valid',
        code: 'TOKEN_NOT_YET_VALID',
        notBefore: error.date,
        requestId,
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      advancedLogger.warn('Invalid JWT token', {
        requestId,
        path: req.path,
        errorMessage: error.message,
      });

      res.status(403).json({
        error: 'Forbidden',
        message: 'Invalid JWT token',
        code: 'INVALID_TOKEN',
        details: error.message,
        requestId,
      });
      return;
    }

    // Generic error
    advancedLogger.error('JWT verification error', {
      requestId,
      path: req.path,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(403).json({
      error: 'Forbidden',
      message: 'Token verification failed',
      code: 'VERIFICATION_FAILED',
      requestId,
    });
  }
}

/**
 * Optional JWT Authentication Middleware
 *
 * Similar to authenticateJWT but doesn't fail if token is missing
 * Useful for endpoints that work both authenticated and unauthenticated
 * If token is present, it validates it and attaches user to request
 */
export function optionalAuthenticateJWT(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const requestId =
    (req as AuthenticatedRequest & { id?: string }).id || 'unknown';

  // If no Authorization header, continue without authentication
  if (!req.headers.authorization) {
    advancedLogger.debug('No authentication provided (optional)', {
      requestId,
      path: req.path,
    });
    return next();
  }

  // If header exists, validate it strictly
  authenticateJWT(req, res, next);
}

/**
 * Role-based authorization middleware factory
 *
 * Creates a middleware that checks if authenticated user has required role
 *
 * Usage:
 *   app.delete('/api/admin/users/:id', authenticateJWT, requireRole('Admin'), handler);
 */
export function requireRole(...allowedRoles: string[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    const requestId =
      (req as AuthenticatedRequest & { id?: string }).id || 'unknown';

    if (!req.user) {
      advancedLogger.warn('Authorization check failed - no user context', {
        requestId,
        path: req.path,
      });

      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
        requestId,
      });
      return;
    }

    const userRole = req.user.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      advancedLogger.warn(
        'Authorization check failed - insufficient permissions',
        {
          requestId,
          path: req.path,
          userRole,
          requiredRoles: allowedRoles,
          userId: req.user.sub,
        }
      );

      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions to access this resource',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowedRoles,
        requestId,
      });
      return;
    }

    advancedLogger.info('Authorization check passed', {
      requestId,
      path: req.path,
      userRole,
      userId: req.user.sub,
    });

    next();
  };
}
