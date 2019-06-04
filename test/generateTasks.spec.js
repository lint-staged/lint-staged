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

  it('should work with simple configuration', async () => {
    const result = await generateTasks(
      {
        '*.js': 'lint'
      },
      ['test.js']
    )
    const commands = result.map(match => match.commands)
    expect(commands).toEqual(['lint'])
  })

  it('should work with advanced configuration', async () => {
    const result = await generateTasks(
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

  it('should return absolute paths', async () => {
    const [task] = await generateTasks(
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

  it('should return relative paths', async () => {
    const [task] = await generateTasks(
      {
        linters: {
          '*': 'lint'
        },
        relative: true
      },
      files
    )
    task.fileList.forEach(file => {
      expect(path.isAbsolute(file)).toBe(false)
    })
  })

  it('should not match non-children files', async () => {
    const relPath = path.join(process.cwd(), '..')
    resolveGitDir.mockResolvedValueOnce(relPath)
    const result = await generateTasks({ ...config }, files)
    const linter = result.find(item => item.pattern === '*.js')
    expect(linter).toEqual({
      pattern: '*.js',
      commands: 'root-js',
      fileList: []
    })
  })

  it('should return an empty file list for linters with no matches.', async () => {
    const result = await generateTasks(config, files)

    result.forEach(task => {
      if (task.commands === 'unknown-js') {
        expect(task.fileList.length).toEqual(0)
      } else {
        expect(task.fileList.length).not.toEqual(0)
      }
    })
  })

  it('should match pattern "*.js"', async () => {
    const result = await generateTasks(config, files)
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

  it('should match pattern "*.js" and return relative path', async () => {
    const result = await generateTasks(Object.assign({}, config, { relative: true }), files)
    const linter = result.find(item => item.pattern === '*.js')
    expect(linter).toEqual({
      pattern: '*.js',
      commands: 'root-js',
      fileList: [
        `test.js`,
        `deeper/test.js`,
        `deeper/test2.js`,
        `even/deeper/test.js`,
        `.hidden/test.js`
      ].map(path.normalize)
    })
  })

  it('should match pattern "**/*.js"', async () => {
    const result = await generateTasks(config, files)
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

  it('should match pattern "**/*.js" with relative path', async () => {
    const result = await generateTasks(Object.assign({}, config, { relative: true }), files)
    const linter = result.find(item => item.pattern === '**/*.js')
    expect(linter).toEqual({
      pattern: '**/*.js',
      commands: 'any-js',
      fileList: [
        `test.js`,
        `deeper/test.js`,
        `deeper/test2.js`,
        `even/deeper/test.js`,
        `.hidden/test.js`
      ].map(path.normalize)
    })
  })

  it('should match pattern "deeper/*.js"', async () => {
    const result = await generateTasks(config, files)
    const linter = result.find(item => item.pattern === 'deeper/*.js')
    expect(linter).toEqual({
      pattern: 'deeper/*.js',
      commands: 'deeper-js',
      fileList: [`${workDir}/deeper/test.js`, `${workDir}/deeper/test2.js`].map(path.normalize)
    })
  })

  it('should match pattern ".hidden/*.js"', async () => {
    const result = await generateTasks(config, files)
    const linter = result.find(item => item.pattern === '.hidden/*.js')
    expect(linter).toEqual({
      pattern: '.hidden/*.js',
      commands: 'hidden-js',
      fileList: [path.normalize(`${workDir}/.hidden/test.js`)]
    })
  })

  it('should match pattern "*.{css,js}"', async () => {
    const result = await generateTasks(config, files)
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

  it('should support globOptions specified in advanced configuration', async () => {
    const result = await generateTasks(
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

  it('should ignore patterns in the ignore array of configuration', async () => {
    const pattern = '**/*.js'
    const commands = 'lint'
    const result = await generateTasks(
      {
        ignore: ['**/ignore/**', '**/ignore.*'],
        linters: { [pattern]: commands }
      },
      ['ignore/me.js', 'ignore.me.js', 'cool/js.js']
    )
    expect(result[0]).toEqual({
      pattern,
      commands,
      fileList: [`${workDir}/cool/js.js`].map(path.normalize)
    })
  })

  it('should not filter files for pattern which begins with `..`', async () => {
    jest.spyOn(process, 'cwd').mockReturnValueOnce(path.join(workDir, 'prj'))
    const result = await generateTasks(
      {
        linters: {
          '*.js': 'my-cmd',
          '../outside/*.js': 'my-cmd'
        }
      },
      ['root.js', 'prj/test.js', 'outside/test.js', 'outside/test2.js']
    )

    const prjTask = result.find(item => item.pattern === '*.js')
    expect(prjTask).toEqual({
      pattern: '*.js',
      commands: 'my-cmd',
      fileList: [`${workDir}/prj/test.js`].map(path.normalize)
    })

    const parentFolderTask = result.find(item => item.pattern === '../outside/*.js')
    expect(parentFolderTask).toEqual({
      pattern: '../outside/*.js',
      commands: 'my-cmd',
      fileList: [`${workDir}/outside/test.js`, `${workDir}/outside/test2.js`].map(path.normalize)
    })
  })
})
