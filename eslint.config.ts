import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    ignores: ['**/dist/**'],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'], 
    plugins: { js }, 
    extends: ['js/recommended'], 
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      'no-console': 'warn',
      'prefer-const': 'error',
      'semi': ['error', 'always'],
      'quotes': ['warn', 'single'],
      'indent': ['error', 2],
      'linebreak-style': 'off',
      'no-multiple-empty-lines': ['error', { 'max': 1, 'maxEOF': 0 }],
      'comma-dangle': ['error', 'always-multiline'],
    },
  },
  tseslint.configs.recommended,
  {
    files: ['**/babel.config.{js,cjs}', '**/jest.config.{js,cjs,ts}', '**/metro.config.{js,cjs}', '**/*.config.js'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);
