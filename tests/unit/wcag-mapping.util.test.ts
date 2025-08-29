import {
  axeWcagMapping,
  equalAccessWcagMapping,
  getWcagCriterionId,
  getWcagMapping,
  isValidWcagCriterion,
  type WcagLevel,
  type WcagVersion,
} from '../../src/utils/wcag-mapping';

// Helper functions to reduce nesting
function testMappingForRules(rules: Array<{ id: string; expected: any }>) {
  rules.forEach(({ id, expected }) => {
    const item = { id };
    const result = getWcagMapping(item);
    expect(result).toEqual(expected);
  });
}

function testMappingForPatternRules(ruleIds: string[], expectedMapping: any) {
  ruleIds.forEach(ruleId => {
    const item = { id: ruleId };
    const result = getWcagMapping(item);
    expect(result).toEqual(expectedMapping);
  });
}

function testDefaultMapping(items: any[]) {
  items.forEach(item => {
    const result = getWcagMapping(item as any);
    expect(result).toEqual({
      criterion: '4.1.2',
      level: 'A',
      version: '2.1',
    });
  });
}

describe('WCAG Mapping Utilities', () => {
  describe('getWcagMapping', () => {
    describe('Existing WCAG information', () => {
      it('should return existing WCAG information from item', () => {
        const item = {
          id: 'test-rule',
          wcag: {
            criterion: '1.2.3',
            level: 'AA' as WcagLevel,
            version: '2.2' as WcagVersion,
          },
        };

        const result = getWcagMapping(item);

        expect(result).toEqual({
          criterion: '1.2.3',
          level: 'AA',
          version: '2.2',
        });
      });

      it('should use default level and version when only criterion is provided', () => {
        const item = {
          id: 'test-rule',
          wcag: {
            criterion: '1.1.1',
          },
        };

        const result = getWcagMapping(item);

        expect(result).toEqual({
          criterion: '1.1.1',
          level: 'A',
          version: '2.1',
        });
      });
    });

    describe('Axe-core mapping', () => {
      it('should return correct mapping for known axe-core rules', () => {
        const testCases = [
          {
            id: 'area-alt',
            expected: { criterion: '1.1.1', level: 'A', version: '2.0' },
          },
          {
            id: 'color-contrast',
            expected: { criterion: '1.4.3', level: 'AA', version: '2.0' },
          },
          {
            id: 'button-name',
            expected: { criterion: '4.1.2', level: 'A', version: '2.0' },
          },
          {
            id: 'bypass',
            expected: { criterion: '2.4.1', level: 'A', version: '2.0' },
          },
          {
            id: 'document-title',
            expected: { criterion: '2.4.2', level: 'A', version: '2.0' },
          },
        ];

        testMappingForRules(testCases);
      });

      it('should work with ruleId property instead of id', () => {
        const item = { ruleId: 'color-contrast' };
        const result = getWcagMapping(item);

        expect(result).toEqual({
          criterion: '1.4.3',
          level: 'AA',
          version: '2.0',
        });
      });
    });

    describe('Equal Access mapping', () => {
      it('should return correct mapping for known Equal Access rules', () => {
        const testCases = [
          {
            id: 'html_lang_exists',
            expected: { criterion: '3.1.1', level: 'A', version: '2.0' },
          },
          {
            id: 'page_title_exists',
            expected: { criterion: '2.4.2', level: 'A', version: '2.0' },
          },
          {
            id: 'img_alt_exists',
            expected: { criterion: '1.1.1', level: 'A', version: '2.0' },
          },
          {
            id: 'color_contrast_sufficient',
            expected: { criterion: '1.4.3', level: 'AA', version: '2.0' },
          },
          {
            id: 'focus_visible',
            expected: { criterion: '2.4.7', level: 'AA', version: '2.0' },
          },
        ];

        testMappingForRules(testCases);
      });
    });

    describe('Fallback pattern matching', () => {
      it('should handle color/contrast related rules', () => {
        const ruleIds = [
          'custom-color-rule',
          'contrast-check',
          'background-color-issue',
          'text-contrast-problem',
        ];

        testMappingForPatternRules(ruleIds, {
          criterion: '1.4.3',
          level: 'AA',
          version: '2.0',
        });
      });

      it('should handle aria/role related rules', () => {
        const ruleIds = [
          'custom-aria-rule',
          'role-validation',
          'aria-label-missing',
          'invalid-role',
        ];

        testMappingForPatternRules(ruleIds, {
          criterion: '4.1.2',
          level: 'A',
          version: '2.0',
        });
      });

      it('should handle heading/title related rules', () => {
        const ruleIds = [
          'heading-structure',
          'title-missing',
          'heading-order',
          'page-title',
        ];

        testMappingForPatternRules(ruleIds, {
          criterion: '2.4.6',
          level: 'AA',
          version: '2.0',
        });
      });

      it('should handle label/form related rules', () => {
        const ruleIds = [
          'form-validation',
          'label-missing',
          'input-label',
          'form-field',
        ];

        testMappingForPatternRules(ruleIds, {
          criterion: '4.1.2',
          level: 'A',
          version: '2.0',
        });
      });

      it('should handle image/img/alt related rules', () => {
        const ruleIds = [
          'image-alt-missing',
          'img-without-alt',
          'alt-text-empty',
          'decorative-image',
        ];

        testMappingForPatternRules(ruleIds, {
          criterion: '1.1.1',
          level: 'A',
          version: '2.0',
        });
      });

      it('should handle link related rules', () => {
        const ruleIds = [
          'link-text-missing',
          'link-name',
          'empty-link',
          'link-purpose',
        ];

        testMappingForPatternRules(ruleIds, {
          criterion: '2.4.4',
          level: 'A',
          version: '2.0',
        });
      });

      it('should handle lang/language related rules', () => {
        const ruleIds = [
          'lang-missing',
          'language-invalid',
          'html-lang',
          'page-language',
        ];

        testMappingForPatternRules(ruleIds, {
          criterion: '3.1.1',
          level: 'A',
          version: '2.0',
        });
      });

      it('should handle focus/keyboard related rules', () => {
        const ruleIds = [
          'focus-management',
          'keyboard-navigation',
          'focus-visible',
          'keyboard-trap',
        ];

        testMappingForPatternRules(ruleIds, {
          criterion: '2.1.1',
          level: 'A',
          version: '2.0',
        });
      });
    });

    describe('Default fallback cases', () => {
      it('should return default mapping for items without rule ID', () => {
        const testCases = [
          {},
          { id: undefined },
          { ruleId: undefined },
          { id: null },
          { ruleId: null },
          { id: '' },
          { ruleId: '' },
        ];

        testDefaultMapping(testCases);
      });

      it('should return default mapping for unknown rule IDs', () => {
        const ruleIds = [
          'unknown-rule',
          'custom-validation',
          'proprietary-check',
          'random-rule-id',
        ];

        testMappingForPatternRules(ruleIds, {
          criterion: '4.1.2',
          level: 'A',
          version: '2.1',
        });
      });
    });

    describe('Edge cases and combinations', () => {
      it('should handle rules with multiple keywords', () => {
        const item = { id: 'aria-color-contrast-focus' };
        const result = getWcagMapping(item);

        // Should match the first pattern found (color in this case)
        expect(result).toEqual({
          criterion: '1.4.3',
          level: 'AA',
          version: '2.0',
        });
      });

      it('should handle case sensitivity', () => {
        const ruleIds = ['ARIA-LABEL', 'Color-Contrast', 'HEADING-Structure'];

        // Should not match due to case sensitivity, return default
        testMappingForPatternRules(ruleIds, {
          criterion: '4.1.2',
          level: 'A',
          version: '2.1',
        });
      });
    });
  });

  describe('getWcagCriterionId', () => {
    it('should convert basic criterion strings to numeric IDs', () => {
      const testCases = [
        { criterion: '1.1.1', expected: 111 },
        { criterion: '2.4.4', expected: 244 },
        { criterion: '3.1.2', expected: 312 },
        { criterion: '4.1.2', expected: 412 },
      ];

      testCases.forEach(({ criterion, expected }) => {
        const result = getWcagCriterionId(criterion);
        expect(result).toBe(expected);
      });
    });

    it('should handle complex criterion strings', () => {
      const testCases = [
        { criterion: '1.4.10', expected: 1410 },
        { criterion: '2.1.4', expected: 214 },
        { criterion: '1.2.3', expected: 123 },
      ];

      testCases.forEach(({ criterion, expected }) => {
        const result = getWcagCriterionId(criterion);
        expect(result).toBe(expected);
      });
    });

    it('should return 1 for invalid or zero IDs', () => {
      const testCases = [
        '0.0.0',
        'invalid',
        '',
        '0.1.0', // This will actually return 10, not 1
        'abc.def.ghi',
      ];

      testCases.forEach(criterion => {
        const result = getWcagCriterionId(criterion);
        // For invalid strings like 'invalid', 'abc.def.ghi', '', it should return 1
        // For numeric strings like '0.0.0', '0.1.0' it will convert to numbers
        if (
          criterion === 'invalid' ||
          criterion === 'abc.def.ghi' ||
          criterion === ''
        ) {
          expect(result).toBe(1);
        } else if (criterion === '0.0.0') {
          expect(result).toBe(1); // Special case: greater than 0 check
        } else if (criterion === '0.1.0') {
          expect(result).toBe(10); // This converts to 10
        }
      });
    });

    it('should handle edge cases', () => {
      const testCases = [
        { criterion: '10.5.20', expected: 10520 },
        { criterion: '1.1.0', expected: 110 },
        { criterion: '0.1.0', expected: 10 }, // Leading zero converts to 10, not 1
      ];

      testCases.forEach(({ criterion, expected }) => {
        const result = getWcagCriterionId(criterion);
        expect(result).toBe(expected);
      });
    });
  });

  describe('isValidWcagCriterion', () => {
    it('should validate correct WCAG criterion formats', () => {
      const validCriteria = [
        '1.1.1',
        '2.4.4',
        '3.1.2',
        '4.1.2',
        '1.4.10',
        '2.1.4',
        '10.20.30',
      ];

      validCriteria.forEach(criterion => {
        const result = isValidWcagCriterion(criterion);
        expect(result).toBe(true);
      });
    });

    it('should reject invalid WCAG criterion formats', () => {
      const invalidCriteria = [
        '1.1',
        '1',
        'abc.def.ghi',
        '1.1.1.1',
        '',
        '1..1',
        '.1.1',
        '1.1.',
        'test',
        '1.a.1',
      ];

      invalidCriteria.forEach(criterion => {
        const result = isValidWcagCriterion(criterion);
        expect(result).toBe(false);
      });
    });

    it('should reject zero criterion as invalid', () => {
      const result = isValidWcagCriterion('0.0.0');
      expect(result).toBe(false);
    });

    it('should handle edge cases', () => {
      const testCases = [
        { criterion: '0.1.1', expected: true }, // Leading zero is accepted by current pattern
        { criterion: '1.0.1', expected: true }, // Middle zero is valid
        { criterion: '1.1.0', expected: true }, // Trailing zero is valid
      ];

      testCases.forEach(({ criterion, expected }) => {
        const result = isValidWcagCriterion(criterion);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Mapping constants validation', () => {
    it('should verify axeWcagMapping contains expected structure', () => {
      expect(typeof axeWcagMapping).toBe('object');
      expect(Object.keys(axeWcagMapping).length).toBeGreaterThan(0);

      // Verify some specific mappings exist
      expect(axeWcagMapping['area-alt']).toEqual({
        criterion: '1.1.1',
        level: 'A',
        version: '2.0',
      });

      expect(axeWcagMapping['color-contrast']).toEqual({
        criterion: '1.4.3',
        level: 'AA',
        version: '2.0',
      });
    });

    it('should verify equalAccessWcagMapping contains expected structure', () => {
      expect(typeof equalAccessWcagMapping).toBe('object');
      expect(Object.keys(equalAccessWcagMapping).length).toBeGreaterThan(0);

      // Verify some specific mappings exist
      expect(equalAccessWcagMapping['html_lang_exists']).toEqual({
        criterion: '3.1.1',
        level: 'A',
        version: '2.0',
      });

      expect(equalAccessWcagMapping['color_contrast_sufficient']).toEqual({
        criterion: '1.4.3',
        level: 'AA',
        version: '2.0',
      });
    });

    it('should verify all mappings have valid criterion format', () => {
      const allMappings = { ...axeWcagMapping, ...equalAccessWcagMapping };

      Object.entries(allMappings).forEach(([ruleId, mapping]) => {
        expect(isValidWcagCriterion(mapping.criterion)).toBe(true);
        expect(['A', 'AA', 'AAA']).toContain(mapping.level);
        expect(['2.0', '2.1', '2.2']).toContain(mapping.version);
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete analysis item with all properties', () => {
      const item = {
        id: 'custom-rule',
        ruleId: 'backup-rule',
        wcag: {
          criterion: '2.4.7',
          level: 'AA' as WcagLevel,
          version: '2.1' as WcagVersion,
        },
        tool: 'axe-core' as const,
        source: 'test-source',
      };

      const result = getWcagMapping(item);

      // Should use existing WCAG info, not fallback to rule mapping
      expect(result).toEqual({
        criterion: '2.4.7',
        level: 'AA',
        version: '2.1',
      });
    });

    it('should work with minimal item information', () => {
      const item = { id: 'area-alt' };
      const result = getWcagMapping(item);

      expect(result).toEqual({
        criterion: '1.1.1',
        level: 'A',
        version: '2.0',
      });
    });

    it('should generate consistent IDs for the same criterion', () => {
      const criterion = '1.4.3';
      const id1 = getWcagCriterionId(criterion);
      const id2 = getWcagCriterionId(criterion);

      expect(id1).toBe(id2);
      expect(id1).toBe(143);
    });

    it('should validate and generate IDs in sequence', () => {
      const criterion = '2.4.7';

      expect(isValidWcagCriterion(criterion)).toBe(true);

      const id = getWcagCriterionId(criterion);
      expect(id).toBe(247);

      const mapping = getWcagMapping({
        wcag: { criterion, level: 'AA', version: '2.0' },
      });
      expect(mapping.criterion).toBe(criterion);
    });
  });
});
