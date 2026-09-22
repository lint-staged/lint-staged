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

    '*.ext9': {
      title: 'Async Function Task with output logger function',
      task: async (files: readonly string[], { log }: { log: (...args: any[]) => void }) => {
        log(files)
      },
    },

    '*.ext10': [['oxfmt', 'oxlint']],

    '*.ext11': ['oxfmt', ['oxlint', () => 'tsc']],

    '*.ext12': () => ['before', ['oxfmt', 'oxlint'], 'after'],

    '*.ext13': async () => ['before', ['oxfmt', 'oxlint'], 'after'],

    '*.ext14': ['before', () => ['oxfmt', 'oxlint'], 'after'],

    '*.ext15': ['before', async () => ['oxfmt', 'oxlint'], 'after'],

    '*.ext16': [['oxfmt', async () => 'oxlint']],
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

  expectTypeOf(() => ['before', ['oxfmt', 'oxlint'], 'after']).toExtend<Configuration>()
  expectTypeOf(async () => [['oxfmt', 'oxlint']]).toExtend<Configuration>()

  expectTypeOf({ '*': ['before', () => [['oxfmt', 'oxlint']]] }).not.toExtend<Configuration>()
  expectTypeOf({ '*': [['oxfmt', () => ['oxlint']]] }).not.toExtend<Configuration>()
  expectTypeOf({ '*': () => [[['oxfmt']]] }).not.toExtend<Configuration>()
  expectTypeOf({ '*': () => ['oxfmt', false] }).not.toExtend<Configuration>()
  expectTypeOf({ '*': () => () => 'oxfmt' }).not.toExtend<Configuration>()
})
