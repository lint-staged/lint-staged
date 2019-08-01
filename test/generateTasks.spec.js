import path from 'path'
import os from 'os'
import generateTasks from '../src/generateTasks'
import resolveGitDir from '../src/resolveGitDir'

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
  '.hidden/test.txt'
]

const filesSpecialCases = files.concat([
  'sub-dir/test.js',
  'sub-dir/deeper/test.js',
  'sub-dir/deeper/test2.js',
  'sub-dir/even/deeper/test.js',
  'sub-dir/.hidden/test.js',

  'test.py',
  'deeper/test.py',
  'deeper/test2.py',
  'even/deeper/test.py',
  '.hidden/test.py'
])

// Mocks get hoisted
jest.mock('../src/resolveGitDir.js')
const gitDir = path.join(os.tmpdir(), 'tmp-lint-staged')
resolveGitDir.mockResolvedValue(gitDir)

const config = {
  '*.js': 'root-js',
  '**/*.js': 'any-js',
  'deeper/*.js': 'deeper-js',
  '.hidden/*.js': 'hidden-js',
  'unknown/*.js': 'unknown-js',
  '*.{css,js}': 'root-css-or-js',
  '../**/*.py': 'below-root-py'
}

describe('generateTasks', () => {
  beforeAll(() => {
    jest.spyOn(process, 'cwd').mockReturnValue(gitDir)
  })

  afterAll(() => {
    process.cwd.mockRestore()
  })

  it('should return absolute paths', async () => {
    const [task] = await generateTasks({
      config: {
        '*': 'lint'
      },
      gitDir,
      files
    })
    task.fileList.forEach(file => {
      expect(path.isAbsolute(file)).toBe(true)
    })
  })

  it('should not match non-children files', async () => {
    const relPath = path.join(process.cwd(), '..')
    const result = await generateTasks({ config, gitDir: relPath, files })
    const linter = result.find(item => item.pattern === '*.js')
    expect(linter).toEqual({
      pattern: '*.js',
      commands: 'root-js',
      fileList: []
    })
  })

  it('should return an empty file list for linters with no matches.', async () => {
    const result = await generateTasks({ config, gitDir, files })

    result.forEach(task => {
      if (task.commands === 'unknown-js' || task.commands === 'below-root-py') {
        expect(task.fileList.length).toEqual(0)
      } else {
        expect(task.fileList.length).not.toEqual(0)
      }
    })
  })

  it('should match pattern "*.js"', async () => {
    const result = await generateTasks({ config, gitDir, files })
    const linter = result.find(item => item.pattern === '*.js')
    expect(linter).toEqual({
      pattern: '*.js',
      commands: 'root-js',
      fileList: [
        `${gitDir}/test.js`,
        `${gitDir}/deeper/test.js`,
        `${gitDir}/deeper/test2.js`,
        `${gitDir}/even/deeper/test.js`,
        `${gitDir}/.hidden/test.js`
      ].map(path.normalize)
    })
  })

  it('should match pattern "**/*.js"', async () => {
    const result = await generateTasks({ config, gitDir, files })
    const linter = result.find(item => item.pattern === '**/*.js')
    expect(linter).toEqual({
      pattern: '**/*.js',
      commands: 'any-js',
      fileList: [
        `${gitDir}/test.js`,
        `${gitDir}/deeper/test.js`,
        `${gitDir}/deeper/test2.js`,
        `${gitDir}/even/deeper/test.js`,
        `${gitDir}/.hidden/test.js`
      ].map(path.normalize)
    })
  })

  it('should match pattern "deeper/*.js"', async () => {
    const result = await generateTasks({ config, gitDir, files })
    const linter = result.find(item => item.pattern === 'deeper/*.js')
    expect(linter).toEqual({
      pattern: 'deeper/*.js',
      commands: 'deeper-js',
      fileList: [`${gitDir}/deeper/test.js`, `${gitDir}/deeper/test2.js`].map(path.normalize)
    })
  })

  it('should match pattern ".hidden/*.js"', async () => {
    const result = await generateTasks({ config, gitDir, files })
    const linter = result.find(item => item.pattern === '.hidden/*.js')
    expect(linter).toEqual({
      pattern: '.hidden/*.js',
      commands: 'hidden-js',
      fileList: [path.normalize(`${gitDir}/.hidden/test.js`)]
    })
  })

  it('should match pattern "*.{css,js}"', async () => {
    const result = await generateTasks({ config, gitDir, files })
    const linter = result.find(item => item.pattern === '*.{css,js}')
    expect(linter).toEqual({
      pattern: '*.{css,js}',
      commands: 'root-css-or-js',
      fileList: [
        `${gitDir}/test.js`,
        `${gitDir}/deeper/test.js`,
        `${gitDir}/deeper/test2.js`,
        `${gitDir}/even/deeper/test.js`,
        `${gitDir}/.hidden/test.js`,
        `${gitDir}/test.css`,
        `${gitDir}/deeper/test.css`,
        `${gitDir}/deeper/test2.css`,
        `${gitDir}/even/deeper/test.css`,
        `${gitDir}/.hidden/test.css`
      ].map(path.normalize)
    })
  })

  it('should be able to return relative paths for "*.{css,js}"', async () => {
    const result = await generateTasks({ config, gitDir, files, relative: true })
    const linter = result.find(item => item.pattern === '*.{css,js}')
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
        '.hidden/test.css'
      ].map(path.normalize)
    })
  })
})

describe('generateTasks Special Cases', () => {
  beforeAll(() => {
    jest.spyOn(process, 'cwd').mockReturnValue(path.join(gitDir, 'sub-dir'))
  })

  afterAll(() => {
    process.cwd.mockRestore()
  })

  it('should not match non-children files', async () => {
    const relPath = path.join(process.cwd(), '..')
    const result = await generateTasks({ config, gitDir: relPath, files: filesSpecialCases })
    const linter = result.find(item => item.pattern === '*.js')
    expect(linter).toEqual({
      pattern: '*.js',
      commands: 'root-js',
      fileList: filesSpecialCases
        .filter(x => /sub-dir/.test(x))
        .map(x => path.join(gitDir, x))
        .map(path.normalize)
    })
  })

  it('should match non-children files when configured', async () => {
    const relPath = path.join(process.cwd(), '..')
    const result = await generateTasks({ config, gitDir: relPath, files: filesSpecialCases })
    const linter = result.find(item => item.pattern === '../**/*.py')
    expect(linter).toEqual({
      pattern: '../**/*.py',
      commands: 'below-root-py',
      fileList: filesSpecialCases
        .filter(x => !/sub-dir/.test(x) && /.py$/.test(x))
        .map(x => path.join(gitDir, x))
        .map(path.normalize)
    })
  })
})
