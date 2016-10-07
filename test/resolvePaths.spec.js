/* eslint no-unused-expressions: 0 */

import expect from 'expect'
import path from 'path'
import fs from 'fs'
import resolvePaths from '../src/resolvePaths'

const files = fs.readdirSync(path.resolve('test', '__fixtures__')).map(file => ({
    filename: file
}))

const cwd = process.cwd()
const cwdParent = path.relative(cwd, '..')

describe('resolvePaths', () => {
    it('should return Array of filenames', () => {
        expect(resolvePaths([])).toBeAn('array')
        expect(resolvePaths(files)).toBeAn('array')
        expect(resolvePaths(files)).toEqual(
            [
                'test.css',
                'test.js',
                'test.txt'
            ].map(file => path.resolve(cwd, file))
        )
    })

    it('should return relative paths if second parameter is set', () => {
        expect(resolvePaths(files, '..')).toEqual(
            [
                'test.css',
                'test.js',
                'test.txt'
            ].map(file => path.resolve(cwdParent, file))
        )
    })
})
