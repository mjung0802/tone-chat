import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  { 
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'], 
    plugins: { js }, 
    extends: ['js/recommended'], 
    languageOptions: { globals: globals.browser },
    linterOptions: {

    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      'no-console': 'warn',
      'prefer-const': 'error',
      'semi': ['error', 'always'],
      'quotes': ['warn', 'single'],
      'indent': ['error', 2],
      'linebreak-style': ['error', 'unix'],
      'no-multiple-empty-lines': ['error', { 'max': 1, 'maxEOF': 0 }],
      'comma-dangle': ['error', 'always-multiline'],
    },
  },
  tseslint.configs.recommended,
]);
