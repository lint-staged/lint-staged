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

  'sub-dir/test.js',
  'sub-dir/deeper/test.js',
  'sub-dir/deeper/test2.js',
  'sub-dir/even/deeper/test.js',
  'sub-dir/.hidden/test.js',

  'test.py',
  'deeper/test.py',
  'deeper/test2.py',
  'even/deeper/test.py',
  '.hidden/test.py',

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

const config = {
  '*.js': 'root-js',
  '**/*.js': 'any-js',
  'deeper/*.js': 'deeper-js',
  '.hidden/*.js': 'hidden-js',
  'unknown/*.js': 'unknown-js',
  '*.{css,js}': 'root-css-or-js',
  '../**/*.js': 'below-root-js',
  '../**/*.py': 'below-root-py'
}

// Mocks get hoisted
jest.mock('../src/resolveGitDir.js')
const gitDir = path.join(os.tmpdir(), 'tmp-lint-staged')
resolveGitDir.mockResolvedValue(gitDir)

describe('generateTasks', () => {
  beforeAll(() => {
    jest.spyOn(process, 'cwd').mockReturnValue(path.join(gitDir, 'sub-dir'))
  })

  afterAll(() => {
    process.cwd.mockRestore()
  })

  it('should not match non-children files', async () => {
    const relPath = path.join(process.cwd(), '..')
    const result = await generateTasks({ config, gitDir: relPath, files })
    const linter = result.find(item => item.pattern === '*.js')
    expect(linter).toEqual({
      pattern: '*.js',
      commands: 'root-js',
      fileList: files
        .filter(x => /sub-dir/.test(x))
        .map(x => path.join(gitDir, x))
        .map(path.normalize)
    })
  })

  it('should match non-children files when configured', async () => {
    const relPath = path.join(process.cwd(), '..')
    const result = await generateTasks({ config, gitDir: relPath, files })
    const linter = result.find(item => item.pattern === '../**/*.py')
    expect(linter).toEqual({
      pattern: '../**/*.py',
      commands: 'below-root-py',
      fileList: files
        .filter(x => !/sub-dir/.test(x) && /.py$/.test(x))
        .map(x => path.join(gitDir, x))
        .map(path.normalize)
    })
  })
})
