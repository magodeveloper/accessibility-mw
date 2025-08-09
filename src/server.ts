import 'dotenv/config';
import cors from 'cors';
import pino from 'pino';
import helmet from 'helmet';
import express from 'express';
import pinoHttp from 'pino-http';
import { swaggerSpec } from './swagger';
import swaggerUi from 'swagger-ui-express';
import { analyzeRouter } from './routes/analyze.route';
import { attachRequestId } from './middlewares/requestId';
import { analyzeLimiter, generalLimiter } from './middlewares/rateLimit';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler';

const app = express();
const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' });

// Confianza en cabeceras X-Forwarded-* si hay proxy/CDN
if ((process.env.TRUST_PROXY ?? 'false').toLowerCase() === 'true') {
  app.set('trust proxy', 1);
}

// Seguridad por cabeceras
app.use(helmet({
  // Ajustes seguros por defecto; descomenta si sirves JSON puro siempre:
  // contentSecurityPolicy: false
}));

app.use(generalLimiter);

const ORIGINS = (process.env.CORS_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({ origin: ORIGINS.length ? ORIGINS : true }));
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger }));

app.use(attachRequestId);
app.use(pinoHttp({ logger, customProps: (req) => ({ requestId: (req as any).id }) }));

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/analyze', analyzeLimiter, analyzeRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const HOST = process.env.HOST ?? '127.0.0.1';

app.listen(PORT, HOST, () => {
  logger.info(`API escuchando en http://${HOST}:${PORT} - Swagger: /api/docs`);
});

app.use(notFoundHandler);

app.use(errorHandler);

// Errores de proceso (log + política de apagado opcional)
process.on('unhandledRejection', (reason: any) => {
  logger.error({ reason }, 'UNHANDLED_REJECTION');
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'UNCAUGHT_EXCEPTION');
  // En prod podrías forzar salida controlada:
  // process.exit(1);
});