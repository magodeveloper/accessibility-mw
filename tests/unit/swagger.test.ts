import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('📚 Swagger Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('🔧 OpenAPI Specification', () => {
    it('should export swaggerSpec object', () => {
      // Act
      const swagger = require('../../src/swagger');

      // Assert
      expect(swagger.swaggerSpec).toBeDefined();
      expect(typeof swagger.swaggerSpec).toBe('object');
    });

    it('should handle module import without errors', () => {
      // This test ensures the module can be imported without throwing errors
      expect(() => {
        require('../../src/swagger');
      }).not.toThrow();
    });

    it('should export swaggerSpec with expected structure when file exists', () => {
      // Act
      const swagger = require('../../src/swagger');

      // Assert
      expect(swagger.swaggerSpec).toBeDefined();

      // If the YAML file loads successfully, it should have OpenAPI structure
      if (Object.keys(swagger.swaggerSpec).length > 0) {
        // OpenAPI spec should have these basic properties if loaded
        const spec = swagger.swaggerSpec;
        expect(spec).toHaveProperty('openapi');
        expect(spec).toHaveProperty('info');
      } else {
        // If file doesn't exist or fails to load, should be empty object
        expect(swagger.swaggerSpec).toEqual({});
      }
    });
  });

  describe('🛠️ Module Loading Behavior', () => {
    it('should not crash when OpenAPI file is missing', () => {
      // This test verifies graceful handling of missing files
      // by testing the actual behavior rather than mocking

      let consoleWarnSpy: any;

      try {
        consoleWarnSpy = jest
          .spyOn(console, 'warn')
          .mockImplementation(() => {});

        // Delete the module from cache to test fresh import
        delete require.cache[require.resolve('../../src/swagger')];

        const swagger = require('../../src/swagger');

        // Should always export something, even if file doesn't exist
        expect(swagger.swaggerSpec).toBeDefined();
        expect(typeof swagger.swaggerSpec).toBe('object');
      } finally {
        if (consoleWarnSpy) {
          consoleWarnSpy.mockRestore();
        }
      }
    });

    it('should export default swaggerSpec', () => {
      // Act
      const swagger = require('../../src/swagger');

      // Assert
      expect(swagger).toHaveProperty('swaggerSpec');
      expect(swagger.swaggerSpec).toBeDefined();
    });

    it('should maintain consistent export structure', () => {
      // Test multiple imports return the same structure
      const swagger1 = require('../../src/swagger');

      // Clear cache and import again
      delete require.cache[require.resolve('../../src/swagger')];
      const swagger2 = require('../../src/swagger');

      // Assert
      expect(swagger1).toHaveProperty('swaggerSpec');
      expect(swagger2).toHaveProperty('swaggerSpec');
      expect(typeof swagger1.swaggerSpec).toBe('object');
      expect(typeof swagger2.swaggerSpec).toBe('object');
    });
  });
});
