import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import eslintPluginJest from 'eslint-plugin-jest'
import nodeRecommended from 'eslint-plugin-n/configs/recommended-module.js'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import simpleImportSort from 'eslint-plugin-simple-import-sort'

export default [
  {
    ignores: ['coverage', 'node_mdoules', 'test/unit/__mocks__'],
  },
  js.configs.recommended,
  eslintPluginJest.configs['flat/recommended'],
  nodeRecommended,
  eslintConfigPrettier,
  eslintPluginPrettierRecommended,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'n/no-extraneous-import': [
        'error',
        {
          allowModules: ['@jest/globals'],
        },
      ],
      'n/no-process-exit': 'off',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  {
    files: ['test/**/*.js'],
    rules: {
      'no-global-assign': 'off',
    },
  },
]
