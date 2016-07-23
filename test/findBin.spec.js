/* eslint no-unused-expressions: 0 */

import expect from 'expect'
import rewire from 'rewire'
const findBin = rewire('../src/findBin')
const packageJSON = {
    scripts: {
        test: 'noop'
    },
    'lint-staged': {}
}
const npmWichMockGood = {
    sync: path => path
}
const npmWichMockBad = {
    sync: path => {
        throw new Error('not found: ' + path)
    }
}

describe('findBin', () => {
    it('should return npm run command if it exist in both package.json and .bin/', () => {
        const packageJSONMock = {
            scripts: {
                eslint: 'eslint'
            }
        }

        findBin.__set__('npmWhich', npmWichMockGood)
        const { bin, args } = findBin('eslint', 'test.js', packageJSONMock)
        expect(bin).toEqual('npm')
        expect(args).toEqual(['run', '-s', 'eslint', '--color', '--', 'test.js'])
    })

    it('should return bin from node_modules/.bin if there is no command in package.json', () => {
        findBin.__set__('npmWhich', npmWichMockGood)
        const { bin, args } = findBin('eslint', 'test.js test2.js', packageJSON)
        expect(bin).toEqual('eslint')
        expect(args).toEqual(['--color', '--', 'test.js test2.js'])
    })

    it('should return error if bin not found and there is no entry in scripts section', () => {
        findBin.__set__('npmWhich', npmWichMockBad)
        expect(() => {
            findBin('eslint', 'test.js', packageJSON)
        }).toThrow('not found: eslint')
    })
})
