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

// Mocks get hoisted
jest.mock('../src/resolveGitDir.js')
const workDir = path.join(os.tmpdir(), 'tmp-lint-staged')
resolveGitDir.mockResolvedValue(workDir)

const config = {
  '*.js': 'root-js',
  '**/*.js': 'any-js',
  'deeper/*.js': 'deeper-js',
  '.hidden/*.js': 'hidden-js',
  'unknown/*.js': 'unknown-js',
  '*.{css,js}': 'root-css-or-js'
}

describe('generateTasks', () => {
  beforeAll(() => {
    jest.spyOn(process, 'cwd').mockReturnValue(workDir)
  })

  afterAll(() => {
    process.cwd.mockRestore()
  })

  it('should return absolute paths', async () => {
    const [task] = await generateTasks(
      {
        '*': 'lint'
      },
      workDir,
      files
    )
    task.fileList.forEach(file => {
      expect(path.isAbsolute(file)).toBe(true)
    })
  })

  it('should not match non-children files', async () => {
    const relPath = path.join(process.cwd(), '..')
    const result = await generateTasks({ ...config }, relPath, files)
    const linter = result.find(item => item.pattern === '*.js')
    expect(linter).toEqual({
      title: expect.stringContaining('*.js'),
      pattern: '*.js',
      commands: 'root-js',
      fileList: []
    })
  })

  it('should return an empty file list for linters with no matches.', async () => {
    const result = await generateTasks(config, workDir, files)

    result.forEach(task => {
      if (task.commands === 'unknown-js') {
        expect(task.fileList.length).toEqual(0)
      } else {
        expect(task.fileList.length).not.toEqual(0)
      }
    })
  })

  it('should match pattern "*.js"', async () => {
    const result = await generateTasks(config, workDir, files)
    const linter = result.find(item => item.pattern === '*.js')
    expect(linter).toEqual({
      title: expect.stringContaining('*.js'),
      pattern: '*.js',
      commands: 'root-js',
      fileList: [
        `${workDir}/test.js`,
        `${workDir}/deeper/test.js`,
        `${workDir}/deeper/test2.js`,
        `${workDir}/even/deeper/test.js`,
        `${workDir}/.hidden/test.js`
      ].map(path.normalize)
    })
  })

  it('should match pattern "**/*.js"', async () => {
    const result = await generateTasks(config, workDir, files)
    const linter = result.find(item => item.pattern === '**/*.js')
    expect(linter).toEqual({
      title: expect.stringContaining('**/*.js'),
      pattern: '**/*.js',
      commands: 'any-js',
      fileList: [
        `${workDir}/test.js`,
        `${workDir}/deeper/test.js`,
        `${workDir}/deeper/test2.js`,
        `${workDir}/even/deeper/test.js`,
        `${workDir}/.hidden/test.js`
      ].map(path.normalize)
    })
  })

  it('should match pattern "deeper/*.js"', async () => {
    const result = await generateTasks(config, workDir, files)
    const linter = result.find(item => item.pattern === 'deeper/*.js')
    expect(linter).toEqual({
      title: expect.stringContaining('deeper/*.js'),
      pattern: 'deeper/*.js',
      commands: 'deeper-js',
      fileList: [`${workDir}/deeper/test.js`, `${workDir}/deeper/test2.js`].map(path.normalize)
    })
  })

  it('should match pattern ".hidden/*.js"', async () => {
    const result = await generateTasks(config, workDir, files)
    const linter = result.find(item => item.pattern === '.hidden/*.js')
    expect(linter).toEqual({
      title: expect.stringContaining('.hidden/*.js'),
      pattern: '.hidden/*.js',
      commands: 'hidden-js',
      fileList: [path.normalize(`${workDir}/.hidden/test.js`)]
    })
  })

  it('should match pattern "*.{css,js}"', async () => {
    const result = await generateTasks(config, workDir, files)
    const linter = result.find(item => item.pattern === '*.{css,js}')
    expect(linter).toEqual({
      title: expect.stringContaining('*.{css,js}'),
      pattern: '*.{css,js}',
      commands: 'root-css-or-js',
      fileList: [
        `${workDir}/test.js`,
        `${workDir}/deeper/test.js`,
        `${workDir}/deeper/test2.js`,
        `${workDir}/even/deeper/test.js`,
        `${workDir}/.hidden/test.js`,
        `${workDir}/test.css`,
        `${workDir}/deeper/test.css`,
        `${workDir}/deeper/test2.css`,
        `${workDir}/even/deeper/test.css`,
        `${workDir}/.hidden/test.css`
      ].map(path.normalize)
    })
  })
})
