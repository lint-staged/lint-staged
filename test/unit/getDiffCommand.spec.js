import { describe, it } from 'vitest'

import { getDiffCommand } from '../../lib/getDiffCommand.js'

describe('getDiffCommand', () => {
  const customDiffString = 'origin/main..custom-branch'
  const customDiffSpaceSeparatedString = 'origin/main custom-branch'
  const customDiffFilter = 'a'

  it('should default to sane value', ({ expect }) => {
    const diff = getDiffCommand()
    expect(diff).toEqual(['diff', `--diff-filter=ACMR`, '--staged'])
  })

  it('should work only with diff set as string', ({ expect }) => {
    const diff = getDiffCommand(customDiffString)
    expect(diff).toEqual(['diff', `--diff-filter=ACMR`, 'origin/main..custom-branch'])
  })

  it('should work only with diff set as space separated string', ({ expect }) => {
    const diff = getDiffCommand(customDiffSpaceSeparatedString)
    expect(diff).toEqual(['diff', `--diff-filter=ACMR`, 'origin/main', 'custom-branch'])
  })

  it('should work only with diffFilter set', ({ expect }) => {
    const diff = getDiffCommand(undefined, customDiffFilter)
    expect(diff).toEqual(['diff', `--diff-filter=a`, '--staged'])
  })

  it('should work with both diff and diffFilter set', ({ expect }) => {
    const diff = getDiffCommand(customDiffString, customDiffFilter)
    expect(diff).toEqual(['diff', `--diff-filter=a`, 'origin/main..custom-branch'])
  })
})
