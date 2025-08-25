import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { ENV, FeatureFlags } from '../utils/environment';

function rlHandler(req: Request, res: Response) {
  const requestId = req.id;
  const limit = res.getHeader('RateLimit-Limit');
  const remaining = res.getHeader('RateLimit-Remaining');
  const reset = res.getHeader('RateLimit-Reset');
  const retryAfter = res.getHeader('Retry-After');

  // Log rate limit hit for monitoring
  req.log?.warn(
    {
      requestId,
      path: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      rateLimitInfo: { limit, remaining, reset, retryAfter },
    },
    'Rate limit exceeded'
  );

  return res.status(429).json({
    ok: false,
    error: 'Too many requests. Please try again later.',
    details: {
      path: req.originalUrl,
      limit,
      remaining,
      reset,
      retryAfter,
      windowMs: ENV.RATE_LIMIT_WINDOW_MS,
    },
    requestId,
  });
}

// Skip rate limiting conditionally
const shouldSkipRateLimit = (req: Request): boolean => {
  // Skip health checks and docs
  if (
    req.path === '/health' ||
    req.path.startsWith('/api/docs') ||
    req.path === '/metrics'
  ) {
    return true;
  }

  // Skip in test environment
  if (FeatureFlags.isTest()) {
    return true;
  }

  // Skip if rate limiting is disabled
  if (!FeatureFlags.enforceRateLimit()) {
    return true;
  }

  return false;
};

export const generalLimiter = rateLimit({
  windowMs: ENV.RATE_LIMIT_WINDOW_MS,
  max: ENV.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: ENV.TRUST_PROXY },
  skip: shouldSkipRateLimit,
  handler: rlHandler,
  // Removed custom keyGenerator to use default (IPv6 safe)
});

export const analyzeLimiter = rateLimit({
  windowMs: ENV.RATE_LIMIT_WINDOW_MS,
  max: ENV.ANALYZE_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: ENV.TRUST_PROXY },
  skip: shouldSkipRateLimit,
  handler: rlHandler,
  // Removed custom keyGenerator to use default (IPv6 safe)
});
