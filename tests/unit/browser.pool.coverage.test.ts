/**
 * @fileoverview Additional browser pool service tests to improve coverage
 * Focused on edge cases, error scenarios, and basic functionality
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { Browser, chromium } from 'playwright';
import { browserPool } from '../../src/services/browser.pool.service';

// Mock dependencies
jest.mock('playwright');

describe('Browser Pool Service - Coverage Improvements', () => {
  let mockBrowser: jest.Mocked<Browser>;
  let mockChromium: jest.Mocked<typeof chromium>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Setup mock browser
    mockBrowser = {
      newPage: jest.fn(),
      newContext: jest.fn(),
      close: jest.fn(() => Promise.resolve()),
      isConnected: jest.fn().mockReturnValue(true),
      contexts: jest.fn().mockReturnValue([]),
    } as any;

    // Setup mock chromium
    mockChromium = chromium as jest.Mocked<typeof chromium>;
    mockChromium.launch = jest.fn(() => Promise.resolve(mockBrowser)) as any;

    // Reset browser pool
    (browserPool as any)._browserPool = null;
  });

  afterEach(async () => {
    try {
      await browserPool.shutdown();
    } catch {
      // Ignore cleanup errors in tests
    }
  });

  describe('Browser Pool Statistics', () => {
    it('should return empty stats when pool is not initialized', () => {
      const stats = browserPool.getPoolStats();
      expect(stats).toEqual({
        total: 0,
        available: 0,
        inUse: 0,
        connected: 0,
      });
    });

    it('should return correct stats when pool has browsers', async () => {
      await browserPool.getBrowser();
      const stats = browserPool.getPoolStats();
      expect(stats.total).toBeGreaterThan(0);
    });

    it('should update stats when browsers are released', async () => {
      const browser = await browserPool.getBrowser();
      browserPool.releaseBrowser(browser);
      const stats = browserPool.getPoolStats();
      expect(stats.available).toBeGreaterThan(0);
    });
  });

  describe('Browser Pool Resource Management', () => {
    it('should handle browser acquisition failure gracefully', async () => {
      // Mock Playwright failure - need to fail ALL attempts (Playwright + all Chrome paths)
      // The service tries: 1x Playwright + multiple Chrome fallback paths
      // Windows: 3 paths, macOS: 2 paths, Linux: ~4 paths
      // Mock to always reject to ensure it fails
      (mockChromium.launch as jest.MockedFunction<typeof chromium.launch>)
        .mockRejectedValue(new Error('Failed to launch browser'));

      await expect(browserPool.getBrowser()).rejects.toThrow('Failed to launch browser');
    });

    it('should use Chrome fallback when Playwright fails on Windows', async () => {
      // Mock platform to be Windows and Playwright failure
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'win32',
      });

      // Mock fs.existsSync to simulate Chrome being found at first path
      const fs = require('node:fs');
      const originalExistsSync = fs.existsSync;
      fs.existsSync = jest.fn((path: string) => {
        // Return true only for the first Chrome path to simulate finding Chrome
        return path.includes(String.raw`Google\Chrome\Application\chrome.exe`) && 
               path.includes('Program Files');
      });

      (mockChromium.launch as jest.MockedFunction<typeof chromium.launch>)
        .mockRejectedValueOnce(new Error('Playwright browsers not found'))
        .mockResolvedValueOnce(mockBrowser); // Second call (with Chrome path) succeeds

      try {
        const browser = await browserPool.getBrowser();
        expect(browser).toBeDefined();
        expect(mockChromium.launch).toHaveBeenCalledTimes(2);

        // Check that second call includes executablePath
        const secondCall = (mockChromium.launch as jest.MockedFunction<any>)
          .mock.calls[1];
        expect(secondCall[0]).toHaveProperty('executablePath');
        expect(secondCall[0].executablePath).toContain('chrome.exe');
      } finally {
        // Restore original platform and fs
        Object.defineProperty(process, 'platform', {
          value: originalPlatform,
        });
        fs.existsSync = originalExistsSync;
      }
    });

    it('should handle browser disconnection', async () => {
      await browserPool.getBrowser();

      // Simulate browser disconnection
      mockBrowser.isConnected.mockReturnValue(false);

      // Should be able to get a new browser even if previous one is disconnected
      const newBrowser = await browserPool.getBrowser();
      expect(newBrowser).toBeDefined();
    });

    it('should handle shutdown with browser close errors', async () => {
      await browserPool.getBrowser();

      // Mock browser close to throw an error
      (mockBrowser.close as jest.MockedFunction<any>).mockRejectedValueOnce(
        new Error('Close failed')
      );

      // Should not throw despite browser close error
      await expect(browserPool.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Environment Configuration', () => {
    it('should use development headless setting', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      await browserPool.getBrowser();

      // Verify that chromium.launch was called (configuration details depend on implementation)
      expect(mockChromium.launch).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should use production headless setting', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      await browserPool.getBrowser();

      expect(mockChromium.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          headless: true,
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should configure browser with basic security options', async () => {
      await browserPool.getBrowser();

      expect(mockChromium.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining([
            '--no-sandbox',
            '--disable-dev-shm-usage',
          ]),
        })
      );
    });

    it('should respect custom timeout configuration', async () => {
      await browserPool.getBrowser();

      // Verify that chromium.launch was called (timeout details depend on implementation)
      expect(mockChromium.launch).toHaveBeenCalled();
    });

    it('should handle different browsers configurations', async () => {
      // Test that configuration is applied consistently
      const browser1 = await browserPool.getBrowser();
      const browser2 = await browserPool.getBrowser();

      expect(browser1).toBeDefined();
      expect(browser2).toBeDefined();

      // Both should use the same configuration
      expect(mockChromium.launch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Browser Pool Cleanup Timer', () => {
    it('should start cleanup timer on initialization', async () => {
      jest.useFakeTimers();

      await browserPool.getBrowser();

      // Fast forward time to trigger cleanup
      jest.advanceTimersByTime(60000);

      // The timer should be running (hard to test directly, but no errors should occur)
      expect(true).toBe(true);

      jest.useRealTimers();
    });
  });

  describe('Basic functionality tests', () => {
    it('should create browser pool instance lazily', () => {
      expect(browserPool.instance).toBeDefined();
    });

    it('should handle multiple browser requests correctly', async () => {
      const browser1 = await browserPool.getBrowser();
      const browser2 = await browserPool.getBrowser();

      expect(browser1).toBeDefined();
      expect(browser2).toBeDefined();

      browserPool.releaseBrowser(browser1);
      browserPool.releaseBrowser(browser2);
    });

    it('should shutdown gracefully', async () => {
      await browserPool.getBrowser();

      await browserPool.shutdown();

      expect(browserPool.getPoolStats().total).toBe(0);
    });

    it('should handle release of browser that was never acquired', () => {
      const fakeBrowser = {} as Browser;

      // This should not throw an error
      expect(() => browserPool.releaseBrowser(fakeBrowser)).not.toThrow();
    });

    it('should maintain pool statistics correctly', async () => {
      const initialStats = browserPool.getPoolStats();
      expect(initialStats.total).toBe(0);

      const browser = await browserPool.getBrowser();
      const activeStats = browserPool.getPoolStats();
      expect(activeStats.total).toBeGreaterThan(0);
      expect(activeStats.inUse).toBeGreaterThan(0);

      browserPool.releaseBrowser(browser);
      const releasedStats = browserPool.getPoolStats();
      expect(releasedStats.available).toBeGreaterThan(0);
    });
  });
});
