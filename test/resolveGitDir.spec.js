import path from 'path'
import resolveGitDir from '../src/resolveGitDir'

describe('resolveGitDir', () => {
    it('should resolve to current working dir if not set in config', () => {
        const expected = path.resolve(process.cwd())
        expect(resolveGitDir()).toEqual(expected)
        expect(path.isAbsolute(resolveGitDir())).toBe(true)
    })
    it('should resolve to current working dir if set to default', () => {
        const expected = path.resolve(process.cwd())
        expect(resolveGitDir('.')).toEqual(expected)
        expect(path.isAbsolute(resolveGitDir('.'))).toBe(true)
    })
    it('should resolve to relative dir from config', () => {
        const expected = path.resolve(path.join(process.cwd(), '..'))
        expect(resolveGitDir('..')).toEqual(expected)
        expect(path.isAbsolute(resolveGitDir('..'))).toBe(true)
    })
    it('should resolve to absolute dir from config', () => {
        expect(resolveGitDir('/path/to/some/dir')).toEqual('/path/to/some/dir')
        expect(path.isAbsolute(resolveGitDir('/path/to/some/dir'))).toBe(true)
    })
})
