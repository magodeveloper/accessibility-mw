import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

function rlHandler(req: Request, res: Response) {
  const requestId = (req as any).id;
  const limit = res.getHeader('RateLimit-Limit');
  const remaining = res.getHeader('RateLimit-Remaining');
  const reset = res.getHeader('RateLimit-Reset');
  const retryAfter = res.getHeader('Retry-After');

  return res.status(429).json({
    ok: false,
    error: 'Too many requests. Please try again later.',
    details: {
      path: req.originalUrl,
      limit, remaining, reset, retryAfter
    },
    requestId
  });
}

export const generalLimiter = rateLimit({
  windowMs: Number(process.env.RATE_WINDOW_MS ?? 60_000),
  max: Number(process.env.RATE_MAX ?? 60),
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: true },
  skip: (req) => req.path === '/health' || req.path.startsWith('/api/docs'),
  handler: rlHandler
});

export const analyzeLimiter = rateLimit({
  windowMs: Number(process.env.RATE_ANALYZE_WINDOW_MS ?? 60_000),
  max: Number(process.env.RATE_ANALYZE_MAX ?? 20),
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: true },
  handler: rlHandler
});