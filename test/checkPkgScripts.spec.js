import makeConsoleMock from 'consolemock'
import checkPkgScripts from '../src/checkPkgScripts'

describe('checkPkgScripts', () => {
  describe('does not throw', () => {
    it('if there are no scripts defined', () => {
      expect(() => checkPkgScripts(null)).not.toThrow()
      expect(() => checkPkgScripts({})).not.toThrow()
    })

    it('if the script cannot be found', () => {
      expect(() => checkPkgScripts({ scripts: {} }, 'fmt')).not.toThrow()
    })
  })

  describe('throws', () => {
    const originalConsole = global.console
    beforeAll(() => {
      global.console = makeConsoleMock()
    })

    beforeEach(() => {
      global.console.clearHistory()
    })

    afterAll(() => {
      global.console = originalConsole
    })

    const pkg = {
      scripts: {
        lint: 'eslint .'
      }
    }

    it('if the cmd is defined in script', () => {
      expect(() => {
        checkPkgScripts(pkg, 'lint', 'lint')
      }).toThrow('Could not resolve binary for `lint`')
      expect(console.printHistory()).toMatchSnapshot()
    })

    it('if the binary name is defined in script', () => {
      expect(() => {
        checkPkgScripts(pkg, 'lint --fix', 'lint', ['--fix'])
      }).toThrow('Could not resolve binary for `lint --fix`')
      expect(console.printHistory()).toMatchSnapshot()
    })
  })
})
