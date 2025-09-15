/**
 * @fileoverview Additional tests for analyze helpers to improve coverage
 * Focused on functions with low coverage: getPreferredLang, mapImpactToSeverity, getWcagCumulative
 */

import { describe, expect, it } from '@jest/globals';
import {
  getPreferredLang,
  getWcagCumulative,
  mapImpactToSeverity,
} from '../../src/routes/analyze.helpers';

describe('Analyze Helpers - Low Coverage Functions', () => {
  describe('getPreferredLang', () => {
    it('should return "es" when accept-language header contains Spanish', () => {
      const header = {
        'accept-language': 'es-ES,es;q=0.9,en;q=0.8',
      };

      const result = getPreferredLang(header);
      expect(result).toBe('es');
    });

    it('should return "en" when accept-language header contains English first', () => {
      const header = {
        'accept-language': 'en-US,en;q=0.9,fr;q=0.8',
      };

      const result = getPreferredLang(header);
      expect(result).toBe('en');
    });

    it('should return "es" as default when no accept-language header', () => {
      const header = {};

      const result = getPreferredLang(header);
      expect(result).toBe('es');
    });

    it('should return "es" as default when accept-language header is empty', () => {
      const header = {
        'accept-language': '',
      };

      const result = getPreferredLang(header);
      expect(result).toBe('es');
    });

    it('should return first language when accept-language contains unsupported language', () => {
      const header = {
        'accept-language': 'fr-FR,de;q=0.9,it;q=0.8',
      };

      const result = getPreferredLang(header);
      expect(result).toBe('fr');
    });

    it('should handle mixed case in accept-language header', () => {
      const header = {
        'accept-language': 'ES-es,EN-us;q=0.9',
      };

      const result = getPreferredLang(header);
      expect(result).toBe('ES');
    });

    it('should take first language when multiple present', () => {
      const header = {
        'accept-language': 'en-US,es-ES;q=0.9,fr;q=0.8',
      };

      const result = getPreferredLang(header);
      expect(result).toBe('en');
    });

    it('should handle language codes without region', () => {
      const header = {
        'accept-language': 'en,es;q=0.9',
      };

      const result = getPreferredLang(header);
      expect(result).toBe('en');
    });

    it('should handle single language without quality values', () => {
      const header = {
        'accept-language': 'pt',
      };

      const result = getPreferredLang(header);
      expect(result).toBe('pt');
    });
  });

  describe('mapImpactToSeverity', () => {
    it('should map "minor" impact to "low" severity', () => {
      const result = mapImpactToSeverity('minor');
      expect(result).toBe('low');
    });

    it('should map "moderate" impact to "medium" severity', () => {
      const result = mapImpactToSeverity('moderate');
      expect(result).toBe('medium');
    });

    it('should map "serious" impact to "high" severity', () => {
      const result = mapImpactToSeverity('serious');
      expect(result).toBe('high');
    });

    it('should map "critical" impact to "high" severity (not critical)', () => {
      const result = mapImpactToSeverity('critical');
      expect(result).toBe('high');
    });

    it('should map unknown impact to "medium" severity', () => {
      const result = mapImpactToSeverity('unknown');
      expect(result).toBe('medium');
    });

    it('should handle undefined impact', () => {
      const result = mapImpactToSeverity(undefined as any);
      expect(result).toBe('medium');
    });

    it('should handle null impact', () => {
      const result = mapImpactToSeverity(null as any);
      expect(result).toBe('medium');
    });

    it('should handle empty string impact', () => {
      const result = mapImpactToSeverity('');
      expect(result).toBe('medium');
    });

    it('should handle case insensitivity correctly', () => {
      expect(mapImpactToSeverity('MINOR')).toBe('low');
      expect(mapImpactToSeverity('Minor')).toBe('low');
      expect(mapImpactToSeverity('CRITICAL')).toBe('high');
      expect(mapImpactToSeverity('Critical')).toBe('high');
      expect(mapImpactToSeverity('MODERATE')).toBe('medium');
      expect(mapImpactToSeverity('Moderate')).toBe('medium');
      expect(mapImpactToSeverity('SERIOUS')).toBe('high');
      expect(mapImpactToSeverity('Serious')).toBe('high');
    });
  });

  describe('getWcagCumulative', () => {
    it('should return object with versions and levels when cumulative is true', () => {
      const result = getWcagCumulative('2.1', 'AA', true);

      expect(result).toBeInstanceOf(Object);
      expect(result).toHaveProperty('wcagVersions');
      expect(result).toHaveProperty('wcagLevels');
      expect(Array.isArray(result.wcagVersions)).toBe(true);
      expect(Array.isArray(result.wcagLevels)).toBe(true);
    });

    it('should return object with single version and level when cumulative is false', () => {
      const result = getWcagCumulative('2.1', 'AA', false);

      expect(result).toBeInstanceOf(Object);
      expect(result.wcagVersions).toEqual(['2.1']);
      expect(result.wcagLevels).toEqual(['AA']);
    });

    it('should handle different WCAG levels cumulatively', () => {
      const resultA = getWcagCumulative('2.1', 'A', true);
      const resultAA = getWcagCumulative('2.1', 'AA', true);
      const resultAAA = getWcagCumulative('2.1', 'AAA', true);

      // Según el levelOrder: ['AAA', 'AA', 'A'] y slice desde el índice encontrado
      expect(resultA.wcagLevels).toEqual(['A']); // slice(2) = ['A']
      expect(resultAA.wcagLevels).toEqual(['AA', 'A']); // slice(1) = ['AA', 'A']
      expect(resultAAA.wcagLevels).toEqual(['AAA', 'AA', 'A']); // slice(0) = ['AAA', 'AA', 'A'] - comportamiento cumulativo real
    });

    it('should handle different WCAG versions cumulatively', () => {
      const result20 = getWcagCumulative('2.0', 'A', true);
      const result21 = getWcagCumulative('2.1', 'AA', true);
      const result22 = getWcagCumulative('2.2', 'AAA', true);

      // Según el versionOrder: ['2.2', '2.1', '2.0'] y slice desde el índice encontrado
      expect(result20.wcagVersions).toEqual(['2.0']); // slice(2) = ['2.0']
      expect(result21.wcagVersions).toEqual(['2.1', '2.0']); // slice(1) = ['2.1', '2.0']
      expect(result22.wcagVersions).toEqual(['2.2', '2.1', '2.0']); // slice(0) = ['2.2', '2.1', '2.0']

      // Los niveles van desde el especificado hacia adelante en el levelOrder: ['AAA', 'AA', 'A']
      // Basándose en los resultados reales (comportamiento cumulativo):
      expect(result20.wcagLevels).toEqual(['A']); // cuando pide A = solo A
      expect(result21.wcagLevels).toEqual(['AA', 'A']); // slice(1) cuando pide AA = AA y A
      expect(result22.wcagLevels).toEqual(['AAA', 'AA', 'A']); // slice(0) cuando pide AAA = incluye todos los niveles
    });

    it('should handle edge case with invalid level', () => {
      const result = getWcagCumulative('2.1', 'invalid' as any, true);
      expect(result).toBeInstanceOf(Object);
      expect(result).toHaveProperty('wcagVersions');
      expect(result).toHaveProperty('wcagLevels');
    });

    it('should handle edge case with invalid version', () => {
      const result = getWcagCumulative('invalid' as any, 'AA', true);
      expect(result).toBeInstanceOf(Object);
      expect(result).toHaveProperty('wcagVersions');
      expect(result).toHaveProperty('wcagLevels');
    });

    it('should handle undefined parameters', () => {
      const result = getWcagCumulative(
        undefined as any,
        undefined as any,
        undefined as any
      );
      expect(result).toBeInstanceOf(Object);
      expect(result).toHaveProperty('wcagVersions');
      expect(result).toHaveProperty('wcagLevels');
    });

    it('should return consistent results for same input', () => {
      const result1 = getWcagCumulative('2.1', 'AA', true);
      const result2 = getWcagCumulative('2.1', 'AA', true);

      expect(result1).toEqual(result2);
    });

    it('should handle boolean cumulative parameter correctly', () => {
      const cumulativeTrue = getWcagCumulative('2.1', 'AA', true);
      const cumulativeFalse = getWcagCumulative('2.1', 'AA', false);

      // Results should be different when cumulative flag differs
      expect(cumulativeTrue).toBeInstanceOf(Object);
      expect(cumulativeFalse).toBeInstanceOf(Object);
      expect(cumulativeTrue.wcagVersions.length).toBeGreaterThanOrEqual(
        cumulativeFalse.wcagVersions.length
      );
      expect(cumulativeTrue.wcagLevels.length).toBeGreaterThanOrEqual(
        cumulativeFalse.wcagLevels.length
      );
    });
  });

  describe('Integration scenarios', () => {
    it('should work together in a typical analysis flow', () => {
      const header = {
        'accept-language': 'es-ES,en;q=0.9',
      };

      const lang = getPreferredLang(header);
      const severity = mapImpactToSeverity('serious');
      const wcagConfig = getWcagCumulative('2.1', 'AA', true);

      expect(lang).toBe('es');
      expect(severity).toBe('high');
      expect(wcagConfig).toBeInstanceOf(Object);
      expect(wcagConfig.wcagVersions).toBeDefined();
      expect(wcagConfig.wcagLevels).toBeDefined();
    });

    it('should handle all functions with extreme values', () => {
      const header = {};

      const lang = getPreferredLang(header);
      const severity = mapImpactToSeverity('');
      const wcagConfig = getWcagCumulative('', '', false);

      expect(lang).toBe('es');
      expect(severity).toBe('medium');
      expect(wcagConfig).toBeInstanceOf(Object);
      expect(wcagConfig.wcagVersions).toBeDefined();
      expect(wcagConfig.wcagLevels).toBeDefined();
    });
  });
});
