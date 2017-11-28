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
resolveGitDir.mockReturnValue(workDir)

const config = {
  linters: {
    '*.js': 'root-js',
    '**/*.js': 'any-js',
    'deeper/*.js': 'deeper-js',
    '.hidden/*.js': 'hidden-js',
    'unknown/*.js': 'unknown-js',
    '*.{css,js}': 'root-css-or-js'
  }
}

describe('generateTasks', () => {
  beforeAll(() => {
    jest.spyOn(process, 'cwd').mockReturnValue(workDir)
  })

  afterAll(() => {
    process.cwd.mockRestore()
  })

  it('should work with simple configuration', () => {
    const result = generateTasks(
      {
        '*.js': 'lint'
      },
      ['test.js']
    )
    const commands = result.map(match => match.commands)
    expect(commands).toEqual(['lint'])
  })

  it('should work with advanced configuration', () => {
    const result = generateTasks(
      {
        linters: {
          '*.js': 'lint'
        }
      },
      ['test.js']
    )
    const commands = result.map(match => match.commands)
    expect(commands).toEqual(['lint'])
  })

  it('should return absolute paths', () => {
    const [task] = generateTasks(
      {
        linters: {
          '*': 'lint'
        }
      },
      files
    )
    task.fileList.forEach(file => {
      expect(path.isAbsolute(file)).toBe(true)
    })
  })

  it('should not match non-children files', () => {
    const relPath = path.resolve(path.join(process.cwd(), '..'))
    resolveGitDir.mockReturnValueOnce(relPath)
    const result = generateTasks(Object.assign({}, config), files)
    const linter = result.find(item => item.pattern === '*.js')
    expect(linter).toEqual({
      pattern: '*.js',
      commands: 'root-js',
      fileList: []
    })
  })

  it('should return an empty file list for linters with no matches.', () => {
    const result = generateTasks(config, files)

    result.forEach(task => {
      if (task.commands === 'unknown-js') {
        expect(task.fileList.length).toEqual(0)
      } else {
        expect(task.fileList.length).not.toEqual(0)
      }
    })
  })

  it('should match pattern "*.js"', () => {
    const result = generateTasks(config, files)
    const linter = result.find(item => item.pattern === '*.js')
    expect(linter).toEqual({
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

  it('should match pattern "**/*.js"', () => {
    const result = generateTasks(config, files)
    const linter = result.find(item => item.pattern === '**/*.js')
    expect(linter).toEqual({
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

  it('should match pattern "deeper/*.js"', () => {
    const result = generateTasks(config, files)
    const linter = result.find(item => item.pattern === 'deeper/*.js')
    expect(linter).toEqual({
      pattern: 'deeper/*.js',
      commands: 'deeper-js',
      fileList: [`${workDir}/deeper/test.js`, `${workDir}/deeper/test2.js`].map(path.normalize)
    })
  })

  it('should match pattern ".hidden/*.js"', () => {
    const result = generateTasks(config, files)
    const linter = result.find(item => item.pattern === '.hidden/*.js')
    expect(linter).toEqual({
      pattern: '.hidden/*.js',
      commands: 'hidden-js',
      fileList: [path.normalize(`${workDir}/.hidden/test.js`)]
    })
  })

  it('should match pattern "*.{css,js}"', () => {
    const result = generateTasks(config, files)
    const linter = result.find(item => item.pattern === '*.{css,js}')
    expect(linter).toEqual({
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
      fileList: [`${workDir}/test.js`, `${workDir}/test.css`, `${workDir}/test.txt`].map(
        path.normalize
      )
    })
  })
})
