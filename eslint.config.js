import js from '@eslint/js'
import vitest from '@vitest/eslint-plugin'
import eslintConfigPrettier from 'eslint-config-prettier'
import nodeRecommended from 'eslint-plugin-n/configs/recommended-module.js'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import simpleImportSort from 'eslint-plugin-simple-import-sort'

export default [
  {
    ignores: ['coverage', 'node_modules', 'test/unit/__mocks__'],
  },
  js.configs.recommended,
  nodeRecommended,
  eslintConfigPrettier,
  eslintPluginPrettierRecommended,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'n/no-extraneous-import': 'error',
      'n/no-process-exit': 'off',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  {
    files: ['test/**/*.js'],
    plugins: {
      vitest,
    },
    rules: {
      ...vitest.configs.recommended.rules,
      'no-global-assign': 'off',
    },
  },
]
