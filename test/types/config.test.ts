import { test, expectTypeOf } from 'vitest'

import { type Configuration, defineConfig } from '../../lib/config.js'

test('lint-staged TypeScript types', () => {
  expectTypeOf({
    '*.ext1': 'oxlint',

    '*.ext2': ['oxlint', 'oxfmt'],

    '*.ext3': (files: readonly string[]) => {
      return `oxlint ${files.join(' ')}`
    },

    '*.ext4': (files: readonly string[]) => {
      return [`oxlint ${files.join(' ')}`, `oxfmt --write ${files.join(' ')}`]
    },

    '*.ext5': async (files: readonly string[]) => {
      return `oxlint ${files.join(' ')}`
    },

    '*.ext6': async (files: readonly string[]) => {
      return [`oxlint ${files.join(' ')}`, `oxfmt --write ${files.join(' ')}`]
    },

    '*.ext7': {
      title: 'Sync Function Task',
      task: (files: readonly string[]) => {
        console.log(files)
      },
    },

    '*.ext8': {
      title: 'Async Function Task',
      task: async (files: readonly string[]) => {
        console.log(files)
      },
    },

    '*.ext9': [['oxfmt', 'oxlint']],

    '*.ext10': ['oxfmt', ['oxlint', () => 'tsc']],
  }).toExtend<Configuration>()

  expectTypeOf((files: readonly string[]) => {
    return `oxlint ${files.join(' ')}`
  }).toExtend<Configuration>()

  expectTypeOf((files: readonly string[]) => {
    return [`oxlint ${files.join(' ')}`, `oxfmt --write ${files.join(' ')}`]
  }).toExtend<Configuration>()

  expectTypeOf(async (files: readonly string[]) => {
    return [`oxlint ${files.join(' ')}`, `oxfmt --write ${files.join(' ')}`]
  }).toExtend<Configuration>()

  expectTypeOf(async (files: readonly string[]) => {
    return [`oxlint ${files.join(' ')}`, `oxfmt --write ${files.join(' ')}`]
  }).toExtend<Configuration>()

  expectTypeOf(defineConfig).parameter(0).toEqualTypeOf<Configuration>()
})
