/* eslint no-unused-expressions: 0 */

import expect from 'expect'
import path from 'path'
import fs from 'fs'
import tmp from 'tmp'
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

    it('should return absolute paths if they were absolute', () => {
        const tmpFile = tmp.fileSync()
        expect(resolvePaths([{ filename: tmpFile.name }], '..')).toEqual([tmpFile.name])
    })
})
