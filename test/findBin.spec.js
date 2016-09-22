import expect from 'expect'
import findBin from '../src/findBin'

jest.mock('npm-which')

const packageJSON = {
    scripts: {
        test: 'noop'
    },
    'lint-staged': {}
}


describe('findBin', () => {
    it('should favor `npm run` command if exists in both package.json and .bin/', () => {
        const packageJSONMock = {
            scripts: {
                'my-linter': 'my-linter'
            }
        }
        const { bin, args } = findBin('my-linter', 'test.js', packageJSONMock)
        expect(bin).toEqual('npm')
        expect(args).toEqual(['run', '--silent', 'my-linter', '--', 'test.js'])
    })

    it('should return npm run command without --silent in verbose mode', () => {
        const packageJSONMock = {
            scripts: {
                eslint: 'eslint'
            }
        }
        const { bin, args } = findBin('eslint', 'test.js', packageJSONMock, { verbose: true })
        expect(bin).toEqual('npm')
        expect(args).toEqual(['run', 'eslint', '--', 'test.js'])
    })

    it('should return path to bin if there is no `script` with name in package.json', () => {
        const { bin, args } = findBin('my-linter', 'test.js test2.js', packageJSON)
        expect(bin).toEqual('my-linter')
        expect(args).toEqual(['--', 'test.js test2.js'])
    })

    it('should throw an error if bin not found and there is no entry in scripts section', () => {
        expect(() => {
            findBin('my-missing-linter', 'test.js', packageJSON)
        }).toThrow('my-missing-linter could not be found. Try `npm install my-missing-linter`.')
    })


    it('should parse cmd and add arguments to args', () => {
        const { bin, args } = findBin('my-linter task --fix', 'test.js test2.js', packageJSON)
        expect(bin).toEqual('my-linter')
        expect(args).toEqual(['task', '--fix', '--', 'test.js test2.js'])
    })
})
