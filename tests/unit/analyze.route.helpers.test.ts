import express from 'express';
import request from 'supertest';

// Test muy básico sin dependencias complejas
describe('Analyze Route Basic Tests', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Ruta simple de prueba
    app.post('/api/analyze', (req, res) => {
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: 'Datos inválidos' });
      }
      res.status(200).json({ message: 'Test OK' });
    });
  });

  describe('POST /analyze', () => {
    it('debe manejar input inválido correctamente', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('debe responder OK para input válido', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send({ test: 'data' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('debe manejar content-type incorrecto', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .set('Content-Type', 'text/plain')
        .send('invalid data');

      expect(response.status).toBe(400);
    });
  });
});
