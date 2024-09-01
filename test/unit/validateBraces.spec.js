import makeConsoleMock from 'consolemock'

import {
  DOUBLE_BRACES_REGEXP,
  INCORRECT_BRACES_REGEXP,
  validateBraces,
} from '../../lib/validateBraces.js'

describe('INCORRECT_BRACES_REGEXP', () => {
  it(`should match '*.{js}'`, () => {
    expect('*.{js}'.match(INCORRECT_BRACES_REGEXP)).toBeTruthy()
  })

  it(`should match 'file_{10}'`, () => {
    expect('file_{test}'.match(INCORRECT_BRACES_REGEXP)).toBeTruthy()
  })

  it(`should match '*.{spec\\.js}'`, () => {
    expect('*.{spec\\.js}'.match(INCORRECT_BRACES_REGEXP)).toBeTruthy()
  })

  it(`should match '*.{js\\,ts}'`, () => {
    expect('*.{js\\,ts}'.match(INCORRECT_BRACES_REGEXP)).toBeTruthy()
  })

  it("should not match '*.${js}'", () => {
    expect('*.${js}'.match(INCORRECT_BRACES_REGEXP)).toBeFalsy()
  })

  it(`should not match '.{js,ts}'`, () => {
    expect('.{js,ts}'.match(INCORRECT_BRACES_REGEXP)).toBeFalsy()
  })

  it(`should not match 'file_{1..10}'`, () => {
    expect('file_{1..10}'.match(INCORRECT_BRACES_REGEXP)).toBeFalsy()
  })

  it(`should not match '*.\\{js\\}'`, () => {
    expect('*.\\{js\\}'.match(INCORRECT_BRACES_REGEXP)).toBeFalsy()
  })

  it(`should not match '*.\\{js}'`, () => {
    expect('*.\\{js}'.match(INCORRECT_BRACES_REGEXP)).toBeFalsy()
  })

  it(`should not match '*.{js\\}'`, () => {
    expect('*.{js\\}'.match(INCORRECT_BRACES_REGEXP)).toBeFalsy()
  })
})

describe('DOUBLE_BRACES_REGEXP', () => {
  it(`should match '*.{{js,ts}}'`, () => {
    expect('*.{{js,ts}}'.match(DOUBLE_BRACES_REGEXP)).toBeTruthy()
  })

  it(`should not match '*.{{js,ts},{css}}'`, () => {
    expect('*.{{js,ts},{css}}'.match(DOUBLE_BRACES_REGEXP)).toBeFalsy()
  })
})

describe('validateBraces', () => {
  it('should warn about `*.{js}` and return fixed pattern', () => {
    const logger = makeConsoleMock()

    const fixedBraces = validateBraces('*.{js}', logger)

    expect(fixedBraces).toEqual('*.js')
    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      WARN ⚠ Detected incorrect braces with only single value: \`*.{js}\`. Reformatted as: \`*.js\`
      "
    `)
  })

  it('should warn about `*.{ts}{x}` and return fixed pattern', () => {
    const logger = makeConsoleMock()

    const fixedBraces = validateBraces('*.{ts}{x}', logger)

    expect(fixedBraces).toEqual('*.tsx')
    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      WARN ⚠ Detected incorrect braces with only single value: \`*.{ts}{x}\`. Reformatted as: \`*.tsx\`
      "
    `)
  })

  it('should warn about `*.{js,{ts}}` and return fixed pattern', () => {
    const logger = makeConsoleMock()

    const fixedBraces = validateBraces('*.{js,{ts}}', logger)

    expect(fixedBraces).toEqual('*.{js,ts}')
    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      WARN ⚠ Detected incorrect braces with only single value: \`*.{js,{ts}}\`. Reformatted as: \`*.{js,ts}\`
      "
    `)
  })

  it('should warn about `*.{{js,ts}}` and return fixed pattern', () => {
    const logger = makeConsoleMock()

    const fixedBraces = validateBraces('*.{{js,ts}}', logger)

    expect(fixedBraces).toEqual('*.{js,ts}')
    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      WARN ⚠ Detected incorrect braces with only single value: \`*.{{js,ts}}\`. Reformatted as: \`*.{js,ts}\`
      "
    `)
  })

  it('should warn about `*.{{js,ts},{css}}` and return fixed pattern', () => {
    const logger = makeConsoleMock()

    const fixedBraces = validateBraces('*.{{js,ts},{css}}', logger)

    expect(fixedBraces).toEqual('*.{{js,ts},css}')
    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      WARN ⚠ Detected incorrect braces with only single value: \`*.{{js,ts},{css}}\`. Reformatted as: \`*.{{js,ts},css}\`
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
