/**
 * ESLint configuration for test files
 * Relaxes rules that are too strict for test code
 */

module.exports = {
  // Apply to all test files
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.spec.ts', 'tests/**/*.ts'],
      rules: {
        // SonarQube S3776 - Cognitive Complexity
        // Tests often need nested functions for setup/teardown/assertions
        'sonarjs/cognitive-complexity': 'off',

        // SonarQube S107 - Too many parameters
        // Test helpers may need many parameters for flexibility
        'sonarjs/no-duplicate-string': 'off',

        // Allow any types in tests for mocking
        '@typescript-eslint/no-explicit-any': 'off',

        // Allow unused vars in tests (common in beforeEach/afterEach)
        '@typescript-eslint/no-unused-vars': 'warn',

        // Allow console in tests
        'no-console': 'off',

        // Allow magic numbers in tests
        'no-magic-numbers': 'off',
        '@typescript-eslint/no-magic-numbers': 'off',

        // Allow function length in tests (describe blocks can be long)
        'max-lines-per-function': 'off',
        'max-lines': 'off',

        // Allow nested callbacks in tests (describe/it/beforeEach structure)
        'max-nested-callbacks': 'off',

        // Jest globals are okay
        'no-undef': 'off',
      },
    },
  ],
};
