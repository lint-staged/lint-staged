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
const npmWichMockGood = (path, cb) => {
    cb(null, path)
}
const npmWichMockBad = (path, cb) => {
    cb(true, null)
}

describe('findBin', () => {
    it('should return npm run command if it exist in both package.json and .bin/', done => {
        const packageJSONMock = {
            scripts: {
                eslint: 'eslint'
            }
        }

        findBin.__set__('npmWhich', npmWichMockGood)
        findBin('eslint', 'test.js', packageJSONMock, (err, bin, args) => {
            expect(err).toBe(null)
            expect(bin).toEqual('npm')
            expect(args).toEqual(['run', '-s', 'eslint', '--', 'test.js'])
            done()
        })
    })

    it('should return bin from node_modules/.bin if there is no command in package.json', done => {
        findBin.__set__('npmWhich', npmWichMockGood)
        findBin('eslint', 'test.js test2.js', packageJSON, (err, bin, args) => {
            expect(err).toBe(null)
            expect(bin).toEqual('eslint')
            expect(args).toEqual(['--', 'test.js test2.js'])
            done()
        })
    })

    it('should return error if bin not found and there is no entry in scripts section', () => {
        findBin.__set__('npmWhich', npmWichMockBad)
        expect(() => {
            findBin('eslint', 'test.js', packageJSON, (err) => {
                throw new Error(err)
            })
        }).toThrow()
    })
})
