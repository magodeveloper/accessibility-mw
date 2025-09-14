/**
 * Tests unitarios para locales/index.ts
 */

import locales, { t } from '../../../src/locales/index';

describe('Locales Index', () => {
  describe('t function', () => {
    it('should return message in default language (Spanish)', () => {
      const result = t('analysis_saved');
      expect(result).toBe(
        'Análisis y resultados guardados exitosamente en la base de datos.'
      );
    });

    it('should return message in Spanish when explicitly requested', () => {
      const result = t('analysis_saved', 'es');
      expect(result).toBe(
        'Análisis y resultados guardados exitosamente en la base de datos.'
      );
    });

    it('should return message in English when requested', () => {
      const result = t('analysis_saved', 'en');
      expect(result).toBe(
        'Analysis and results successfully saved to the database.'
      );
    });

    it('should return Spanish fallback when key exists in Spanish but not in requested language', () => {
      const result = t('analysis_saved', 'fr'); // French not available
      expect(result).toBe(
        'Análisis y resultados guardados exitosamente en la base de datos.'
      );
    });

    it('should return the key itself when key does not exist in any language', () => {
      const result = t('non_existent_key');
      expect(result).toBe('non_existent_key');
    });

    it('should return the key itself when key does not exist in any language with custom lang', () => {
      const result = t('non_existent_key', 'en');
      expect(result).toBe('non_existent_key');
    });

    it('should handle various translation keys', () => {
      const testCases = [
        {
          key: 'analysis_partial',
          lang: 'es',
          expected:
            'Análisis guardado, pero algunos resultados o errores no se pudieron guardar.',
        },
        {
          key: 'analysis_partial',
          lang: 'en',
          expected:
            'Analysis saved, but some results or errors could not be saved.',
        },
        {
          key: 'validation_error',
          lang: 'es',
          expected: 'Error de validación.',
        },
        { key: 'validation_error', lang: 'en', expected: 'Validation error.' },
        {
          key: 'timeout_error',
          lang: 'es',
          expected: 'El análisis excedió el tiempo de espera.',
        },
        { key: 'timeout_error', lang: 'en', expected: 'Analysis timed out.' },
      ];

      testCases.forEach(({ key, lang, expected }) => {
        expect(t(key, lang)).toBe(expected);
      });
    });

    it('should use default parameter for language', () => {
      // Test that the default parameter works
      const result1 = t('internal_error');
      const result2 = t('internal_error', 'es');
      expect(result1).toBe(result2);
      expect(result1).toBe('Error interno.');
    });

    it('should handle empty string key', () => {
      const result = t('');
      expect(result).toBe('');
    });

    it('should handle undefined language gracefully', () => {
      const result = t('analysis_saved', undefined as any);
      expect(result).toBe(
        'Análisis y resultados guardados exitosamente en la base de datos.'
      );
    });

    it('should handle null language gracefully', () => {
      const result = t('analysis_saved', null as any);
      expect(result).toBe(
        'Análisis y resultados guardados exitosamente en la base de datos.'
      );
    });
  });

  describe('locales default export', () => {
    it('should export locales object', () => {
      expect(locales).toBeDefined();
      expect(typeof locales).toBe('object');
    });

    it('should contain Spanish locales', () => {
      expect(locales.es).toBeDefined();
      expect(typeof locales.es).toBe('object');
      expect(locales.es.analysis_saved).toBe(
        'Análisis y resultados guardados exitosamente en la base de datos.'
      );
    });

    it('should contain English locales', () => {
      expect(locales.en).toBeDefined();
      expect(typeof locales.en).toBe('object');
      expect(locales.en.analysis_saved).toBe(
        'Analysis and results successfully saved to the database.'
      );
    });

    it('should have matching keys in both languages', () => {
      const esKeys = Object.keys(locales.es);
      const enKeys = Object.keys(locales.en);

      expect(esKeys.length).toBeGreaterThan(0);
      expect(enKeys.length).toBeGreaterThan(0);

      // All Spanish keys should exist in English
      esKeys.forEach(key => {
        expect(locales.en).toHaveProperty(key);
      });

      // All English keys should exist in Spanish
      enKeys.forEach(key => {
        expect(locales.es).toHaveProperty(key);
      });
    });

    it('should have consistent key-value structure', () => {
      const esKeys = Object.keys(locales.es);

      esKeys.forEach(key => {
        expect(typeof locales.es[key]).toBe('string');
        expect(typeof locales.en[key]).toBe('string');
        expect(locales.es[key].length).toBeGreaterThan(0);
        expect(locales.en[key].length).toBeGreaterThan(0);
      });
    });
  });

  describe('integration tests', () => {
    it('should work consistently between direct locale access and t function', () => {
      const directAccess = locales.es.analysis_saved;
      const functionAccess = t('analysis_saved', 'es');

      expect(directAccess).toBe(functionAccess);
    });

    it('should handle all available translation keys', () => {
      const allKeys = Object.keys(locales.es);

      allKeys.forEach(key => {
        const esResult = t(key, 'es');
        const enResult = t(key, 'en');

        expect(esResult).toBe(locales.es[key]);
        expect(enResult).toBe(locales.en[key]);
        expect(esResult).not.toBe(enResult); // Should be different translations
      });
    });
  });
});
