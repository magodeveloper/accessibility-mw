import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export function attachRequestId(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  // Conserva si pino-http ya puso uno; si no, crea
  req.id = req.id ?? randomUUID();
  next();
}
