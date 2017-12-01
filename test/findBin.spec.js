import findBin from '../src/findBin'

jest.mock('npm-which')

const scripts = { test: 'noop' }

describe('findBin', () => {
  it('should favor `npm run` command if exists in both package.json and .bin/', () => {
    const { bin, args } = findBin('my-linter', { 'my-linter': 'my-linter' })
    expect(bin).toEqual('npm')
    expect(args).toEqual(['run', '--silent', 'my-linter', '--'])
  })

  it('should return npm run command without --silent in debug mode', () => {
    const { bin, args } = findBin('eslint', { eslint: 'eslint' }, true)
    expect(bin).toEqual('npm')
    expect(args).toEqual(['run', 'eslint', '--'])
  })

  it('should resolve cmd defined in scripts with args', () => {
    const { bin, args } = findBin('kcd-scripts format', { 'kcd-scripts': 'node index.js' })
    expect(bin).toEqual('npm')
    expect(args).toEqual(['run', '--silent', 'kcd-scripts', '--', 'format'])
  })

  it('should resolve cmd defined in scripts with space in name', () => {
    const { bin, args } = findBin('my cmd', { 'my cmd': 'echo deal-with-it' })
    expect(bin).toEqual('npm')
    expect(args).toEqual(['run', '--silent', 'my cmd', '--'])
  })

  it('should return path to bin if there is no `script` with name in package.json', () => {
    const { bin, args } = findBin('my-linter', scripts)
    expect(bin).toEqual('my-linter')
    expect(args).toEqual([])
  })

  it('should throw an error if bin not found and there is no entry in scripts section', () => {
    expect(() => {
      findBin('my-missing-linter', scripts)
    }).toThrow('my-missing-linter could not be found. Try `npm install my-missing-linter`.')
  })

  it('should parse cmd and add arguments to args', () => {
    const { bin, args } = findBin('my-linter task --fix', scripts)
    expect(bin).toEqual('my-linter')
    expect(args).toEqual(['task', '--fix'])
  })
})
