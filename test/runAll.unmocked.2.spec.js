import fs from 'fs-extra'
import makeConsoleMock from 'consolemock'
import normalize from 'normalize-path'
import os from 'os'
import path from 'path'
import nanoid from 'nanoid'

jest.mock('../lib/file')

import execGitBase from '../lib/execGit'
import { readBufferFromFile, writeBufferToFile } from '../lib/file'
import runAll from '../lib/runAll'

jest.unmock('execa')

jest.setTimeout(20000)

const testJsFilePretty = `module.exports = {
  foo: "bar"
};
`

const isAppveyor = !!process.env.APPVEYOR
const osTmpDir = isAppveyor ? 'C:\\projects' : fs.realpathSync(os.tmpdir())

/**
 * Create temporary directory and return its path
 * @returns {Promise<String>}
 */
const createTempDir = async () => {
  const dirname = path.resolve(osTmpDir, 'lint-staged-test', nanoid())
  await fs.ensureDir(dirname)
  return dirname
}

/**
 * Remove temporary directory
 * @param {String} dirname
 * @returns {Promise<Void>}
 */
const removeTempDir = async dirname => {
  await fs.remove(dirname)
}

let tmpDir
let cwd

// Append to file, creating if it doesn't exist
const appendFile = async (filename, content, dir = cwd) =>
  fs.appendFile(path.join(dir, filename), content)

// Wrap execGit to always pass `gitOps`
const execGit = async args => execGitBase(args, { cwd })

// Execute runAll before git commit to emulate lint-staged
const gitCommit = async (options, args = ['-m test']) => {
  await runAll({ ...options, cwd, quiet: true })
  await execGit(['commit', ...args])
}

const globalConsoleTemp = console

describe('runAll', () => {
  beforeAll(() => {
    console = makeConsoleMock()
  })

  beforeEach(async () => {
    tmpDir = await createTempDir()
    cwd = normalize(tmpDir)
    // Init repository with initial commit
    await execGit('init')
    await execGit(['config', 'user.name', '"test"'])
    await execGit(['config', 'user.email', '"test@test.com"'])
    await appendFile('README.md', '# Test\n')
    await execGit(['add', 'README.md'])
    await execGit(['commit', '-m initial commit'])
  })

  afterEach(async () => {
    console.clearHistory()
    if (!isAppveyor) {
      await removeTempDir(tmpDir)
    }
  })

  afterAll(() => {
    console = globalConsoleTemp
  })

  it('Should throw when restoring untracked files fails', async () => {
    readBufferFromFile.mockImplementation(async () => [Buffer.from('')])
    writeBufferToFile.mockImplementation(async () => Promise.reject('test'))

    // Stage pretty file
    await appendFile('test.js', testJsFilePretty)
    await execGit(['add', 'test.js'])

    // Create untracked file
    await appendFile('test-untracked.js', testJsFilePretty)

    try {
      // Run lint-staged with `prettier --list-different` and commit pretty file
      await gitCommit({ config: { '*.js': 'prettier --list-different' } })
    } catch (error) {
      expect(error.message).toEqual('Untracked changes could not be restored due to an error!')
    }
  })
})
