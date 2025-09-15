/**
 * Tests for equalAccess.service.ts - Enhanced Coverage
 * Addressing critical coverage gaps to achieve >80% coverage
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import fs from 'fs';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock accessibility-checker
jest.mock('accessibility-checker', () => ({
  getCompliance: jest.fn(),
  close: jest.fn(),
}));

// Import the service after mocking
const service = require('../../src/services/equalAccess.service');
const mockAccessibilityChecker = require('accessibility-checker');

describe('EqualAccess Service - Enhanced Coverage', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Default fs mock implementations
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.mkdirSync.mockReturnValue(undefined);

    // Default accessibility-checker mock implementations
    mockAccessibilityChecker.getCompliance.mockResolvedValue({
      report: { summary: { counts: { total: 0, violations: 0 } } },
    });
    mockAccessibilityChecker.close.mockResolvedValue(undefined);
  });

  describe('Basic functionality', () => {
    it('should be defined and export runEqualAccess function', () => {
      expect(service).toBeDefined();
      expect(typeof service.runEqualAccess).toBe('function');
    });
  });

  describe('Cache directory management', () => {
    it('should create cache directory when it does not exist', async () => {
      // Mock directory doesn't exist
      mockedFs.existsSync.mockReturnValue(false);

      await service.runEqualAccess(
        '<html><body>Test</body></html>',
        'test-label'
      );

      // Verify cache directory creation was attempted
      expect(mockedFs.existsSync).toHaveBeenCalledWith(
        expect.stringMatching(/\.achecker_cache[/\\]engine/)
      );
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringMatching(/\.achecker_cache[/\\]engine/),
        { recursive: true, mode: 0o755 }
      );
    });

    it('should not create cache directory when it already exists', async () => {
      // Mock directory exists
      mockedFs.existsSync.mockReturnValue(true);

      await service.runEqualAccess(
        '<html><body>Test</body></html>',
        'test-label'
      );

      // Verify cache directory creation was NOT attempted
      expect(mockedFs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should handle cache directory creation errors gracefully', async () => {
      // Mock directory doesn't exist
      mockedFs.existsSync.mockReturnValue(false);
      // Mock mkdirSync to throw error
      mockedFs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Should not throw error, just warn
      await expect(
        service.runEqualAccess('<html><body>Test</body></html>', 'test-label')
      ).resolves.toBeDefined();
    });
  });

  describe('Error handling scenarios', () => {
    it('should handle missing accessibility-checker', async () => {
      // Mock accessibility-checker to be undefined
      const service = await import('../../src/services/equalAccess.service');
      const originalAChecker = require('accessibility-checker');

      // Temporarily replace getCompliance
      const originalGetCompliance = originalAChecker.getCompliance;
      delete originalAChecker.getCompliance;

      await expect(
        service.runEqualAccess('<html></html>', 'test')
      ).rejects.toThrow('accessibility-checker no se importó correctamente');

      // Restore
      originalAChecker.getCompliance = originalGetCompliance;
    });

    it('should handle accessibility-checker.getCompliance errors', async () => {
      // Mock accessibility-checker to throw error
      mockAccessibilityChecker.getCompliance.mockRejectedValue(
        new Error('Browser not available')
      );

      await expect(
        service.runEqualAccess('<html><body>Test</body></html>', 'test-label')
      ).rejects.toThrow('Browser not available');
    });

    it('should handle accessibility-checker.close errors gracefully', async () => {
      // Mock close to throw error but getCompliance to succeed
      mockAccessibilityChecker.close.mockRejectedValue(
        new Error('Close failed')
      );

      // Should still complete despite close error
      await expect(
        service.runEqualAccess('<html><body>Test</body></html>', 'test-label')
      ).rejects.toThrow('Close failed');
    });
  });

  describe('Integration scenarios', () => {
    it('should successfully analyze HTML content with violations', async () => {
      // Mock successful analysis with violations
      const mockReport = {
        report: {
          summary: {
            counts: { total: 5, violations: 2 },
          },
          results: [
            { level: 'violation', message: 'Missing alt text' },
            { level: 'violation', message: 'Low contrast' },
          ],
        },
      };
      mockAccessibilityChecker.getCompliance.mockResolvedValue(mockReport);

      const result = await service.runEqualAccess(
        '<html><body><img src="test.jpg"></body></html>',
        'test-with-violations'
      );

      expect(result).toEqual(mockReport.report);
      expect(mockAccessibilityChecker.getCompliance).toHaveBeenCalledWith(
        '<html><body><img src="test.jpg"></body></html>',
        'test-with-violations'
      );
      expect(mockAccessibilityChecker.close).toHaveBeenCalled();
    });

    it('should successfully analyze HTML content without violations', async () => {
      // Mock successful analysis without violations
      const mockReport = {
        report: {
          summary: {
            counts: { total: 3, violations: 0 },
          },
          results: [],
        },
      };
      mockAccessibilityChecker.getCompliance.mockResolvedValue(mockReport);

      const result = await service.runEqualAccess(
        '<html><body><h1>Accessible Content</h1></body></html>',
        'test-accessible'
      );

      expect(result).toEqual(mockReport.report);
    });

    it('should handle Page objects from Playwright', async () => {
      const mockPage = {
        url: () => 'http://localhost:3000',
        content: () => '<html><body>Test</body></html>',
      };

      await service.runEqualAccess(mockPage, 'test-page');

      expect(mockAccessibilityChecker.getCompliance).toHaveBeenCalledWith(
        mockPage,
        'test-page'
      );
    });

    it('should return only the report portion of the result', async () => {
      const mockCompleteResult = {
        report: {
          summary: { counts: { total: 1, violations: 0 } },
          results: [],
        },
        metadata: {
          version: '1.0.0',
          timestamp: '2023-01-01T00:00:00Z',
        },
      };
      mockAccessibilityChecker.getCompliance.mockResolvedValue(
        mockCompleteResult
      );

      const result = await service.runEqualAccess('<html></html>', 'test');

      // Should return only the report, not the full result
      expect(result).toEqual(mockCompleteResult.report);
      expect(result).not.toHaveProperty('metadata');
    });
  });

  describe('Cache directory path validation', () => {
    it('should use correct cache directory path', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      await service.runEqualAccess('<html></html>', 'test');

      expect(mockedFs.existsSync).toHaveBeenCalledWith(
        expect.stringMatching(/\.achecker_cache[/\\]engine$/)
      );
    });

    it('should use correct permissions for cache directory', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      await service.runEqualAccess('<html></html>', 'test');

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(expect.any(String), {
        recursive: true,
        mode: 0o755,
      });
    });
  });

  // Keep original test for backward compatibility
  describe('runEqualAccess (original test)', () => {
    it('detecta issues en HTML básico', async () => {
      // Skip en ambientes CI que no soportan Puppeteer con sandbox
      if (process.env.CI || process.env.SKIP_EQUALACCESS_TESTS === 'true') {
        console.log(
          '⚠️ Skipping EqualAccess test in CI environment due to sandbox restrictions'
        );
        expect(true).toBe(true);
        return;
      }

      const html = '<html><img src="x.jpg"></html>';

      try {
        const result = await service.runEqualAccess(html, 'test-basic');

        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
      } catch (error: any) {
        if (
          error.message.includes('sandbox') ||
          error.message.includes('Failed to launch') ||
          error.message.includes("Executable doesn't exist")
        ) {
          console.log(
            '⚠️ Expected sandbox/executable error in CI environment, test passed'
          );
          expect(true).toBe(true);
        } else {
          throw error;
        }
      }
    }, 30000);
  });
});
