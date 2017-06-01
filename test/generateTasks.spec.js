import expect from 'expect'
import generateTasks from '../src/generateTasks'

const files = {
    'test.js': '/root/test.js',
    'deeper/test.js': '/root/deeper/test.js',
    'deeper/test2.js': '/root/deeper/test2.js',
    'even/deeper/test.js': '/root/even/deeper/test.js',
    '.hidden/test.js': '/root/.hidden/test.js',

    'test.css': '/root/test.css',
    'deeper/test.css': '/root/deeper/test.css',
    'deeper/test2.css': '/root/deeper/test2.css',
    'even/deeper/test.css': '/root/even/deeper/test.css',
    '.hidden/test.css': '/root/.hidden/test.css',

    'test.txt': '/root/test.txt',
    'deeper/test.txt': '/root/deeper/test.txt',
    'deeper/test2.txt': '/root/deeper/test2.txt',
    'even/deeper/test.txt': '/root/even/deeper/test.txt',
    '.hidden/test.txt': '/root/.hidden/test.txt'
}

const linters = {
    '*.js': 'root-js',
    '**/*.js': 'any-js',
    'deeper/*.js': 'deeper-js',
    '.hidden/*.js': 'hidden-js',
    'unknown/*.js': 'unknown-js',
    '*.{css,js}': 'root-css-or-js'
}

describe('generateTasks', () => {
    it('should work with simple configuration', () => {
        const result = generateTasks({
            '*.js': 'lint'
        }, {
            'test.js': '/root/test.js'
        })
        const commands = result.map(match => match.commands)
        expect(commands).toEqual([
            'lint'
        ])
    })

    it('should work with advanced configuration', () => {
        const result = generateTasks({
            gitDir: '../',
            linters: {
                '*.js': 'lint'
            }
        }, {
            'test.js': '/root/test.js'
        })
        const commands = result.map(match => match.commands)
        expect(commands).toEqual([
            'lint'
        ])
    })

    it('should return an empty file list for linters with no matches.', () => {
        const result = generateTasks(linters, files)
        for (const task of result) {
            if (task.commands === 'unknown-js') {
                expect(task.fileList.length).toEqual(0)
            } else {
                expect(task.fileList.length).toNotEqual(0)
            }
        }
    })

    it('should match pattern "*.js"', () => {
        const result = generateTasks(linters, files)
        const linter = result.find(item => item.pattern === '*.js')
        expect(linter).toEqual({
            pattern: '*.js',
            commands: 'root-js',
            fileList: [
                '/root/test.js',
                '/root/deeper/test.js',
                '/root/deeper/test2.js',
                '/root/even/deeper/test.js',
                '/root/.hidden/test.js'
            ]
        })
    })

    it('should match pattern "**/*.js"', () => {
        const result = generateTasks(linters, files)
        const linter = result.find(item => item.pattern === '**/*.js')
        expect(linter).toEqual({
            pattern: '**/*.js',
            commands: 'any-js',
            fileList: [
                '/root/test.js',
                '/root/deeper/test.js',
                '/root/deeper/test2.js',
                '/root/even/deeper/test.js',
                '/root/.hidden/test.js'
            ]
        })
    })

    it('should match pattern "deeper/*.js"', () => {
        const result = generateTasks(linters, files)
        const linter = result.find(item => item.pattern === 'deeper/*.js')
        expect(linter).toEqual({
            pattern: 'deeper/*.js',
            commands: 'deeper-js',
            fileList: [
                '/root/deeper/test.js',
                '/root/deeper/test2.js'
            ]
        })
    })

    it('should match pattern ".hidden/*.js"', () => {
        const result = generateTasks(linters, files)
        const linter = result.find(item => item.pattern === '.hidden/*.js')
        expect(linter).toEqual({
            pattern: '.hidden/*.js',
            commands: 'hidden-js',
            fileList: [
                '/root/.hidden/test.js'
            ]
        })
    })

    it('should match pattern "*.{css,js}"', () => {
        const result = generateTasks(linters, files)
        const linter = result.find(item => item.pattern === '*.{css,js}')
        expect(linter).toEqual({
            pattern: '*.{css,js}',
            commands: 'root-css-or-js',
            fileList: [
                '/root/test.js',
                '/root/deeper/test.js',
                '/root/deeper/test2.js',
                '/root/even/deeper/test.js',
                '/root/.hidden/test.js',
                '/root/test.css',
                '/root/deeper/test.css',
                '/root/deeper/test2.css',
                '/root/even/deeper/test.css',
                '/root/.hidden/test.css'
            ]
        })
    })

    it('should support globOptions specified in advanced configuration', () => {
        const result = generateTasks(
            {
                globOptions: {
                    matchBase: false,
                    nocase: true
                },
                linters: {
                    'TeSt.*': 'lint'
                }
            },
            files
        )
        const linter = result.find(item => item.pattern === 'TeSt.*')
        expect(linter).toEqual({
            pattern: 'TeSt.*',
            commands: 'lint',
            fileList: ['/root/test.js', '/root/test.css', '/root/test.txt']
        })
    })
})
