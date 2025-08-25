import type { Request, Response } from 'express';

interface KnownError extends Error {
  status?: number; // permite setear 400/404/409/etc.
  expose?: boolean; // si true, se expone el mensaje en prod
  code?: string; // opcional, para front
}

interface TimeoutError extends Error {
  name: 'TimeoutError';
  code: 'ETIMEDOUT';
  operation?: string;
  details?: Record<string, unknown>;
}

interface AnalysisError extends Error {
  code: 'ANALYSIS_ERROR';
  details?: Record<string, unknown>;
}

interface URLValidationError extends Error {
  code: 'URL_VALIDATION_ERROR';
  details?: Record<string, unknown>;
}

interface JsonParseError extends SyntaxError {
  type?: 'entity.parse.failed';
  body?: unknown;
  code?: string;
}

interface ExtendedError extends Error {
  code?: string;
  details?: Record<string, unknown>;
  operation?: string;
  type?: string;
  body?: unknown;
}

export function notFoundHandler(req: Request, res: Response) {
  const requestId = req.id;
  req.log?.warn(
    { requestId, path: req.originalUrl, method: req.method },
    'Route not found'
  );
  return res.status(404).json({
    ok: false,
    error: 'Not Found',
    details: { path: req.originalUrl, method: req.method },
    requestId,
  });
}

export function errorHandler(
  err:
    | KnownError
    | TimeoutError
    | AnalysisError
    | URLValidationError
    | JsonParseError
    | ExtendedError,
  req: Request,
  res: Response
) {
  const requestId = req.id;
  const isProd = process.env.NODE_ENV === 'production';

  // Detecta timeout con mejor contexto
  if (err.name === 'TimeoutError' || err.code === 'ETIMEDOUT') {
    req.log?.warn(
      { requestId, err: { message: err.message, code: err.code } },
      'Timeout error'
    );
    const timeoutErr = err as TimeoutError | ExtendedError;
    return res.status(504).json({
      ok: false,
      error: 'La operación excedió el tiempo límite',
      details: {
        timeout: true,
        operation: timeoutErr.operation || 'unknown',
        ...(timeoutErr.details ?? {}),
      },
      requestId,
    });
  }

  // Detecta errores de análisis específicos
  if (err.code === 'ANALYSIS_ERROR') {
    req.log?.warn({ requestId, err }, 'Analysis error');
    const analysisErr = err as AnalysisError;
    return res.status(422).json({
      ok: false,
      error: 'Error durante el análisis de accesibilidad',
      details: analysisErr.details ?? {},
      requestId,
    });
  }

  // Detecta errores de validación de URL
  if (err.code === 'URL_VALIDATION_ERROR') {
    req.log?.warn({ requestId, err }, 'URL validation error');
    const urlErr = err as URLValidationError;
    return res.status(400).json({
      ok: false,
      error: 'URL proporcionada no es válida',
      details: urlErr.details ?? {},
      requestId,
    });
  }

  // Detecta error de parseo JSON del body-parser
  const isJsonParseError = (error: unknown): error is JsonParseError => {
    const extErr = error as ExtendedError;
    return (
      extErr?.type === 'entity.parse.failed' ||
      (error instanceof SyntaxError && 'body' in error)
    );
  };

  // Si es parseo JSON, fuerza 400 y mensaje consistente
  if (isJsonParseError(err)) {
    const message = 'JSON inválido';
    const details = {
      formErrors: [err.message],
      fieldErrors: {} as Record<string, string[]>,
    };
    req.log?.warn({ requestId, message: err.message }, 'JSON parse error');
    return res.status(400).json({
      ok: false,
      error: message,
      details,
      requestId,
    });
  }

  // Type guards
  const isKnownError = (error: unknown): error is KnownError => {
    return (
      error instanceof Error &&
      ('status' in error || 'expose' in error || 'code' in error)
    );
  };

  // Default 500 si no hay status
  const status =
    isKnownError(err) && err.status && Number.isInteger(err.status)
      ? err.status
      : 500;

  // Mensaje expuesto: en prod solo si err.expose === true; en dev siempre
  const prodMessage =
    isKnownError(err) && err.expose ? err.message : 'Internal Server Error';
  const clientMessage = isProd
    ? prodMessage
    : err.message || 'Internal Server Error';

  // Log enriquecido con más contexto
  const errorDetails = {
    requestId,
    err: {
      message: err.message,
      stack: isProd ? undefined : err.stack,
      code: err.code,
      name: err.name,
    },
    status,
    url: req.originalUrl,
    method: req.method,
    userAgent: req.get('user-agent'),
    ip: req.ip,
  };

  req.log?.error(errorDetails, 'Unhandled error');

  const payload: Record<string, unknown> = {
    ok: false,
    error: clientMessage,
    details: (err as ExtendedError).details ?? {},
    requestId,
  };

  if (err.code && !isProd) {
    payload.code = err.code;
  }

  // Stack solo en desarrollo para debugging
  if (!isProd && err.stack) {
    payload.stack = err.stack;
  }

  return res.status(status).json(payload);
}
