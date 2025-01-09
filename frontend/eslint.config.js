import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  prettier, // Disable formatting rules that conflict with Prettier
  {
    ignores: [
      '**/node_modules/*', // Ignore dependencies
      '**/venv/*', // Ignore Python virtual environment
      '**/build/*', // Ignore build directory
      '**/dist/*', // Ignore distribution directory
      'package-lock.json', // Ignore lock file
      'package.json', // Ignore package metadata
      'docs/*', // Ignore documentation files
    ],
  },
  {
    rules: {
      'no-unused-vars': 'warn', // Warn on unused variables
      'no-console': 'off', // Allow console statements
      'no-undef': 'error', // Disallow undefined variables
    },
    languageOptions: {
      ecmaVersion: 2021, // Use modern JavaScript
      sourceType: 'module', // Support ES modules
      parserOptions: {
        ecmaFeatures: {
          jsx: true, // Support JSX
        },
      },
    },
  },
];
