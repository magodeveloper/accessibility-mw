import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

export function attachRequestId(req: Request, _res: Response, next: NextFunction) {
  // Conserva si pino-http ya puso uno; si no, crea
  (req as any).id = (req as any).id ?? randomUUID();
  next();
}