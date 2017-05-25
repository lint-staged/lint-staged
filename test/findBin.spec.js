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
        const { bin, args } = findBin('my-linter', packageJSONMock)
        expect(bin).toEqual('npm')
        expect(args).toEqual(['run', '--silent', 'my-linter'])
    })

    it('should return npm run command without --silent in verbose mode', () => {
        const packageJSONMock = {
            scripts: {
                eslint: 'eslint'
            }
        }
        const { bin, args } = findBin('eslint', packageJSONMock, { verbose: true })
        expect(bin).toEqual('npm')
        expect(args).toEqual(['run', 'eslint'])
    })

    it('should return path to bin if there is no `script` with name in package.json', () => {
        const { bin, args } = findBin('my-linter', packageJSON)
        expect(bin).toEqual('my-linter')
        expect(args).toEqual([])
    })

    it('should throw an error if bin not found and there is no entry in scripts section', () => {
        expect(() => {
            findBin('my-missing-linter', packageJSON)
        }).toThrow('my-missing-linter could not be found. Try `npm install my-missing-linter`.')
    })


    it('should parse cmd and add arguments to args', () => {
        const { bin, args } = findBin('my-linter task --fix', packageJSON)
        expect(bin).toEqual('my-linter')
        expect(args).toEqual(['task', '--fix'])
    })
})
