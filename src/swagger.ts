import swaggerJSDoc from 'swagger-jsdoc';

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Accessibility Analyzer API',
      version: '0.1.0',
      description: 'API para analizar accesibilidad web usando axe-core y IBM Equal Access (accessibility-checker)'
    },
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
            wcagLevel: { type: 'string', enum: ['A', 'AA', 'AAA'] }
          }
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
                  inapplicable: { type: 'number' }
                }
              }
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
                      inapplicable: { type: 'number' }
                    }
                  },
                  items: { type: 'array' }
                }
              }
            },
            total: { type: 'number' }
          }
        }
      }
    }
  },
  apis: ['src/routes/*.ts']
});