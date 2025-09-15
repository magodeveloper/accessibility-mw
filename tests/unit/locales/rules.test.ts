/**
 * Tests unitarios para locales/rules.ts
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import rules, { getRuleDescription } from '../../../src/locales/rules';

// Mock the JSON files
jest.mock(
  '../../../src/locales/rules.es.json',
  () => [
    {
      code: '1.1.1',
      principle: 'perceptible',
      guideline: 'Proporcionar texto alternativo',
      description: 'Proporciona texto alternativo para imágenes',
      level: 'A',
      version: '2.0',
    },
    {
      code: '2.1.1',
      principle: 'operable',
      guideline: 'Accesible por teclado',
      description: 'Todo el contenido debe ser accesible por teclado',
      level: 'A',
      version: '2.0',
    },
    {
      code: '3.1.1',
      principle: 'comprensible',
      guideline: 'Idioma de la página',
      description:
        'El idioma principal de la página se puede identificar programáticamente',
      level: 'A',
      version: '2.0',
    },
  ],
  { virtual: true }
);

jest.mock(
  '../../../src/locales/rules.en.json',
  () => [
    {
      code: '1.1.1',
      principle: 'perceivable',
      guideline: 'Provide text alternatives',
      description: 'Provide text alternatives for images',
      level: 'A',
      version: '2.0',
    },
    {
      code: '2.1.1',
      principle: 'operable',
      guideline: 'Keyboard accessible',
      description: 'All content should be keyboard accessible',
      level: 'A',
      version: '2.0',
    },
    {
      code: '3.1.1',
      principle: 'understandable',
      guideline: 'Language of page',
      description:
        'The primary language of the page can be programmatically identified',
      level: 'A',
      version: '2.0',
    },
  ],
  { virtual: true }
);

describe('Locales Rules', () => {
  beforeEach(() => {
    // Clear the rules cache between tests
    jest.clearAllMocks();
  });

  describe('getRuleDescription function', () => {
    it('should return description for existing code in Spanish (default)', () => {
      const result = getRuleDescription('1.1.1');
      expect(result).toBe('Proporciona texto alternativo para imágenes');
    });

    it('should return description for existing code in Spanish explicitly', () => {
      const result = getRuleDescription('1.1.1', 'es');
      expect(result).toBe('Proporciona texto alternativo para imágenes');
    });

    it('should return description for existing code in English', () => {
      const result = getRuleDescription('1.1.1', 'en');
      expect(result).toBe('Provide text alternatives for images');
    });

    it('should return undefined for non-existing code', () => {
      const result = getRuleDescription('999.999.999');
      expect(result).toBeUndefined();
    });

    it('should search by guideline field', () => {
      const result = getRuleDescription(
        'Proporcionar texto alternativo',
        'es',
        'guideline'
      );
      expect(result).toBe('Proporciona texto alternativo para imágenes');
    });

    it('should search by level field', () => {
      const result = getRuleDescription('A', 'es', 'level');
      expect(result).toBe('Proporciona texto alternativo para imágenes'); // First match
    });

    it('should search by version field', () => {
      const result = getRuleDescription('2.0', 'es', 'version');
      expect(result).toBe('Proporciona texto alternativo para imágenes'); // First match
    });

    it('should search by guideline field in English', () => {
      const result = getRuleDescription(
        'Provide text alternatives',
        'en',
        'guideline'
      );
      expect(result).toBe('Provide text alternatives for images');
    });

    it('should use default field parameter (code)', () => {
      const result1 = getRuleDescription('2.1.1');
      const result2 = getRuleDescription('2.1.1', 'es', 'code');
      expect(result1).toBe(result2);
      expect(result1).toBe('Todo el contenido debe ser accesible por teclado');
    });

    it('should use default language parameter (es)', () => {
      const result1 = getRuleDescription('3.1.1');
      const result2 = getRuleDescription('3.1.1', 'es');
      expect(result1).toBe(result2);
      expect(result1).toBe(
        'El idioma principal de la página se puede identificar programáticamente'
      );
    });

    it('should handle different rule codes', () => {
      const testCases = [
        {
          code: '1.1.1',
          lang: 'es',
          expected: 'Proporciona texto alternativo para imágenes',
        },
        {
          code: '2.1.1',
          lang: 'es',
          expected: 'Todo el contenido debe ser accesible por teclado',
        },
        {
          code: '3.1.1',
          lang: 'es',
          expected:
            'El idioma principal de la página se puede identificar programáticamente',
        },
        {
          code: '1.1.1',
          lang: 'en',
          expected: 'Provide text alternatives for images',
        },
        {
          code: '2.1.1',
          lang: 'en',
          expected: 'All content should be keyboard accessible',
        },
        {
          code: '3.1.1',
          lang: 'en',
          expected:
            'The primary language of the page can be programmatically identified',
        },
      ];

      testCases.forEach(({ code, lang, expected }) => {
        expect(getRuleDescription(code, lang)).toBe(expected);
      });
    });

    it('should fallback to Spanish when language not found', () => {
      const result = getRuleDescription('1.1.1', 'fr'); // French not available
      expect(result).toBe('Proporciona texto alternativo para imágenes');
    });

    it('should handle empty query string', () => {
      const result = getRuleDescription('');
      expect(result).toBeUndefined();
    });

    it('should handle undefined query gracefully', () => {
      const result = getRuleDescription(undefined as any);
      expect(result).toBeUndefined();
    });

    it('should handle null query gracefully', () => {
      const result = getRuleDescription(null as any);
      expect(result).toBeUndefined();
    });

    it('should return exact matches only', () => {
      // Partial matches should not work
      const result = getRuleDescription('1.1');
      expect(result).toBeUndefined();
    });

    it('should be case sensitive for field searches', () => {
      const result = getRuleDescription(
        'proporcionar texto alternativo',
        'es',
        'guideline'
      ); // lowercase
      expect(result).toBeUndefined();
    });
  });

  describe('rules default export', () => {
    it('should export rules object with getRules function', () => {
      expect(rules).toBeDefined();
      expect(typeof rules).toBe('object');
      expect(typeof rules.getRules).toBe('function');
    });

    it('should return Spanish rules by default', () => {
      const result = rules.getRules('es');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('code');
      expect(result[0]).toHaveProperty('description');
    });

    it('should return English rules when requested', () => {
      const result = rules.getRules('en');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('code');
      expect(result[0]).toHaveProperty('description');
    });

    it('should return Spanish rules for unknown language', () => {
      const result = rules.getRules('unknown');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      // Should return Spanish rules as fallback
      // The first rule should have Spanish content
      expect(result[0]).toHaveProperty('description');
      expect(typeof result[0].description).toBe('string');
      expect(result[0].description.length).toBeGreaterThan(0);
    });

    it('should cache rules for performance', () => {
      // First call
      const result1 = rules.getRules('es');
      // Second call should return cached result
      const result2 = rules.getRules('es');
      expect(result1).toBe(result2); // Same reference (cached)
    });

    it('should have consistent structure for all rules', () => {
      const esRules = rules.getRules('es');
      const enRules = rules.getRules('en');

      const validateRuleStructure = (rule: any) => {
        expect(rule).toHaveProperty('code');
        expect(rule).toHaveProperty('guideline');
        expect(rule).toHaveProperty('description');
        expect(rule).toHaveProperty('level');
        expect(rule).toHaveProperty('version');

        expect(typeof rule.code).toBe('string');
        expect(typeof rule.guideline).toBe('string');
        expect(typeof rule.description).toBe('string');
        expect(typeof rule.level).toBe('string');
        expect(typeof rule.version).toBe('string');
      };

      esRules.forEach(validateRuleStructure);
      enRules.forEach(validateRuleStructure);
    });
  });

  describe('integration tests', () => {
    it('should work consistently between getRules and getRuleDescription', () => {
      const esRules = rules.getRules('es');
      const firstRule = esRules[0];

      const description = getRuleDescription(firstRule.code, 'es');
      expect(description).toBe(firstRule.description);
    });

    it('should handle all search fields correctly', () => {
      const esRules = rules.getRules('es');
      const testRule = esRules[0];

      const byCode = getRuleDescription(testRule.code, 'es', 'code');
      const byGuideline = getRuleDescription(
        testRule.guideline,
        'es',
        'guideline'
      );
      const byLevel = getRuleDescription(testRule.level, 'es', 'level');
      const byVersion = getRuleDescription(testRule.version, 'es', 'version');

      expect(byCode).toBe(testRule.description);
      expect(byGuideline).toBe(testRule.description);
      expect(byLevel).toBeDefined(); // Might match multiple rules
      expect(byVersion).toBeDefined(); // Might match multiple rules
    });

    it('should maintain language consistency', () => {
      const esRules = rules.getRules('es');
      const enRules = rules.getRules('en');

      expect(esRules.length).toBe(enRules.length);

      // Helper function to validate rule consistency
      const validateRuleConsistency = (esRule: any) => {
        const enRule = enRules.find(r => r.code === esRule.code);
        expect(enRule).toBeDefined();
        if (enRule) {
          expect(enRule.level).toBe(esRule.level);
          expect(enRule.version).toBe(esRule.version);
        }
      };

      // Each Spanish rule should have an English counterpart with same code
      esRules.forEach(validateRuleConsistency);
    });
  });
});
