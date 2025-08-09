import type { Request, Response, NextFunction } from 'express';

type KnownError = {
  status?: number; // permite setear 400/404/409/etc.
  expose?: boolean; // si true, se expone el mensaje en prod
  code?: string; // opcional, para front
};

export function notFoundHandler(req: Request, res: Response) {
  const requestId = (req as any).id;
  req.log?.warn({ requestId, path: req.originalUrl }, 'Route not found');
  return res.status(404).json({
    ok: false,
    error: 'Not Found',
    requestId
  });
}

export function errorHandler(err: Error & KnownError, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as any).id;
  const isProd = (process.env.NODE_ENV === 'production');

  // Default 500 si no hay status
  const status = err.status && Number.isInteger(err.status) ? err.status : 500;

  // Mensaje expuesto: en prod solo si err.expose === true; en dev siempre
  const prodMessage = err.expose ? err.message : 'Internal error';
  const clientMessage =
    isProd
      ? prodMessage
      : (err.message || 'Internal error');

  // Log enriquecido (pino-http ya añade req info)
  req.log?.error({ requestId, err, status }, 'Unhandled error');

  const payload: Record<string, any> = {
    ok: false,
    error: clientMessage,
    requestId
  };

  // Adjunta código de error si lo setearas desde servicios
  if (err.code && !isProd) payload.code = err.code;

  // Stack traces solo en no-prod
  if (!isProd && err.stack) payload.stack = err.stack;

  return res.status(status).json(payload);
}