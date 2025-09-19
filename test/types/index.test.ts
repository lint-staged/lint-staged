import { test, expectTypeOf, expect } from 'vitest'

import lintStaged, { type Configuration, type Options, Logger } from '../../lib/index.js'

test('lint-staged TypeScript types', () => {
  expectTypeOf({
    '*.ext1': 'eslint',

    '*.ext2': ['eslint', 'prettier'],

    '*.ext3': (fileNames: string[]) => {
      return `eslint ${fileNames.join(' ')}`
    },

    '*.ext4': (fileNames: string[]) => {
      return [`eslint ${fileNames.join(' ')}`, `prettier --write ${fileNames.join(' ')}`]
    },

    '*.ext5': async (fileNames: string[]) => {
      return `eslint ${fileNames.join(' ')}`
    },

    '*.ext6': async (fileNames: string[]) => {
      return [`eslint ${fileNames.join(' ')}`, `prettier --write ${fileNames.join(' ')}`]
    },

    '*.ext7': {
      title: 'Sync Function Task',
      task: (fileNames: string[]) => {
        console.log(fileNames)
      },
    },

    '*.ext8': {
      title: 'Async Function Task',
      task: async (fileNames: string[]) => {
        console.log(fileNames)
      },
    },
  }).toExtend<Configuration>()

  expectTypeOf((fileNames: string[]) => {
    return `eslint ${fileNames.join(' ')}`
  }).toExtend<Configuration>()

  expectTypeOf((fileNames: string[]) => {
    return [`eslint ${fileNames.join(' ')}`, `prettier --write ${fileNames.join(' ')}`]
  }).toExtend<Configuration>()

  expectTypeOf(async (fileNames: string[]) => {
    return [`eslint ${fileNames.join(' ')}`, `prettier --write ${fileNames.join(' ')}`]
  }).toExtend<Configuration>()

  expectTypeOf(async (fileNames: string[]) => {
    return [`eslint ${fileNames.join(' ')}`, `prettier --write ${fileNames.join(' ')}`]
  }).toExtend<Configuration>()

  expectTypeOf(lintStaged).toBeFunction()
  expectTypeOf(lintStaged).returns.resolves.toBeBoolean()
  expectTypeOf(lintStaged).parameter(0).toEqualTypeOf<Options>()
  expectTypeOf(lintStaged).parameter(1).toEqualTypeOf<Logger | undefined>()

  expectTypeOf(console).toExtend<Logger>()
})
