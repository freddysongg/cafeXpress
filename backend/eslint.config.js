import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  {
    ignores: [
      '**/venv/*', // Ignore python environment
      'package-lock.json', // Lock file
      'package.json', // Package metadata
      '**/docs/*', // Docs directory
      '**/node_modules/*' // Node_moudles directory
    ]
  },
  prettier, // Disable formatting rules that conflict with Prettier
  {
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off'
    }
  }
];
