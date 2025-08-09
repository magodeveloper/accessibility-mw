import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: Number(process.env.RATE_WINDOW_MS ?? 60_000), // 1 min
  max: Number(process.env.RATE_MAX ?? 60),
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: true },
  skip: (req) => req.path === '/health' || req.path.startsWith('/api/docs'),
  handler: (req, res) => {
    return res.status(429).json({
      ok: false,
      error: 'Too many requests. Please try again later.'
    });
  }
});

export const analyzeLimiter = rateLimit({
  windowMs: Number(process.env.RATE_ANALYZE_WINDOW_MS ?? 60_000), // 1 min
  max: Number(process.env.RATE_ANALYZE_MAX ?? 20),
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: true },
  handler: (req, res) => {
    return res.status(429).json({
      ok: false,
      error: 'Analyze rate limit exceeded. Try again soon.'
    });
  }
});