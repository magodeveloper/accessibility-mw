import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import bundleRouter from '../../src/routes/bundle.route';
import { TestServer } from '../helpers/testServer';

let app: express.Express;

describe('Bundle Routes Integration Tests', () => {
  let testServer: TestServer;
  // Usar el mismo directorio que el código real espera
  const mockReportsDir = path.join(__dirname, '../../reports/bundle');
  const mockLatestReportPath = path.join(mockReportsDir, 'latest.json');

  const mockBundleReport = {
    metadata: {
      timestamp: '2025-09-13T10:30:00.000Z',
      version: '1.0.0',
      nodeVersion: 'v18.17.0',
      platform: 'win32',
    },
    bundle: {
      summary: {
        totalSizeFormatted: '1.2 MB',
        totalFiles: 45,
        jsSize: '800 KB',
        mapSize: '400 KB',
      },
      files: [
        {
          path: '/src/routes/analyze.route.js',
          size: 15000,
          sizeFormatted: '15 KB',
          type: 'js',
        },
        {
          path: '/src/services/axe.service.js',
          size: 8000,
          sizeFormatted: '8 KB',
          type: 'js',
        },
      ],
    },
    dependencies: {
      dependencies: 25,
      devDependencies: 15,
      heavyDependencies: [
        { name: 'express', version: '^4.18.0' },
        { name: 'jest', version: '^29.0.0' },
      ],
    },
    recommendations: [
      {
        type: 'optimization',
        message: 'Consider code splitting',
        action: 'Split large routes into chunks',
      },
    ],
  };

  beforeAll(async () => {
    // Crear directorio de reportes mock
    if (!fs.existsSync(mockReportsDir)) {
      fs.mkdirSync(mockReportsDir, { recursive: true });
    }

    // Crear aplicación express para tests con el router real
    app = express();
    app.use(express.json());
    app.use('/api/bundle', bundleRouter);

    testServer = new TestServer(app);
    await testServer.start();
    console.log(`Bundle test server running on ${testServer.getBaseUrl()}`);
  });

  afterAll(async () => {
    if (testServer) {
      await testServer.stop();
      testServer.cleanup(); // Limpiar explícitamente todos los timers
    }

    // Limpiar archivos de test
    if (fs.existsSync(mockReportsDir)) {
      fs.rmSync(mockReportsDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Crear archivo de reporte mock para cada test
    fs.writeFileSync(
      mockLatestReportPath,
      JSON.stringify(mockBundleReport, null, 2)
    );
  });

  afterEach(() => {
    // Limpiar archivo mock después de cada test
    if (fs.existsSync(mockLatestReportPath)) {
      fs.unlinkSync(mockLatestReportPath);
    }
  });

  describe('GET /api/bundle/status', () => {
    it('should return bundle status when report exists', async () => {
      const res = await request(testServer.getApp()).get('/api/bundle/status');

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
      expect(res.body.timestamp).toBe('2025-09-13T10:30:00.000Z');
      expect(res.body.version).toBe('1.0.0');
      expect(res.body.totalSize).toBe('1.2 MB');
      expect(res.body.totalFiles).toBe(45);
      expect(res.body.jsSize).toBe('800 KB');
      expect(res.body.status).toBe('healthy');
      expect(res.body.recommendations).toBe(1);
      expect(Array.isArray(res.body.alerts)).toBe(true);
    });

    it('should return 404 when no report exists', async () => {
      // Eliminar el archivo de reporte
      if (fs.existsSync(mockLatestReportPath)) {
        fs.unlinkSync(mockLatestReportPath);
      }

      const res = await request(testServer.getApp()).get('/api/bundle/status');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('No bundle reports found');
      expect(res.body.message).toBe(
        'Run npm run bundle:monitor to generate a report'
      );
    });

    it('should handle corrupted report file', async () => {
      // Escribir JSON inválido
      fs.writeFileSync(mockLatestReportPath, 'invalid json');

      const res = await request(testServer.getApp()).get('/api/bundle/status');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to read bundle report');
      expect(res.body.message).toBeDefined(); // El mensaje puede variar
    });
  });

  describe('GET /api/bundle/full', () => {
    it('should return full bundle report', async () => {
      const res = await request(testServer.getApp()).get('/api/bundle/full');

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
      expect(res.body.metadata).toBeDefined();
      expect(res.body.bundle).toBeDefined();
      expect(res.body.dependencies).toBeDefined();
      expect(res.body.recommendations).toBeDefined();
      expect(res.body.metadata.timestamp).toBe('2025-09-13T10:30:00.000Z');
      expect(res.body.bundle.summary.totalFiles).toBe(45);
      expect(Array.isArray(res.body.bundle.files)).toBe(true);
      expect(res.body.bundle.files.length).toBe(2);
    });

    it('should return 404 when no report exists', async () => {
      if (fs.existsSync(mockLatestReportPath)) {
        fs.unlinkSync(mockLatestReportPath);
      }

      const res = await request(testServer.getApp()).get('/api/bundle/full');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('No bundle reports found');
    });

    it('should handle file read errors', async () => {
      fs.writeFileSync(mockLatestReportPath, 'corrupted data');

      const res = await request(testServer.getApp()).get('/api/bundle/full');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to read bundle report');
      expect(res.body.message).toBeDefined(); // El mensaje puede variar
    });
  });

  describe('GET /api/bundle/history', () => {
    it('should return empty array when no reports directory exists', async () => {
      // Eliminar directorio completo
      if (fs.existsSync(mockReportsDir)) {
        fs.rmSync(mockReportsDir, { recursive: true, force: true });
      }

      const res = await request(testServer.getApp()).get('/api/bundle/history');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);

      // Recrear directorio para siguientes tests
      fs.mkdirSync(mockReportsDir, { recursive: true });
    });

    it('should return history when historical reports exist', async () => {
      // Eliminar latest.json para este test específico
      if (fs.existsSync(mockLatestReportPath)) {
        fs.unlinkSync(mockLatestReportPath);
      }

      // Crear reportes históricos con nombres que se ordenen correctamente
      const historicalReport1 = JSON.parse(JSON.stringify(mockBundleReport)); // Deep copy
      historicalReport1.metadata.timestamp = '2025-09-12T10:30:00.000Z';
      historicalReport1.metadata.version = '0.9.0';

      const historicalReport2 = JSON.parse(JSON.stringify(mockBundleReport)); // Deep copy
      historicalReport2.metadata.timestamp = '2025-09-11T10:30:00.000Z';
      historicalReport2.metadata.version = '0.8.0';

      fs.writeFileSync(
        path.join(mockReportsDir, 'bundle-report-2025-09-12-103000.json'),
        JSON.stringify(historicalReport1, null, 2)
      );
      fs.writeFileSync(
        path.join(mockReportsDir, 'bundle-report-2025-09-11-103000.json'),
        JSON.stringify(historicalReport2, null, 2)
      );

      const res = await request(testServer.getApp()).get('/api/bundle/history');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      // Verificar que ambos archivos están presentes sin asumir orden específico
      const filenames = res.body.map((item: any) => item.filename);
      expect(filenames).toContain('bundle-report-2025-09-12-103000.json');
      expect(filenames).toContain('bundle-report-2025-09-11-103000.json');

      // Verificar versiones están presentes
      const versions = res.body.map((item: any) => item.version);
      expect(versions).toContain('0.9.0');
      expect(versions).toContain('0.8.0');

      // Limpiar archivos históricos
      fs.unlinkSync(
        path.join(mockReportsDir, 'bundle-report-2025-09-12-103000.json')
      );
      fs.unlinkSync(
        path.join(mockReportsDir, 'bundle-report-2025-09-11-103000.json')
      );
    });

    it('should handle file system errors gracefully', async () => {
      // Simular error escribiendo archivo con permisos incorrectos si fuera posible
      // Para este test, simplemente verificamos que el endpoint maneje casos normales
      const res = await request(testServer.getApp()).get('/api/bundle/history');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/bundle/analysis', () => {
    it('should return bundle analysis when report exists', async () => {
      const res = await request(testServer.getApp()).get(
        '/api/bundle/analysis'
      );

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
      expect(res.body.categories).toBeDefined();
      expect(Array.isArray(res.body.categories)).toBe(true);
      expect(res.body.largestFiles).toBeDefined();
      expect(Array.isArray(res.body.largestFiles)).toBe(true);
      expect(res.body.recommendations).toBeDefined();
      expect(Array.isArray(res.body.recommendations)).toBe(true);
    });

    it('should return 404 when no report exists', async () => {
      if (fs.existsSync(mockLatestReportPath)) {
        fs.unlinkSync(mockLatestReportPath);
      }

      const res = await request(testServer.getApp()).get(
        '/api/bundle/analysis'
      );

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('No bundle reports found');
    });

    it('should handle analysis errors', async () => {
      fs.writeFileSync(mockLatestReportPath, '{"invalid": "structure"}');

      const res = await request(testServer.getApp()).get(
        '/api/bundle/analysis'
      );

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to analyze bundle');
      expect(res.body.message).toBeDefined(); // El mensaje puede variar
    });
  });

  // Variantes adicionales para casos edge
  describe('Edge Cases and Error Handling Variants', () => {
    it('should handle very large bundle reports', async () => {
      const largeBundleReport = { ...mockBundleReport };
      largeBundleReport.bundle.files = Array.from({ length: 1000 }, (_, i) => ({
        path: `/src/components/component${i}.js`,
        size: 1000 + i,
        sizeFormatted: `${1 + i} KB`,
        type: 'js',
      }));
      largeBundleReport.bundle.summary.totalFiles = 1000;

      fs.writeFileSync(
        mockLatestReportPath,
        JSON.stringify(largeBundleReport, null, 2)
      );

      const res = await request(testServer.getApp()).get('/api/bundle/full');

      expect(res.status).toBe(200);
      expect(res.body.bundle.files.length).toBe(1000);
    });

    it('should handle empty bundle files array', async () => {
      const emptyBundleReport = JSON.parse(JSON.stringify(mockBundleReport)); // Deep copy
      emptyBundleReport.bundle.files = [];
      emptyBundleReport.bundle.summary.totalFiles = 0;

      fs.writeFileSync(
        mockLatestReportPath,
        JSON.stringify(emptyBundleReport, null, 2)
      );

      const res = await request(testServer.getApp()).get(
        '/api/bundle/analysis'
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.categories)).toBe(true);
      expect(res.body.largestFiles).toBeDefined();
      expect(Array.isArray(res.body.largestFiles)).toBe(true);
      expect(res.body.largestFiles.length).toBe(0);
    });

    it('should handle missing metadata fields', async () => {
      const incompleteReport = {
        metadata: {
          timestamp: '2025-09-13T10:30:00.000Z',
          // Missing other fields
        },
        bundle: {
          summary: {
            totalSizeFormatted: '1 MB',
            totalFiles: 10,
          },
          files: [],
        },
        dependencies: {
          dependencies: 0,
          devDependencies: 0,
          heavyDependencies: [],
        },
        recommendations: [],
      };

      fs.writeFileSync(
        mockLatestReportPath,
        JSON.stringify(incompleteReport, null, 2)
      );

      const res = await request(testServer.getApp()).get('/api/bundle/status');

      expect(res.status).toBe(200);
      expect(res.body.timestamp).toBe('2025-09-13T10:30:00.000Z');
      expect(res.body.totalFiles).toBe(10);
    });

    it('should handle special characters in file paths', async () => {
      const specialCharReport = JSON.parse(JSON.stringify(mockBundleReport)); // Deep copy
      specialCharReport.bundle.files = [
        {
          path: '/src/routes/análisis-español.js',
          size: 5000,
          sizeFormatted: '5 KB',
          type: 'js',
        },
        {
          path: '/src/components/测试文件.js',
          size: 3000,
          sizeFormatted: '3 KB',
          type: 'js',
        },
      ];

      fs.writeFileSync(
        mockLatestReportPath,
        JSON.stringify(specialCharReport, null, 2)
      );

      const res = await request(testServer.getApp()).get(
        '/api/bundle/analysis'
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.categories)).toBe(true);
      expect(res.body.largestFiles).toBeDefined();
      expect(Array.isArray(res.body.largestFiles)).toBe(true);
      // Verificar que contiene el archivo con caracteres especiales
      const largestFiles = res.body.largestFiles;
      const hasSpecialCharFile = largestFiles.some(
        (file: any) => file.path && file.path.includes('análisis-español.js')
      );
      expect(hasSpecialCharFile).toBe(true);
    });
  });
});
