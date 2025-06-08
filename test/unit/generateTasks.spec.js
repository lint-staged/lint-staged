import path from 'node:path'

import { generateTasks } from '../../lib/generateTasks.js'
import { normalizePath } from '../../lib/normalizePath.js'

// Windows filepaths
const normalizeWindowsPath = (input) => normalizePath(path.resolve('/', input))

const cwd = '/repo'

const files = [
  '/repo/test.js',
  '/repo/deeper/test.js',
  '/repo/deeper/test2.js',
  '/repo/even/deeper/test.js',
  '/repo/.hidden/test.js',

  '/repo/test.css',
  '/repo/deeper/test1.css',
  '/repo/deeper/test2.css',
  '/repo/even/deeper/test.css',
  '/repo/.hidden/test.css',

  '/repo/test.txt',
  '/repo/deeper/test.txt',
  '/repo/deeper/test2.txt',
  '/repo/even/deeper/test.txt',
  '/repo/.hidden/test.txt',
].map((filepath) => ({ filepath, status: 'A' }))

const config = {
  '*.js': 'root-js',
  '**/*.js': 'any-js',
  'deeper/*.js': 'deeper-js',
  '.hidden/*.js': 'hidden-js',
  'unknown/*.js': 'unknown-js',
  '*.{css,js}': 'root-css-or-js',
  '../*.{css,js}': 'parent-dir-css-or-js',
}

describe('generateTasks', () => {
  it('should return absolute paths', () => {
    const [task] = generateTasks({
      config: {
        '*': 'lint',
      },
      files,
    })

    task.fileList.forEach((file) => {
      expect(path.isAbsolute(file)).toBe(true)
    })
  })

  it('should not match non-children files', () => {
    const result = generateTasks({ config, cwd: '/test', files })
    const linter = result.find((item) => item.pattern === '*.js')
    expect(linter).toEqual({
      pattern: '*.js',
      commands: 'root-js',
      fileList: [],
    })
  })

  it('should return an empty file list for tasks with no matches.', () => {
    const result = generateTasks({ config, cwd, files })

    result.forEach((task) => {
      if (task.commands === 'unknown-js' || task.commands === 'parent-dir-css-or-js') {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(task.fileList.length).toEqual(0)
      } else {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(task.fileList.length).not.toEqual(0)
      }
    })
  })

  it('should match pattern "*.js"', () => {
    const result = generateTasks({ config, cwd, files })
    const linter = result.find((item) => item.pattern === '*.js')
    expect(linter).toEqual({
      pattern: '*.js',
      commands: 'root-js',
      fileList: [
        `/repo/test.js`,
        `/repo/deeper/test.js`,
        `/repo/deeper/test2.js`,
        `/repo/even/deeper/test.js`,
        `/repo/.hidden/test.js`,
      ].map((filepath) => ({ filepath: normalizeWindowsPath(filepath), status: 'A' })),
    })
  })

  it('should match pattern "**/*.js"', () => {
    const result = generateTasks({ config, cwd, files })
    const linter = result.find((item) => item.pattern === '**/*.js')
    expect(linter).toEqual({
      pattern: '**/*.js',
      commands: 'any-js',
      fileList: [
        `/repo/test.js`,
        `/repo/deeper/test.js`,
        `/repo/deeper/test2.js`,
        `/repo/even/deeper/test.js`,
        `/repo/.hidden/test.js`,
      ].map((filepath) => ({ filepath: normalizeWindowsPath(filepath), status: 'A' })),
    })
  })

  it('should match pattern "deeper/*.js"', () => {
    const result = generateTasks({ config, cwd, files })
    const linter = result.find((item) => item.pattern === 'deeper/*.js')
    expect(linter).toEqual({
      pattern: 'deeper/*.js',
      commands: 'deeper-js',
      fileList: [`/repo/deeper/test.js`, `/repo/deeper/test2.js`].map((filepath) => ({
        filepath: normalizeWindowsPath(filepath),
        status: 'A',
      })),
    })
  })

  it('should match pattern ".hidden/*.js"', () => {
    const result = generateTasks({ config, cwd, files })
    const linter = result.find((item) => item.pattern === '.hidden/*.js')
    expect(linter).toEqual({
      pattern: '.hidden/*.js',
      commands: 'hidden-js',
      fileList: [`/repo/.hidden/test.js`].map((filepath) => ({
        filepath: normalizeWindowsPath(filepath),
        status: 'A',
      })),
    })
  })

  it('should match pattern "*.{css,js}"', () => {
    const result = generateTasks({ config, cwd, files })
    const linter = result.find((item) => item.pattern === '*.{css,js}')
    expect(linter).toEqual({
      pattern: '*.{css,js}',
      commands: 'root-css-or-js',
      fileList: [
        `/repo/test.js`,
        `/repo/deeper/test.js`,
        `/repo/deeper/test2.js`,
        `/repo/even/deeper/test.js`,
        `/repo/.hidden/test.js`,
        `/repo/test.css`,
        `/repo/deeper/test1.css`,
        `/repo/deeper/test2.css`,
        `/repo/even/deeper/test.css`,
        `/repo/.hidden/test.css`,
      ].map((filepath) => ({ filepath: normalizeWindowsPath(filepath), status: 'A' })),
    })
  })

  it('should match pattern "test{1..2}.css"', () => {
    const result = generateTasks({
      config: {
        'test{1..2}.css': 'lint',
      },
      cwd,

      files,
    })

    const linter = result.find((item) => item.pattern === 'test{1..2}.css')

    expect(linter).toEqual({
      pattern: 'test{1..2}.css',
      commands: 'lint',
      fileList: [`/repo/deeper/test1.css`, `/repo/deeper/test2.css`].map((filepath) => ({
        filepath: normalizeWindowsPath(filepath),
        status: 'A',
      })),
    })
  })

  it('should not match files in parent directory by default', () => {
    const result = generateTasks({
      config,
      cwd: '/repo/deeper',
      files,
    })
    const linter = result.find((item) => item.pattern === '*.js')
    expect(linter).toEqual({
      pattern: '*.js',
      commands: 'root-js',
      fileList: [`/repo/deeper/test.js`, `/repo/deeper/test2.js`].map((filepath) => ({
        filepath: normalizeWindowsPath(filepath),
        status: 'A',
      })),
    })
  })

  it('should match files in parent directory when pattern starts with "../"', () => {
    const result = generateTasks({
      config,
      cwd: '/repo/deeper',
      files,
    })
    const linter = result.find((item) => item.pattern === '../*.{css,js}')
    expect(linter).toEqual({
      commands: 'parent-dir-css-or-js',
      fileList: [`/repo/test.js`, `/repo/test.css`].map((filepath) => ({
        filepath: normalizeWindowsPath(filepath),
        status: 'A',
      })),
      pattern: '../*.{css,js}',
    })
  })

  it('should be able to return relative paths for "*.{css,js}"', () => {
    const result = generateTasks({ config, cwd, files, relative: true })
    const linter = result.find((item) => item.pattern === '*.{css,js}')
    expect(linter).toEqual({
      pattern: '*.{css,js}',
      commands: 'root-css-or-js',
      fileList: [
        'test.js',
        'deeper/test.js',
        'deeper/test2.js',
        'even/deeper/test.js',
        '.hidden/test.js',
        'test.css',
        'deeper/test1.css',
        'deeper/test2.css',
        'even/deeper/test.css',
        '.hidden/test.css',
      ].map((filepath) => ({ filepath, status: 'A' })),
    })
  })
})
