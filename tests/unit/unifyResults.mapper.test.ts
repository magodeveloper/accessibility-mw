/**
 * Tests for unifyResults.ts mapper
 * Addressing 0% coverage for critical data transformation logic
 */

import { describe, expect, it } from '@jest/globals';
import {
  buildUnifiedResponse,
  EqualAccessReport,
  mapAxeToUnified,
  mapEqualAccessToUnified,
  UnifiedToolResult,
} from '../../src/mappers/unifyResults';

describe('UnifyResults Mapper', () => {
  describe('mapAxeToUnified', () => {
    it('should map basic axe results correctly', () => {
      const axeResult = {
        violations: [
          {
            id: 'color-contrast',
            help: 'Elements must have sufficient color contrast',
            helpUrl: 'https://example.com/help',
            impact: 'serious',
            nodes: [
              {
                target: ['#button1'],
                html: '<button>Click me</button>',
                failureSummary: 'Fix color contrast',
              },
            ],
          },
        ],
        passes: [
          {
            id: 'alt-text',
            help: 'Images must have alternative text',
            helpUrl: 'https://example.com/alt',
            nodes: [],
          },
        ],
        incomplete: [
          {
            id: 'color-contrast-enhanced',
            help: 'Enhanced color contrast',
            nodes: [],
          },
        ],
        inapplicable: [
          {
            id: 'video-caption',
            help: 'Video captions',
            nodes: [],
          },
        ],
      };

      const result = mapAxeToUnified(axeResult, '2.2', 'AA');

      expect(result.tool).toBe('axe-core');
      expect(result.stats).toEqual({
        violations: 1,
        needsReview: 0,
        recommendations: 0,
        passes: 1,
        incomplete: 1,
        inapplicable: 1,
      });

      expect(result.items).toHaveLength(2); // violations + incomplete
      expect(result.items[0]).toEqual({
        id: 'color-contrast',
        tool: 'axe-core',
        type: 'violation',
        impact: 'serious',
        help: 'Elements must have sufficient color contrast',
        helpUrl: 'https://example.com/help',
        nodes: [
          {
            target: ['#button1'],
            html: '<button>Click me</button>',
            failureSummary: 'Fix color contrast',
          },
        ],
        wcag: { version: '2.2', level: 'AA', criterion: null },
      });
    });

    it('should infer impact from nodes when rule impact is missing', () => {
      const axeResult = {
        violations: [
          {
            id: 'test-rule',
            help: 'Test rule',
            // impact missing
            nodes: [
              { impact: 'moderate' },
              { impact: 'critical' },
              { impact: 'minor' },
            ],
          },
        ],
      };

      const result = mapAxeToUnified(axeResult, '2.1', 'A');

      expect(result.items[0].impact).toBe('critical'); // highest from nodes
    });

    it('should handle empty axe results', () => {
      const emptyResult = {};

      const result = mapAxeToUnified(emptyResult, '2.0', 'AAA');

      expect(result.stats).toEqual({
        violations: 0,
        needsReview: 0,
        recommendations: 0,
        passes: 0,
        incomplete: 0,
        inapplicable: 0,
      });
      expect(result.items).toHaveLength(0);
    });

    it('should handle nodes without impact', () => {
      const axeResult = {
        violations: [
          {
            id: 'test-rule',
            nodes: [
              { target: ['#test'] },
              // no impact field
            ],
          },
        ],
      };

      const result = mapAxeToUnified(axeResult, '2.2', 'AA');

      expect(result.items[0].impact).toBeUndefined();
    });

    it('should prioritize impact order correctly', () => {
      const axeResult = {
        violations: [
          {
            id: 'test-rule',
            nodes: [
              { impact: 'minor' },
              { impact: 'serious' },
              { impact: 'moderate' },
            ],
          },
        ],
      };

      const result = mapAxeToUnified(axeResult, '2.2', 'AA');

      expect(result.items[0].impact).toBe('serious'); // highest priority
    });
  });

  describe('mapEqualAccessToUnified', () => {
    it('should map basic equal access results correctly', () => {
      const eaReport: EqualAccessReport = {
        summary: {
          counts: {
            violation: 2,
            potentialviolation: 1,
            recommendation: 3,
            potentialrecommendation: 1,
            manual: 1,
            pass: 5,
          },
        },
        results: [
          {
            ruleId: 'WCAG20_Input_ExplicitLabel',
            level: 'violation',
            message: 'Form control must have an explicit label',
            snippet: '<input type="text">',
            path: {
              aria: '/html/body/form/input[1]',
            },
            value: ['input', 'missing label'],
          },
          {
            ruleId: 'WCAG20_A_HasText',
            level: 'recommendation',
            message: 'Hyperlink should have descriptive text',
            snippet: '<a href="#">click here</a>',
            path: {
              aria: '/html/body/a[1]',
            },
          },
          {
            ruleId: 'RPT_Header_HasContent',
            level: 'potentialviolation',
            message: 'Header may be empty',
            snippet: '<h1></h1>',
          },
        ],
      };

      const result = mapEqualAccessToUnified(eaReport, '2.2', 'AA');

      expect(result.tool).toBe('equal-access');
      expect(result.stats).toEqual({
        violations: 2,
        needsReview: 3, // potentialviolation + potentialrecommendation + manual
        recommendations: 3,
        passes: 5,
        incomplete: 0,
        inapplicable: 0,
      });

      expect(result.items).toHaveLength(3);

      // Test violation mapping
      expect(result.items[0]).toEqual({
        id: 'WCAG20_Input_ExplicitLabel',
        tool: 'equal-access',
        type: 'violation',
        impact: 'serious',
        help: 'Form control must have an explicit label',
        helpUrl: undefined,
        nodes: [
          {
            target: ['/html/body/form/input[1]'],
            html: '<input type="text">',
            failureSummary: 'input, missing label',
          },
        ],
        wcag: { version: '2.2', level: 'AA', criterion: null },
      });

      // Test recommendation mapping
      expect(result.items[1]).toEqual({
        id: 'WCAG20_A_HasText',
        tool: 'equal-access',
        type: 'recommendation',
        impact: 'moderate',
        help: 'Hyperlink should have descriptive text',
        helpUrl: undefined,
        nodes: [
          {
            target: ['/html/body/a[1]'],
            html: '<a href="#">click here</a>',
            failureSummary: undefined,
          },
        ],
        wcag: { version: '2.2', level: 'AA', criterion: null },
      });

      // Test needsReview mapping
      expect(result.items[2]).toEqual({
        id: 'RPT_Header_HasContent',
        tool: 'equal-access',
        type: 'needsReview',
        impact: 'minor',
        help: 'Header may be empty',
        helpUrl: undefined,
        nodes: [
          {
            target: undefined,
            html: '<h1></h1>',
            failureSummary: undefined,
          },
        ],
        wcag: { version: '2.2', level: 'AA', criterion: null },
      });
    });

    it('should handle empty equal access report', () => {
      const emptyReport: EqualAccessReport = {};

      const result = mapEqualAccessToUnified(emptyReport, '2.1', 'A');

      expect(result.stats).toEqual({
        violations: 0,
        needsReview: 0,
        recommendations: 0,
        passes: 0,
        incomplete: 0,
        inapplicable: 0,
      });
      expect(result.items).toHaveLength(0);
    });

    it('should map impact levels correctly', () => {
      const eaReport: EqualAccessReport = {
        results: [
          { ruleId: 'test1', level: 'violation', message: 'Test' },
          { ruleId: 'test2', level: 'recommendation', message: 'Test' },
          { ruleId: 'test3', level: 'potentialviolation', message: 'Test' },
          {
            ruleId: 'test4',
            level: 'potentialrecommendation',
            message: 'Test',
          },
          { ruleId: 'test5', level: 'manual', message: 'Test' },
          { ruleId: 'test6', level: 'pass', message: 'Test' },
          { ruleId: 'test7', level: 'unknown', message: 'Test' },
        ],
      };

      const result = mapEqualAccessToUnified(eaReport, '2.2', 'AA');

      expect(result.items[0].impact).toBe('serious'); // violation
      expect(result.items[1].impact).toBe('moderate'); // recommendation
      expect(result.items[2].impact).toBe('minor'); // potentialviolation
      expect(result.items[3].impact).toBe('minor'); // potentialrecommendation
      expect(result.items[4].impact).toBe('minor'); // manual
      expect(result.items[5].impact).toBeUndefined(); // pass
      expect(result.items[6].impact).toBeUndefined(); // unknown
    });

    it('should handle missing counts in summary', () => {
      const eaReport: EqualAccessReport = {
        summary: {
          counts: {
            violation: undefined,
            recommendation: 1,
            // other counts missing
          },
        },
        results: [],
      };

      const result = mapEqualAccessToUnified(eaReport, '2.2', 'AA');

      expect(result.stats).toEqual({
        violations: 0, // undefined -> 0
        needsReview: 0, // all missing -> 0
        recommendations: 1,
        passes: 0, // missing -> 0
        incomplete: 0,
        inapplicable: 0,
      });
    });
  });

  describe('buildUnifiedResponse', () => {
    it('should build unified response from multiple tools', () => {
      const axeResult: UnifiedToolResult = {
        tool: 'axe-core',
        stats: {
          violations: 2,
          needsReview: 0,
          recommendations: 0,
          passes: 5,
          incomplete: 1,
          inapplicable: 3,
        },
        items: [],
      };

      const eaResult: UnifiedToolResult = {
        tool: 'equal-access',
        stats: {
          violations: 1,
          needsReview: 3,
          recommendations: 2,
          passes: 8,
          incomplete: 0,
          inapplicable: 0,
        },
        items: [],
      };

      const response = buildUnifiedResponse([axeResult, eaResult]);

      expect(response.ok).toBe(true);
      expect(response.total).toBe(8); // 2+0+0 + 1+3+2 = 8
      expect(response.meta).toEqual({
        'axe-core': {
          violations: 2,
          needsReview: 0,
          recommendations: 0,
          passes: 5,
          incomplete: 1,
          inapplicable: 3,
        },
        'equal-access': {
          violations: 1,
          needsReview: 3,
          recommendations: 2,
          passes: 8,
          incomplete: 0,
          inapplicable: 0,
        },
      });
      expect(response.results).toEqual([axeResult, eaResult]);
    });

    it('should build unified response from single tool', () => {
      const singleResult: UnifiedToolResult = {
        tool: 'axe-core',
        stats: {
          violations: 1,
          needsReview: 0,
          recommendations: 0,
          passes: 2,
          incomplete: 0,
          inapplicable: 0,
        },
        items: [],
      };

      const response = buildUnifiedResponse([singleResult]);

      expect(response.ok).toBe(true);
      expect(response.total).toBe(1); // only 1 violation
      expect(response.meta).toEqual({
        'axe-core': singleResult.stats,
      });
      expect(response.results).toEqual([singleResult]);
    });

    it('should handle empty results array', () => {
      const response = buildUnifiedResponse([]);

      expect(response.ok).toBe(true);
      expect(response.total).toBe(0);
      expect(response.meta).toEqual({});
      expect(response.results).toEqual([]);
    });
  });

  describe('Edge Cases and Robustness', () => {
    it('should handle null and undefined values gracefully', () => {
      const axeResult = {
        violations: [
          {
            id: 'test',
            help: undefined,
            helpUrl: undefined,
            impact: undefined,
            nodes: undefined,
          },
        ],
      };

      const result = mapAxeToUnified(axeResult, '2.2', 'AA');

      expect(result.items[0]).toEqual({
        id: 'test',
        tool: 'axe-core',
        type: 'violation',
        impact: undefined,
        help: undefined,
        helpUrl: undefined,
        nodes: [],
        wcag: { version: '2.2', level: 'AA', criterion: null },
      });
    });

    it('should handle malformed equal access data', () => {
      const eaReport: EqualAccessReport = {
        results: [
          {
            ruleId: 'test',
            // missing required fields
            value: undefined,
            path: undefined,
          },
        ],
      };

      const result = mapEqualAccessToUnified(eaReport, '2.2', 'AA');

      expect(result.items[0]?.nodes?.[0]).toEqual({
        target: undefined,
        html: undefined,
        failureSummary: undefined,
      });
    });
  });
});
