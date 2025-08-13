import path from 'node:path';
import swaggerJSDoc from 'swagger-jsdoc';

const isProd = process.env.NODE_ENV === 'production';

const apisGlobs = isProd
  ? [path.join('dist', 'routes', '*.js')]
  : [path.join('src', 'routes', '*.ts')];

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Accessibility Analyzer API',
      version: '0.1.0',
      description:
        'API para analizar accesibilidad web usando axe-core y IBM Equal Access (accessibility-checker)',
    },
    servers: [
      // agrega más si tienes staging/prod con otro dominio
      { url: `http://localhost:${process.env.PORT || 3001}`, description: 'Local' },
    ],
    components: {
      schemas: {
        AnalyzeRequest: {
          type: 'object',
          required: ['inputType', 'value', 'tool', 'wcagVersion', 'wcagLevel'],
          properties: {
            inputType: { type: 'string', enum: ['html', 'url'] },
            value: { type: 'string', description: 'HTML o URL' },
            tool: { type: 'string', enum: ['axe-core', 'equal-access', 'both'] },
            wcagVersion: { type: 'string', enum: ['2.0', '2.1', '2.2'] },
            wcagLevel: { type: 'string', enum: ['A', 'AA', 'AAA'] },
          },
        },
        UnifiedResponse: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            meta: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  violations: { type: 'number' },
                  needsReview: { type: 'number' },
                  recommendations: { type: 'number' },
                  passes: { type: 'number' },
                  incomplete: { type: 'number' },
                  inapplicable: { type: 'number' },
                },
              },
            },
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  tool: { type: 'string' },
                  stats: {
                    type: 'object',
                    properties: {
                      violations: { type: 'number' },
                      needsReview: { type: 'number' },
                      recommendations: { type: 'number' },
                      passes: { type: 'number' },
                      incomplete: { type: 'number' },
                      inapplicable: { type: 'number' },
                    },
                  },
                  items: { type: 'array' },
                },
              },
            },
            total: { type: 'number' },
          },
        },
      },
    },
  },
  apis: apisGlobs,
});