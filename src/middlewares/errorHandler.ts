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
    details: res.err,
    requestId
  });
}

export function errorHandler(err: Error & KnownError, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as any).id;
  const isProd = (process.env.NODE_ENV === 'production');

  // Detecta timeout
  if (err.name === 'TimeoutError' || (err as any).code === 'ETIMEDOUT') {
    req.log?.warn({ requestId, err }, 'Timeout error');
    return res.status(504).json({
      ok: false,
      error: 'La operación excedió el tiempo límite',
      details: (err as any).details ?? {},
      requestId
    });
  }

  // Detecta error de parseo JSON del body-parser
  const isJsonParseError =
    (err as any)?.type === 'entity.parse.failed' ||
    (err instanceof SyntaxError && (err as any).body !== undefined);

  // Si es parseo JSON, fuerza 400 y mensaje consistente
  if (isJsonParseError) {
    const message = 'JSON inválido';
    const details = {
      formErrors: [err.message],
      fieldErrors: {} as Record<string, string[]>
    };
    req.log?.warn({ requestId, message: err.message }, 'JSON parse error');
    return res.status(400).json({
      ok: false,
      error: message,
      details,
      requestId
    });
  }

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
    details: (err as any).details ?? {},
    requestId
  };

  if (err.code && !isProd) {
    payload.code = err.code;
  }
  // Incluye details si vienen del error (por ej. desde security.ts)
  if ((err as any).details !== undefined) {
    payload.details = (err as any).details;
  }
  // Si quieres ocultar stack SIEMPRE para mantener el mismo formato:
  // (recomendado si buscas consistencia total entre errores)
  if (!isProd && err.stack) {
    payload.stack = err.stack;
  }

  return res.status(status).json(payload);
}