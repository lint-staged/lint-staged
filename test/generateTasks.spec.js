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

const files = ['test.js', 'test2.js', 'test.css', 'test.txt']

describe('generateTasks', () => {
    it('should not generate tasks for non-matching files', () => {
        const res = generateTasks(simpleConfig, ['test'])
        expect(res).toBeAn('array')
        expect(res.length).toEqual(0)
    })

    it('should generate tasks for simple config', () => {
        const res = generateTasks(simpleConfig, files)
        expect(res).toBeAn('array')
        expect(res.length).toBe(1)
        expect(res).toEqual([
            {
                pattern: '*.css',
                commands: 'stylelint',
                fileList: ['test.css']
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
                fileList: ['test.js', 'test2.js']
            },
            {
                pattern: '*.css',
                commands: 'stylelint',
                fileList: ['test.css']
            }
        ])
    })
})
