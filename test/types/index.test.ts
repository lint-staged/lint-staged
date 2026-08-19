import { test, expectTypeOf } from 'vitest'

import lintStaged, { type Logger, type Options } from '../../lib/index.js'

test('lint-staged TypeScript types', () => {
  expectTypeOf(lintStaged).toBeFunction()
  expectTypeOf(lintStaged).returns.resolves.toBeBoolean()
  expectTypeOf(lintStaged).parameter(0).toEqualTypeOf<Options>()
  expectTypeOf(lintStaged).parameter(1).toEqualTypeOf<Logger | undefined>()

  expectTypeOf(console).toExtend<Logger>()
})
