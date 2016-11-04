import expect from 'expect'
import generateTasks from '../src/generateTasks'

const simpleConfig = {
    '*.css': 'stylelint'
}
const nestedConfig = {
    gitDir: '../',
    linters: {
        '*.js': ['eslint --fix', 'git add'],
        '*.css': 'stylelint'
    }
}

const files = ['test.js', 'src/.hidden/test2.js', '/.storybook/test.css', '.storybook/test.css', '/absolute/path/test.txt']

describe('generateTasks', () => {
    it('should not generate tasks for non-matching files', () => {
        const res = generateTasks(simpleConfig, ['test'])
        expect(res).toBeAn('array')
        expect(res.length).toEqual(0)
    })

    it('should generate tasks for files with dots in path', () => {
        const res = generateTasks(simpleConfig, files)
        expect(res).toBeAn('array')
        expect(res[0].fileList).toEqual(['/.storybook/test.css', '.storybook/test.css'])
    })

    it('should generate tasks with complex globs', () => {
        const res = generateTasks({
            '**/*.css': 'stylelint'
        }, files)
        expect(res).toBeAn('array')
        expect(res[0].fileList).toEqual(['/.storybook/test.css', '.storybook/test.css'])
    })

    it('should generate tasks for simple config', () => {
        const res = generateTasks(simpleConfig, files)
        expect(res).toBeAn('array')
        expect(res.length).toBe(1)
        expect(res).toEqual([
            {
                pattern: '*.css',
                commands: 'stylelint',
                fileList: ['/.storybook/test.css', '.storybook/test.css']
            }
        ])
    })

    it('should generate tasks for nested config', () => {
        const res = generateTasks(nestedConfig, files)
        expect(res).toBeAn('array')
        expect(res.length).toBe(2)
        expect(res).toEqual([
            {
                pattern: '*.js',
                commands: ['eslint --fix', 'git add'],
                fileList: ['test.js', 'src/.hidden/test2.js']
            },
            {
                pattern: '*.css',
                commands: 'stylelint',
                fileList: ['/.storybook/test.css', '.storybook/test.css']
            }
        ])
    })
})
