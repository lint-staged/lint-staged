import { describe, it } from 'vitest'

import { parseOptions } from '../../lib/parseOptions.js'

describe('parseOptions', () => {
  it('should apply default options', ({ expect }) => {
    expect(parseOptions()).toMatchObject({
      allowEmpty: false,
      concurrent: true,
      continueOnError: false,
      debug: false,
      failOnChanges: false,
      hideAll: false,
      hidePartiallyStaged: true,
      hideUnstaged: false,
      quiet: false,
      relative: false,
      revert: true,
      stash: true,
      verbose: false,
    })
  })

  it('should preserve boolean and number options', ({ expect }) => {
    expect(parseOptions({ concurrent: false, maxArgLength: 100 })).toMatchObject({
      concurrent: false,
      maxArgLength: 100,
    })
  })

  it('should disable stash and revert when using diff', ({ expect }) => {
    expect(parseOptions({ diff: 'main...HEAD' })).toMatchObject({
      stash: false,
      revert: false,
    })
  })

  it('should disable revert when using failOnChanges', ({ expect }) => {
    expect(parseOptions({ failOnChanges: true }).revert).toBe(false)
  })

  it('should disable revert when stash is disabled', ({ expect }) => {
    expect(parseOptions({ stash: false }).revert).toBe(false)
  })

  it('should preserve explicit stash and revert options', ({ expect }) => {
    expect(
      parseOptions({ diff: 'main...HEAD', failOnChanges: true, stash: true, revert: true })
    ).toMatchObject({
      stash: true,
      revert: true,
    })
  })

  it('should disable hidePartiallyStaged when using hideUnstaged', ({ expect }) => {
    expect(parseOptions({ hideUnstaged: true }).hidePartiallyStaged).toBe(false)
  })

  it('should disable narrower hide options when using hideAll', ({ expect }) => {
    expect(
      parseOptions({ hideAll: true, hidePartiallyStaged: true, hideUnstaged: true })
    ).toMatchObject({
      hidePartiallyStaged: false,
      hideUnstaged: false,
    })
  })
})
