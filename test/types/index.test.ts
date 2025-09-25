import { test, expectTypeOf, expect } from 'vitest'

import lintStaged, { type Configuration, type Options, Logger } from '../../lib/index.js'

test('lint-staged TypeScript types', () => {
  expectTypeOf({
    '*.ext1': 'eslint',

    '*.ext2': ['eslint', 'prettier'],

    '*.ext3': (fileNames: readonly string[]) => {
      return `eslint ${fileNames.join(' ')}`
    },

    '*.ext4': (fileNames: readonly string[]) => {
      return [`eslint ${fileNames.join(' ')}`, `prettier --write ${fileNames.join(' ')}`]
    },

    '*.ext5': async (fileNames: readonly string[]) => {
      return `eslint ${fileNames.join(' ')}`
    },

    '*.ext6': async (fileNames: readonly string[]) => {
      return [`eslint ${fileNames.join(' ')}`, `prettier --write ${fileNames.join(' ')}`]
    },

    '*.ext7': {
      title: 'Sync Function Task',
      task: (fileNames: readonly string[]) => {
        console.log(fileNames)
      },
    },

    '*.ext8': {
      title: 'Async Function Task',
      task: async (fileNames: readonly string[]) => {
        console.log(fileNames)
      },
    },
  }).toExtend<Configuration>()

  expectTypeOf((fileNames: readonly string[]) => {
    return `eslint ${fileNames.join(' ')}`
  }).toExtend<Configuration>()

  expectTypeOf((fileNames: readonly string[]) => {
    return [`eslint ${fileNames.join(' ')}`, `prettier --write ${fileNames.join(' ')}`]
  }).toExtend<Configuration>()

  expectTypeOf(async (fileNames: readonly string[]) => {
    return [`eslint ${fileNames.join(' ')}`, `prettier --write ${fileNames.join(' ')}`]
  }).toExtend<Configuration>()

  expectTypeOf(async (fileNames: readonly string[]) => {
    return [`eslint ${fileNames.join(' ')}`, `prettier --write ${fileNames.join(' ')}`]
  }).toExtend<Configuration>()

  expectTypeOf(lintStaged).toBeFunction()
  expectTypeOf(lintStaged).returns.resolves.toBeBoolean()
  expectTypeOf(lintStaged).parameter(0).toEqualTypeOf<Options>()
  expectTypeOf(lintStaged).parameter(1).toEqualTypeOf<Logger | undefined>()

  expectTypeOf(console).toExtend<Logger>()
})
