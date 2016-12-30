/* eslint no-unused-expressions: 0 */

import expect from 'expect'
import path from 'path'
import fs from 'fs'
import resolvePaths from '../src/resolvePaths'

const files = fs.readdirSync(path.resolve('test', '__fixtures__')).map(file => ({
    filename: file
}))

const cwdParent = path.resolve('..')

describe('resolvePaths', () => {
    it('should return Array of filenames', () => {
        expect(resolvePaths([])).toBeAn('array')
        expect(resolvePaths(files)).toBeAn('array')
        expect(resolvePaths(files)).toEqual(
            [
                'test.css',
                'test.js',
                'test.txt'
            ]
        )
    })

    it('should return CWD-relative paths if second parameter is set', () => {
        expect(resolvePaths(files, cwdParent)).toEqual(
            [
                'test.css',
                'test.js',
                'test.txt'
            ].map(file => path.join('..', file))
        )
    })
})
