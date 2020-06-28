import os from 'os'
import normalize from 'normalize-path'
import path from 'path'

import generateTasks from '../lib/generateTasks'
import resolveGitRepo from '../lib/resolveGitRepo'

const normalizePath = (path) => normalize(path)

const files = [
  'test.js',
  'deeper/test.js',
  'deeper/test2.js',
  'even/deeper/test.js',
  '.hidden/test.js',

  'test.css',
  'deeper/test.css',
  'deeper/test2.css',
  'even/deeper/test.css',
  '.hidden/test.css',

  'test.txt',
  'deeper/test.txt',
  'deeper/test2.txt',
  'even/deeper/test.txt',
  '.hidden/test.txt',
]

// Mocks get hoisted
jest.mock('../lib/resolveGitRepo.js')
const baseDir = path.join(os.tmpdir(), 'tmp-lint-staged')
resolveGitRepo.mockResolvedValue({ baseDir })
const cwd = baseDir

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
  it('should return absolute paths', async () => {
    const [task] = await generateTasks({
      config: {
        '*': 'lint',
      },
      baseDir,
      files,
    })
    task.fileList.forEach((file) => {
      expect(path.isAbsolute(file)).toBe(true)
    })
  })

  it('should not match non-children files', async () => {
    const relPath = path.join(process.cwd(), '..')
    const result = await generateTasks({ config, cwd, baseDir: relPath, files })
    const linter = result.find((item) => item.pattern === '*.js')
    expect(linter).toEqual({
      pattern: '*.js',
      commands: 'root-js',
      fileList: [],
    })
  })

  it('should return an empty file list for linters with no matches.', async () => {
    const result = await generateTasks({ config, cwd, baseDir, files })

    result.forEach((task) => {
      if (task.commands === 'unknown-js' || task.commands === 'parent-dir-css-or-js') {
        expect(task.fileList.length).toEqual(0)
      } else {
        expect(task.fileList.length).not.toEqual(0)
      }
    })
  })

  it('should match pattern "*.js"', async () => {
    const result = await generateTasks({ config, cwd, baseDir, files })
    const linter = result.find((item) => item.pattern === '*.js')
    expect(linter).toEqual({
      pattern: '*.js',
      commands: 'root-js',
      fileList: [
        `${baseDir}/test.js`,
        `${baseDir}/deeper/test.js`,
        `${baseDir}/deeper/test2.js`,
        `${baseDir}/even/deeper/test.js`,
        `${baseDir}/.hidden/test.js`,
      ].map(normalizePath),
    })
  })

  it('should match pattern "**/*.js"', async () => {
    const result = await generateTasks({ config, cwd, baseDir, files })
    const linter = result.find((item) => item.pattern === '**/*.js')
    expect(linter).toEqual({
      pattern: '**/*.js',
      commands: 'any-js',
      fileList: [
        `${baseDir}/test.js`,
        `${baseDir}/deeper/test.js`,
        `${baseDir}/deeper/test2.js`,
        `${baseDir}/even/deeper/test.js`,
        `${baseDir}/.hidden/test.js`,
      ].map(normalizePath),
    })
  })

  it('should match pattern "deeper/*.js"', async () => {
    const result = await generateTasks({ config, cwd, baseDir, files })
    const linter = result.find((item) => item.pattern === 'deeper/*.js')
    expect(linter).toEqual({
      pattern: 'deeper/*.js',
      commands: 'deeper-js',
      fileList: [`${baseDir}/deeper/test.js`, `${baseDir}/deeper/test2.js`].map(normalizePath),
    })
  })

  it('should match pattern ".hidden/*.js"', async () => {
    const result = await generateTasks({ config, cwd, baseDir, files })
    const linter = result.find((item) => item.pattern === '.hidden/*.js')
    expect(linter).toEqual({
      pattern: '.hidden/*.js',
      commands: 'hidden-js',
      fileList: [`${baseDir}/.hidden/test.js`].map(normalizePath),
    })
  })

  it('should match pattern "*.{css,js}"', async () => {
    const result = await generateTasks({ config, cwd, baseDir, files })
    const linter = result.find((item) => item.pattern === '*.{css,js}')
    expect(linter).toEqual({
      pattern: '*.{css,js}',
      commands: 'root-css-or-js',
      fileList: [
        `${baseDir}/test.js`,
        `${baseDir}/deeper/test.js`,
        `${baseDir}/deeper/test2.js`,
        `${baseDir}/even/deeper/test.js`,
        `${baseDir}/.hidden/test.js`,
        `${baseDir}/test.css`,
        `${baseDir}/deeper/test.css`,
        `${baseDir}/deeper/test2.css`,
        `${baseDir}/even/deeper/test.css`,
        `${baseDir}/.hidden/test.css`,
      ].map(normalizePath),
    })
  })

  it('should not match files in parent directory by default', async () => {
    const result = await generateTasks({
      config,
      cwd: path.join(baseDir, 'deeper'),
      baseDir,
      files,
    })
    const linter = result.find((item) => item.pattern === '*.js')
    expect(linter).toEqual({
      pattern: '*.js',
      commands: 'root-js',
      fileList: [`${baseDir}/deeper/test.js`, `${baseDir}/deeper/test2.js`].map(normalizePath),
    })
  })

  it('should match files in parent directory when pattern starts with "../"', async () => {
    const result = await generateTasks({
      config,
      cwd: path.join(baseDir, 'deeper'),
      baseDir,
      files,
    })
    const linter = result.find((item) => item.pattern === '../*.{css,js}')
    expect(linter).toEqual({
      commands: 'parent-dir-css-or-js',
      fileList: [`${baseDir}/test.js`, `${baseDir}/test.css`].map(normalizePath),
      pattern: '../*.{css,js}',
    })
  })

  it('should be able to return relative paths for "*.{css,js}"', async () => {
    const result = await generateTasks({ config, cwd, baseDir, files, relative: true })
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
        'deeper/test.css',
        'deeper/test2.css',
        'even/deeper/test.css',
        '.hidden/test.css',
      ].map(normalizePath),
    })
  })
})
