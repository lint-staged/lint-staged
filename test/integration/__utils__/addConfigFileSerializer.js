import { stripVTControlCharacters } from 'node:util'

import { expect } from 'vitest'

import { replaceSerializer } from './replaceSerializer'

// Replace path like `../../git/lint-staged` with `<path>/lint-staged`
const replaceConfigPathSerializer = replaceSerializer(
  /] .*\/lint-staged.* — /gm,
  `] <path>/<lint-staged.config.ext> — `
)

// Hide filepath from test snapshot because it's not important and varies in CI
const replaceFilepathSerializer = replaceSerializer(
  /prettier --write (.*)?$/gm,
  `prettier --write <path>`
)

export const addConfigFileSerializer = () => {
  // Awkwardly merge three serializers
  expect.addSnapshotSerializer({
    test: (val) => replaceConfigPathSerializer.test(val) || replaceFilepathSerializer.test(val),
    print: (val) => replaceFilepathSerializer.print(val),
    serialize: (val) => stripVTControlCharacters(val),
  })
}
