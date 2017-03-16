import path from 'path'
import resolveGitDir from '../src/resolveGitDir'

describe('resolveGitDir', () => {
    it('should resolve to current working dir if not set in config', () => {
        const expected = path.resolve(process.cwd())
        expect(resolveGitDir()).toEqual(expected)
        expect(path.isAbsolute(resolveGitDir())).toBe(true)
    })
    it('should resolve to relative dir from config', () => {
        const config = {
            gitDir: '..'
        }
        const expected = path.resolve(path.join(process.cwd(), '..'))
        expect(resolveGitDir(config)).toEqual(expected)
        expect(path.isAbsolute(resolveGitDir(config))).toBe(true)
    })
    it('should resolve to absolute dir from config', () => {
        const config = {
            gitDir: '/path/to/some/dir'
        }
        const expected = config.gitDir
        expect(resolveGitDir(config)).toEqual(expected)
        expect(path.isAbsolute(resolveGitDir(config))).toBe(true)
    })
})
