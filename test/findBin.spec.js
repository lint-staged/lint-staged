import makeConsoleMock from 'consolemock'
import npmWhichMock from 'npm-which'
import findBin from '../src/findBin'

jest.mock('npm-which')

describe('findBin', () => {
  it('should return path to bin', () => {
    const { bin, args } = findBin('my-linter')
    expect(bin).toEqual('my-linter')
    expect(args).toEqual([])
  })

  it('should resolve path to bin from cache for subsequent invocations', () => {
    npmWhichMock.mockFn.mockClear()
    findBin('my-cmd')
    expect(npmWhichMock.mockFn).toHaveBeenCalledTimes(1)
    findBin('my-cmd --arg')
    expect(npmWhichMock.mockFn).toHaveBeenCalledTimes(1)
  })

  it('should throw an error if bin not found', () => {
    expect(() => {
      findBin('my-missing-linter')
    }).toThrow('my-missing-linter could not be found. Try `npm install my-missing-linter`.')
  })

  it('should throw a helpful error if the cmd is present in pkg scripts', () => {
    const originalConsole = global.console
    global.console = makeConsoleMock()
    npmWhichMock.mockFn.mockImplementationOnce(() => {
      throw new Error()
    })

    expect(() => {
      findBin('lint')
    }).toThrow('Could not resolve binary for `lint`')
    expect(console.printHistory()).toMatchSnapshot()

    global.console = originalConsole
  })

  it('should parse cmd and add arguments to args', () => {
    const { bin, args } = findBin(
      'my-linter task --fix --rule \'quotes: [2, double]\' --another "[complex:argument]"'
    )
    expect(bin).toEqual('my-linter')
    expect(args).toEqual([
      'task',
      '--fix',
      '--rule',
      'quotes: [2, double]',
      '--another',
      '[complex:argument]'
    ])
  })
})
