import 'dotenv/config';
import cors from 'cors';
import pino from 'pino';
import helmet from 'helmet';
import express from 'express';
import pinoHttp from 'pino-http';
import { swaggerSpec } from './swagger';
import swaggerUi from 'swagger-ui-express';
import { healthRouter } from './routes/health.route';
import { analyzeRouter } from './routes/analyze.route';
import { attachRequestId } from './middlewares/requestId';
import { analyzeLimiter, generalLimiter } from './middlewares/rateLimit';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler';

const app = express();

// Oculta cabecera X-Powered-By (seguridad)
app.disable('x-powered-by');

// Logger
const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' });

// Middleware para agregar requestId a cada solicitud
app.use(attachRequestId);

// Confianza en cabeceras X-Forwarded-* si hay proxy/CDN
if ((process.env.TRUST_PROXY ?? 'false').toLowerCase() === 'true') {
  app.set('trust proxy', 1);
}

// Seguridad por cabeceras HTTP 
app.use(helmet({ 
  // contentSecurityPolicy: false
}));

// CORS
const ORIGINS = (process.env.CORS_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);

// Configurar CORS
app.use(cors({ origin: ORIGINS.length ? ORIGINS : true }));

// Logger HTTP (ya tendrá requestId)
app.use(pinoHttp({ logger, customProps: (req) => ({ requestId: (req as any).id }) }));

// Body parser JSON (si falla, ya existe requestId)
app.use(express.json({ limit: '2mb' }));

// Rate limiting general (después de CORS y JSON para evitar 429 en preflight)
app.use(generalLimiter);

// Swagger UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Swagger JSON (depuración)
app.get('/api/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

// Rutas de análisis
app.use('/api/analyze', analyzeLimiter, analyzeRouter);

// Health shallow/deep
app.use('/health', healthRouter);

// 404 y manejador global de errores ANTES de escuchar
app.use(notFoundHandler);

// Manejador de errores
app.use(errorHandler);

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const HOST = process.env.HOST ?? '0.0.0.0';

// Iniciar servidor
app.listen(PORT, HOST, () => {
  logger.info(`API escuchando en http://${HOST}:${PORT} - Swagger: /api/docs`);
});

// Errores de proceso (log + política de apagado opcional)
process.on('unhandledRejection', (reason: any) => {
  logger.error({ reason }, 'UNHANDLED_REJECTION');
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'UNCAUGHT_EXCEPTION');
  // En prod podrías forzar salida controlada:
  // process.exit(1);
});