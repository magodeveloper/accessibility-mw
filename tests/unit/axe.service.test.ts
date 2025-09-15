import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import path from 'path';
import { Page } from 'playwright';
import { runAxeOnPage } from '../../src/services/axe.service';

// Mock de require.resolve - path dinámico para CI/local
const mockAxePath = path.join(
  process.cwd(),
  'node_modules',
  'axe-core',
  'axe.min.js'
);

describe('Axe Service', () => {
  let mockPage: jest.Mocked<Page>;

  beforeEach(() => {
    mockPage = {
      addScriptTag: jest.fn(() => Promise.resolve({})),
      evaluate: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('runAxeOnPage', () => {
    it('debe cargar axe-core desde el archivo local', async () => {
      const mockAxeResult = {
        violations: [],
        passes: [],
        incomplete: [],
        inapplicable: [],
      };

      mockPage.evaluate
        .mockResolvedValueOnce(undefined) // Para DOM ready check
        .mockResolvedValueOnce(mockAxeResult); // Para axe.run

      await runAxeOnPage(mockPage);

      expect(mockPage.addScriptTag).toHaveBeenCalledWith({ path: mockAxePath });
    });

    it('debe hacer fallback a CDN si falla la carga local', async () => {
      const consoleSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      mockPage.addScriptTag.mockRejectedValueOnce(new Error('File not found'));

      const mockAxeResult = {
        violations: [],
        passes: [],
        incomplete: [],
        inapplicable: [],
      };

      mockPage.evaluate
        .mockResolvedValueOnce(undefined) // Para DOM ready check
        .mockResolvedValueOnce(mockAxeResult); // Para axe.run

      await runAxeOnPage(mockPage);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Fallback to CDN for axe-core:',
        expect.any(Error)
      );
      expect(mockPage.addScriptTag).toHaveBeenCalledWith({
        url: 'https://unpkg.com/axe-core@4.10.3/axe.min.js',
      });

      consoleSpy.mockRestore();
    });

    it('debe ejecutar axe con opciones por defecto', async () => {
      const mockAxeResult = {
        violations: [],
        passes: [],
        incomplete: [],
        inapplicable: [],
      };

      mockPage.evaluate
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(mockAxeResult);

      await runAxeOnPage(mockPage);

      expect(mockPage.evaluate).toHaveBeenCalledWith(expect.any(Function), {
        iframes: true,
      });
    });

    it('debe aplicar opciones personalizadas', async () => {
      const mockAxeResult = {
        violations: [],
        passes: [],
        incomplete: [],
        inapplicable: [],
      };

      const customOptions = {
        runOnly: {
          type: 'tag' as const,
          values: ['wcag2a', 'wcag2aa'],
        },
        rules: {
          'color-contrast': { enabled: false },
        },
      };

      mockPage.evaluate
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(mockAxeResult);

      await runAxeOnPage(mockPage, customOptions);

      expect(mockPage.evaluate).toHaveBeenCalledWith(expect.any(Function), {
        iframes: true,
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa'],
        },
        rules: {
          'color-contrast': { enabled: false },
        },
      });
    });

    it('debe manejar violaciones con impacts', async () => {
      const mockAxeResult = {
        violations: [
          {
            id: 'color-contrast',
            description: 'Elements must have sufficient color contrast',
            help: 'Elements must meet enhanced color contrast ratio thresholds',
            helpUrl:
              'https://dequeuniversity.com/rules/axe/4.10/color-contrast-enhanced',
            impact: 'serious',
            tags: ['cat.color', 'wcag2aa'],
            nodes: [
              {
                impact: 'serious',
                target: ['#main'],
                html: '<div id="main">Content</div>',
                failureSummary:
                  'Fix any of the following:\n  Element has insufficient color contrast',
              },
            ],
          },
        ],
        passes: [],
        incomplete: [],
        inapplicable: [],
      };

      mockPage.evaluate
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(mockAxeResult);

      const result = await runAxeOnPage(mockPage);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].impact).toBe('serious');
      expect(result.violations[0].nodes[0].impact).toBe('serious');
    });

    it('debe inferir impact desde nodos cuando falta', async () => {
      const mockAxeResult = {
        violations: [
          {
            id: 'test-rule',
            description: 'Test rule',
            help: 'Test help',
            helpUrl: 'https://example.com',
            // impact: undefined - no definido
            tags: ['test'],
            nodes: [
              {
                impact: 'critical', // Nodo con impact crítico
                target: ['#test'],
                html: '<div id="test">Test</div>',
              },
              {
                impact: 'moderate', // Nodo con impact moderado
                target: ['#test2'],
                html: '<div id="test2">Test 2</div>',
              },
            ],
          },
        ],
        passes: [],
        incomplete: [],
        inapplicable: [],
      };

      mockPage.evaluate
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(mockAxeResult);

      const result = await runAxeOnPage(mockPage);

      // Debe inferir el peor impact (critical) desde los nodos
      expect(result.violations[0].impact).toBe('critical');
    });

    it('debe manejar múltiples tipos de reglas con inferencia de impact', async () => {
      const mockAxeResult = {
        violations: [
          {
            id: 'rule-without-impact',
            description: 'Rule without impact',
            help: 'Help text',
            helpUrl: 'https://example.com',
            tags: ['test'],
            nodes: [{ impact: 'minor' }, { impact: 'serious' }],
          },
        ],
        passes: [
          {
            id: 'passing-rule',
            description: 'Passing rule',
            help: 'Help text',
            helpUrl: 'https://example.com',
            tags: ['test'],
            nodes: [{ impact: 'moderate' }],
          },
        ],
        incomplete: [
          {
            id: 'incomplete-rule',
            description: 'Incomplete rule',
            help: 'Help text',
            helpUrl: 'https://example.com',
            tags: ['test'],
            nodes: [{ impact: 'critical' }],
          },
        ],
        inapplicable: [
          {
            id: 'inapplicable-rule',
            description: 'Inapplicable rule',
            help: 'Help text',
            helpUrl: 'https://example.com',
            tags: ['test'],
            nodes: [{ impact: 'minor' }],
          },
        ],
      };

      mockPage.evaluate
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(mockAxeResult);

      const result = await runAxeOnPage(mockPage);

      expect(result.violations[0].impact).toBe('serious');
      expect(result.passes[0].impact).toBe('moderate');
      expect(result.incomplete[0].impact).toBe('critical');
      expect(result.inapplicable[0].impact).toBe('minor');
    });

    it('debe manejar nodos sin impact correctamente', async () => {
      const mockAxeResult = {
        violations: [
          {
            id: 'rule-no-impact',
            description: 'Rule without impact',
            help: 'Help text',
            helpUrl: 'https://example.com',
            tags: ['test'],
            nodes: [
              { target: ['#test1'] }, // Sin impact
              { impact: undefined }, // Impact undefined
              { impact: '' }, // Impact vacío
            ],
          },
        ],
        passes: [],
        incomplete: [],
        inapplicable: [],
      };

      mockPage.evaluate
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(mockAxeResult);

      const result = await runAxeOnPage(mockPage);

      // No debe asignar impact si no hay nodos con impact válido
      expect(result.violations[0].impact).toBeUndefined();
    });

    it('debe manejar errores en la ejecución de axe', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce(undefined) // DOM ready
        .mockRejectedValueOnce(new Error('axe execution failed'));

      await expect(runAxeOnPage(mockPage)).rejects.toThrow(
        'axe execution failed'
      );
    });

    it('debe crear error extendido cuando axe.run falla', async () => {
      const customOptions = {
        runOnly: { type: 'tag' as const, values: ['wcag2a'] },
      };

      mockPage.evaluate
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Custom axe error'));

      try {
        await runAxeOnPage(mockPage, customOptions);
        throw new Error('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('Custom axe error');
        expect(error.code).toBe('AXE_RUN_ERROR');
        expect(error.details).toEqual({
          options: {
            iframes: true,
            runOnly: { type: 'tag', values: ['wcag2a'] },
          },
        });
      }
    });

    it('debe ordenar impacts correctamente (minor < moderate < serious < critical)', async () => {
      const mockAxeResult = {
        violations: [
          {
            id: 'mixed-impacts',
            description: 'Rule with mixed impacts',
            help: 'Help text',
            helpUrl: 'https://example.com',
            tags: ['test'],
            nodes: [
              { impact: 'moderate' },
              { impact: 'critical' },
              { impact: 'minor' },
              { impact: 'serious' },
            ],
          },
        ],
        passes: [],
        incomplete: [],
        inapplicable: [],
      };

      mockPage.evaluate
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(mockAxeResult);

      const result = await runAxeOnPage(mockPage);

      // Debe seleccionar el peor impact (critical)
      expect(result.violations[0].impact).toBe('critical');
    });

    it('debe manejar resultados vacíos correctamente', async () => {
      const mockAxeResult = {
        violations: [],
        passes: [],
        incomplete: [],
        inapplicable: [],
      };

      mockPage.evaluate
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(mockAxeResult);

      const result = await runAxeOnPage(mockPage);

      expect(result.violations).toHaveLength(0);
      expect(result.passes).toHaveLength(0);
      expect(result.incomplete).toHaveLength(0);
      expect(result.inapplicable).toHaveLength(0);
    });
  });
});
