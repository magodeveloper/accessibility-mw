import { describe, expect, test } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import analyzeRouter from '../../src/routes/analyze.route';

const app = express();
app.use(express.json());
app.use('/api/analyze', analyzeRouter);

describe('POST /api/analyze - userId parameter', () => {
  test('should accept userId parameter in request', async () => {
    const requestBody = {
      inputType: 'html' as const,
      value:
        '<!doctype html>\n<html lang="es">\n  <head><meta charset="utf-8"><title>Test</title></head>\n  <body>\n    <h1>Test</h1>\n  </body>\n</html>',
      tool: 'axe-core' as const,
      wcagVersion: '2.2' as const,
      wcagLevel: 'AA' as const,
      userId: 123,
    };

    const response = await request(app)
      .post('/api/analyze')
      .send(requestBody)
      .set('Accept', 'application/json');

    // El test debería pasar la validación sin errores
    expect(response.status).not.toBe(400);

    // Si hay algún error de conectividad con el microservicio,
    // al menos validamos que el userId fue aceptado en la validación
    if (response.status === 400) {
      expect(response.body.error).not.toContain('userId');
    }
  });

  test('should work without userId parameter (optional)', async () => {
    const requestBody = {
      inputType: 'html' as const,
      value:
        '<!doctype html>\n<html lang="es">\n  <head><meta charset="utf-8"><title>Test</title></head>\n  <body>\n    <h1>Test</h1>\n  </body>\n</html>',
      tool: 'axe-core' as const,
      wcagVersion: '2.2' as const,
      wcagLevel: 'AA' as const,
    };

    const response = await request(app)
      .post('/api/analyze')
      .send(requestBody)
      .set('Accept', 'application/json');

    // El test debería pasar la validación sin errores
    expect(response.status).not.toBe(400);
  });

  test('should reject invalid userId (negative number)', async () => {
    const requestBody = {
      inputType: 'html' as const,
      value:
        '<!doctype html>\n<html lang="es">\n  <head><meta charset="utf-8"><title>Test</title></head>\n  <body>\n    <h1>Test</h1>\n  </body>\n</html>',
      tool: 'axe-core' as const,
      wcagVersion: '2.2' as const,
      wcagLevel: 'AA' as const,
      userId: -1,
    };

    const response = await request(app)
      .post('/api/analyze')
      .send(requestBody)
      .set('Accept', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('userId');
  });
});
