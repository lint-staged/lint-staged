import makeConsoleMock from 'consolemock'

import validateBraces, { BRACES_REGEXP } from '../lib/validateBraces'

describe('BRACES_REGEXP', () => {
  it(`should match '*.{js}'`, () => {
    expect('*.{js}'.match(BRACES_REGEXP)).toBeTruthy()
  })

  it(`should match 'file_{10}'`, () => {
    expect('file_{test}'.match(BRACES_REGEXP)).toBeTruthy()
  })

  it(`should match '*.{spec\\.js}'`, () => {
    expect('*.{spec\\.js}'.match(BRACES_REGEXP)).toBeTruthy()
  })

  it(`should match '*.{js\\,ts}'`, () => {
    expect('*.{js\\,ts}'.match(BRACES_REGEXP)).toBeTruthy()
  })

  it("should not match '*.${js}'", () => {
    expect('*.${js}'.match(BRACES_REGEXP)).not.toBeTruthy()
  })

  it(`should not match '.{js,ts}'`, () => {
    expect('.{js,ts}'.match(BRACES_REGEXP)).not.toBeTruthy()
  })

  it(`should not match 'file_{1..10}'`, () => {
    expect('file_{1..10}'.match(BRACES_REGEXP)).not.toBeTruthy()
  })

  it(`should not match '*.\\{js\\}'`, () => {
    expect('*.\\{js\\}'.match(BRACES_REGEXP)).not.toBeTruthy()
  })

  it(`should not match '*.\\{js}'`, () => {
    expect('*.\\{js}'.match(BRACES_REGEXP)).not.toBeTruthy()
  })

  it(`should not match '*.{js\\}'`, () => {
    expect('*.{js\\}'.match(BRACES_REGEXP)).not.toBeTruthy()
  })
})

describe('validateBraces', () => {
  it('should warn about `*.{js}` and return fixed pattern', () => {
    const logger = makeConsoleMock()

    const fixedBraces = validateBraces('*.{js}', logger)

    expect(fixedBraces).toEqual('*.js')
    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      WARN ‼ Detected incorrect braces with only single value: \`*.{js}\`. Reformatted as: \`*.js\`
      "
    `)
  })

  it('should warn about `*.{ts}{x}` and return fixed pattern', () => {
    const logger = makeConsoleMock()

    const fixedBraces = validateBraces('*.{ts}{x}', logger)

    expect(fixedBraces).toEqual('*.tsx')
    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      WARN ‼ Detected incorrect braces with only single value: \`*.{ts}{x}\`. Reformatted as: \`*.tsx\`
      "
    `)
  })

  it('should warn about `*.{js,{ts}}` and return fixed pattern', () => {
    const logger = makeConsoleMock()

    const fixedBraces = validateBraces('*.{js,{ts}}', logger)

    expect(fixedBraces).toEqual('*.{js,ts}')
    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      WARN ‼ Detected incorrect braces with only single value: \`*.{js,{ts}}\`. Reformatted as: \`*.{js,ts}\`
      "
    `)
  })

  /**
   * @todo This isn't correctly detected even though the outer braces are invalid.
   */
  it.skip('should warn about `*.{{js,ts}}` and return fixed pattern', () => {
    const logger = makeConsoleMock()

    const fixedBraces = validateBraces('*.{{js,ts}}', logger)

    expect(fixedBraces).toEqual('*.{js,ts}')
    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      WARN ‼ Detected incorrect braces with only single value: \`*.{{js,ts}}\`. Reformatted as: \`*.{js,ts}\`
      "
    `)
  })

  it('should warn about `*.{{js,ts},{css}}` and return fixed pattern', () => {
    const logger = makeConsoleMock()

    const fixedBraces = validateBraces('*.{{js,ts},{css}}', logger)

    expect(fixedBraces).toEqual('*.{{js,ts},css}')
    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      WARN ‼ Detected incorrect braces with only single value: \`*.{{js,ts},{css}}\`. Reformatted as: \`*.{{js,ts},css}\`
      "
    `)
  })

  it('should not warn about `*.\\{js\\}` and return the same pattern', () => {
    const logger = makeConsoleMock()

    const fixedBraces = validateBraces('*.\\{js\\}', logger)

    expect(fixedBraces).toEqual('*.\\{js\\}')
    expect(logger.printHistory()).toMatchInlineSnapshot(`""`)
  })
})
