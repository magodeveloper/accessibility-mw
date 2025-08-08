import 'dotenv/config';
import cors from 'cors';
import pino from 'pino';
import express from 'express';
import pinoHttp from 'pino-http';
import { swaggerSpec } from './swagger';
import swaggerUi from 'swagger-ui-express';
import { analyzeRouter } from './routes/analyze.route';

const app = express();
const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' });

const ORIGINS = (process.env.CORS_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({ origin: ORIGINS.length ? ORIGINS : true }));
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger }));

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/analyze', analyzeRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const HOST = process.env.HOST ?? '127.0.0.1';

app.listen(PORT, HOST, () => {
  logger.info(`API escuchando en http://${HOST}:${PORT} - Swagger: /api/docs`);
});