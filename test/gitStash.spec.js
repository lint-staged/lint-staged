const path = require('path')
const tmp = require('tmp')
const gitflow = require('../src/gitWorkflow')
const pify = require('pify')
const fsp = pify(require('fs'))

jest.dontMock('execa')
tmp.setGracefulCleanup()

let wcDir
let wcDirPath
let gitOpts = { cwd: 'test/__fixtures__' }
const initialContent = `module.exports = {
    test: 'test2'
}
`

async function gitStatus(opts = gitOpts) {
  return gitflow.execGit(['status', '--porcelain'], opts)
}

async function gitStashList(opts = gitOpts) {
  return gitflow.execGit(['stash', 'list'], opts)
}

async function readFile(filepath, dir = wcDirPath) {
  const content = await fsp.readFile(path.join(dir, filepath), { encoding: 'utf-8' })
  return content.replace(/\r\n/g, '\n')
}

describe('git', () => {
  beforeEach(async () => {
    wcDir = tmp.dirSync({ unsafeCleanup: true })
    wcDirPath = wcDir.name
    gitOpts = {
      cwd: wcDirPath
    }

    // Init repository
    await gitflow.execGit('init', gitOpts)
    // Create JS file
    await fsp.writeFile(
      path.join(wcDirPath, 'test.js'),
      `module.exports = {
  test: 'test',

  foo: 'bar'
}
`
    )
    await fsp.writeFile(
      path.join(wcDirPath, 'test.css'),
      `.test {
    border: 1px solid green;
}
`
    )
    await gitflow.execGit(['config', 'user.name', '"test"'], gitOpts)
    await gitflow.execGit(['config', 'user.email', '"test@test.com"'], gitOpts)
    // Track all files
    await gitflow.execGit(['add', '.'], gitOpts)
    // Create inital commit
    await gitflow.execGit(['commit', '-m', '"Initial commit"'], gitOpts)
    // Update one of the files
    await fsp.writeFile(path.join(wcDirPath, 'test.css'), '.test { border: red; }')
    // Update one of the files
    await fsp.writeFile(path.join(wcDirPath, 'test.js'), initialContent)
  })

  afterEach(() => {
    wcDir.removeCallback()
  })

  describe('hasPartiallyStagedFiles', () => {
    it('should return false if files are not staged', async () => {
      const res = await gitflow.hasPartiallyStagedFiles(gitOpts)
      expect(res).toEqual(false)
    })

    it('should return false if there are no modified files exist', async () => {
      await gitflow.execGit(['checkout', '.'], gitOpts)
      const res = await gitflow.hasPartiallyStagedFiles(gitOpts)
      expect(res).toEqual(false)
    })

    it('should return false if changes are already in the index', async () => {
      await gitflow.execGit(['checkout', 'test.css'], gitOpts)
      await gitflow.execGit(['add', 'test.js'], gitOpts)
      const res = await gitflow.hasPartiallyStagedFiles(gitOpts)
      expect(res).toEqual(false)
    })

    it('should return true if files are modified and in the index', async () => {
      await gitflow.execGit(['checkout', 'test.css'], gitOpts)
      await gitflow.execGit(['add', 'test.js'], gitOpts)
      await fsp.writeFile(path.join(wcDirPath, 'test.js'), '')
      const res = await gitflow.hasPartiallyStagedFiles(gitOpts)
      expect(res).toEqual(true)
    })
  })

  describe('gitStashSave/gitStashPop', () => {
    it('should stash and restore WC state without a commit', async () => {
      expect(await gitStatus()).toContain(' M test.css')
      expect(await gitStatus()).toContain(' M test.js')

      // Add test.js to index
      await gitflow.execGit(['add', 'test.js'], gitOpts)
      expect(await gitStatus()).toContain(' M test.css')
      expect(await gitStatus()).toContain('M  test.js')

      // Stashing files
      await gitflow.gitStashSave(gitOpts)
      expect(await gitStatus()).not.toContain(' M test.css')
      expect(await gitStatus()).toContain('M  test.js')

      // Restoring state
      await gitflow.gitStashPop(gitOpts)
      expect(await gitStatus()).toContain(' M test.css')
      expect(await gitStatus()).toContain('M  test.js')

      // No stashed should left
      expect(await gitStashList()).toEqual('')
    })

    it('should not restore deleted files', async () => {
      // Delete test.js
      await gitflow.execGit(['checkout', 'test.js'], gitOpts)
      await gitflow.execGit(['rm', 'test.js'], gitOpts)
      expect(await gitStatus()).toContain(' M test.css')
      expect(await gitStatus()).toContain('D  test.js')

      // Stashing files
      await gitflow.gitStashSave(gitOpts)
      expect(await gitStatus()).not.toContain(' M test.css')
      expect(await gitStatus()).toContain('D  test.js')

      // Restoring state
      await gitflow.gitStashPop(gitOpts)
      expect(await gitStatus()).toContain(' M test.css')
      expect(await gitStatus()).toContain('D  test.js')
      expect(await gitStatus()).not.toContain('?? test.js')

      // No stashed should left
      expect(await gitStashList()).toEqual('')
    })

    it('should drop hooks fixes when aborted', async () => {
      expect(await gitStatus()).toContain(' M test.css')
      expect(await gitStatus()).toContain(' M test.js')

      // Add test.js to index
      await gitflow.execGit(['add', 'test.js'], gitOpts)
      // Save diff for the reference
      const initialIndex = await gitflow.execGit(['diff', '--cached'], gitOpts)

      // Expect test.js is in index
      expect(await gitStatus()).toContain(' M test.css')
      expect(await gitStatus()).toContain('M  test.js')
      expect(await gitflow.execGit(['diff', '--cached'], gitOpts)).toEqual(initialIndex)

      // Stashing state
      await gitflow.gitStashSave(gitOpts)

      // Only index should remain
      expect(await gitStatus()).not.toContain(' M test.css')
      expect(await gitStatus()).toContain('M  test.js')
      expect(await gitflow.execGit(['diff', '--cached'], gitOpts)).toEqual(initialIndex)

      // Do additional edits (imitate eslint --fix)
      const eslintContent = `module.exports = {
    test: 'test2',
    test: 'test2',
    test: 'test2',
    test: 'test2',
};`
      await fsp.writeFile(path.join(wcDirPath, 'test.js'), eslintContent)

      // Expect both indexed and modified state on one file
      expect(await gitStatus()).not.toContain(' M test.css')
      expect(await gitStatus()).toContain('MM test.js')
      // and index isn't modified
      expect(await gitflow.execGit(['diff', '--cached'], gitOpts)).toEqual(initialIndex)

      // Restoring state
      await gitflow.gitStashPop(gitOpts)
      // Expect stashed files to be back
      expect(await gitStatus()).toContain(' M test.css')
      expect(await gitStatus()).toContain('M  test.js')
      // and modification are gone
      expect(await readFile('test.js')).toEqual(initialContent)
      // Expect no modifications in index
      expect(await gitflow.execGit(['diff', '--cached'], gitOpts)).toEqual(initialIndex)

      // No stashed should left
      expect(await gitStashList()).toEqual('')
    })

    it('should drop hooks fixes and revert to user modifications when aborted', async () => {
      expect(await gitStatus()).toContain(' M test.css')
      expect(await gitStatus()).toContain(' M test.js')

      // Add test.js to index
      await gitflow.execGit(['add', 'test.js'], gitOpts)
      // Save diff for the reference
      const initialIndex = await gitflow.execGit(['diff', '--cached'], gitOpts)

      // User does additional edits
      const userContent = `module.exports = {
    test: 'test2',
    test: 'test3',
}`
      await fsp.writeFile(path.join(wcDirPath, 'test.js'), userContent)

      // Expect test.js is in both index and modified
      expect(await gitStatus()).toContain(' M test.css')
      expect(await gitStatus()).toContain('MM test.js')
      expect(await gitflow.execGit(['diff', '--cached'], gitOpts)).toEqual(initialIndex)

      // Stashing state
      await gitflow.gitStashSave(gitOpts)

      // Only index should remain
      expect(await gitStatus()).not.toContain(' M test.css')
      expect(await gitStatus()).toContain('M  test.js')

      // Do additional edits (imitate eslint --fix)
      await fsp.writeFile(
        path.join(wcDirPath, 'test.js'),
        `module.exports = {
    test: 'test2',
};`
      )

      // Expect both indexed and modified state on one file
      expect(await gitStatus()).toContain('MM test.js')
      // and index isn't modified
      expect(await gitflow.execGit(['diff', '--cached'], gitOpts)).toEqual(initialIndex)

      // Restoring state
      await gitflow.gitStashPop(gitOpts)

      // Expect stashed files to be back
      expect(await gitStatus()).toContain(' M test.css')
      expect(await gitStatus()).toContain('MM test.js')
      // and content is back to user modifications
      expect(await readFile('test.js')).toEqual(userContent)
      // Expect no modifications in index
      expect(await gitflow.execGit(['diff', '--cached'], gitOpts)).toEqual(initialIndex)

      // No stashed should left
      expect(await gitStashList()).toEqual('')
    })

    it('should add hooks fixes to index when not aborted', async () => {
      expect(await gitStatus()).toContain(' M test.css')
      expect(await gitStatus()).toContain(' M test.js')

      // Add test.js to index
      await gitflow.execGit(['add', 'test.js'], gitOpts)
      // Save diff for the reference
      const initialIndex = await gitflow.execGit(['diff', '--cached'], gitOpts)

      expect(await gitStatus()).toContain(' M test.css')
      expect(await gitStatus()).toContain('M  test.js')
      expect(await gitflow.execGit(['diff', '--cached'], gitOpts)).toEqual(initialIndex)

      // Stashing state
      await gitflow.gitStashSave(gitOpts)

      // Only index should remain
      expect(await gitStatus()).not.toContain(' M test.css')
      expect(await gitStatus()).toContain('M  test.js')

      // Do additional edits (imitate eslint --fix)
      const newContent = `module.exports = {
    test: "test2",
};`
      await fsp.writeFile(path.join(wcDirPath, 'test.js'), newContent)
      // and add to index
      await gitflow.execGit(['add', 'test.js'], gitOpts)
      await gitflow.updateStash(gitOpts)
      const newIndex = await gitflow.execGit(['diff', '--cached'], gitOpts)

      // Expect only index changes
      expect(await gitStatus()).toContain('M  test.js')
      // and index is modified
      expect(await gitflow.execGit(['diff', '--cached'], gitOpts)).not.toEqual(initialIndex)
      expect(await gitflow.execGit(['diff', '--cached'], gitOpts)).toEqual(newIndex)

      // Restoring state
      await gitflow.gitStashPop(gitOpts)

      // Expect stashed files to be back
      expect(await gitStatus()).toContain(' M test.css')
      expect(await gitStatus()).toContain('M  test.js')
      // and content keeps linter modifications
      expect(await readFile('test.js')).toEqual(newContent)
      // Expect modifications in index
      expect(await gitflow.execGit(['diff', '--cached'], gitOpts)).toEqual(newIndex)

      // No stashed should left
      expect(await gitStashList()).toEqual('')
    })

    it('should add hooks fixes to index and keep user modifications when not aborted', async () => {
      expect(await gitStatus()).toContain(' M test.css')
      expect(await gitStatus()).toContain(' M test.js')

      // Add test.js to index
      await gitflow.execGit(['add', 'test.js'], gitOpts)
      // Save diff for the reference
      const initialIndex = await gitflow.execGit(['diff', '--cached'], gitOpts)

      // User does additional edits
      const userContent = `module.exports = {
    test: 'test2',
    test: 'test3'
}`
      await fsp.writeFile(path.join(wcDirPath, 'test.js'), userContent)

      // Expect test.js is in both index and modified
      expect(await gitStatus()).toContain(' M test.css')
      expect(await gitStatus()).toContain('MM test.js')
      expect(await gitflow.execGit(['diff', '--cached'], gitOpts)).toEqual(initialIndex)

      // Stashing state
      await gitflow.gitStashSave(gitOpts)

      // Only index should remain
      expect(await gitStatus()).not.toContain(' M test.css')
      expect(await gitStatus()).toContain('M  test.js')
      expect(await gitflow.execGit(['diff', '--cached'], gitOpts)).toEqual(initialIndex)

      // Do additional edits (imitate eslint --fix)
      await fsp.writeFile(
        path.join(wcDirPath, 'test.js'),
        `module.exports = {
    test: "test2"
};`
      )
      // and add to index
      await gitflow.execGit(['add', 'test.js'], gitOpts)
      await gitflow.updateStash(gitOpts)
      const newIndex = await gitflow.execGit(['diff', '--cached'], gitOpts)

      // Expect index is modified
      expect(await gitflow.execGit(['diff', '--cached'], gitOpts)).not.toEqual(initialIndex)
      expect(await gitflow.execGit(['diff', '--cached'], gitOpts)).toEqual(newIndex)

      // Restoring state
      await gitflow.gitStashPop(gitOpts)

      // Expect stashed files to be back
      expect(await gitStatus()).toContain(' M test.css')
      expect(await gitStatus()).toContain('MM test.js')
      // and content is back to user modifications
      expect(await readFile('test.js')).toEqual(userContent)
      // Expect formatting changes in the index
      expect(await gitflow.execGit(['diff', '--cached'], gitOpts)).toEqual(newIndex)

      // No stashed should left
      expect(await gitStashList()).toEqual('')
    })

    it('should add hooks fixes to index and working copy on partially staged files', async () => {
      // Start with a clean state
      await gitflow.execGit(['checkout', '--', '.'], gitOpts)

      // Do additional edits and stage them
      await fsp.writeFile(
        path.join(wcDirPath, 'test.js'),
        `module.exports = {
  test: 'test',
  
  
  
  
  
  
  foo: '
  baz
  '
}`
      )
      await gitflow.execGit(['add', 'test.js'], gitOpts)

      // Do additional edits without adding to index
      await fsp.writeFile(
        path.join(wcDirPath, 'test.js'),
        `module.exports = {
  test: 'edited',
  
  
  
  
  
  
  foo: '
  baz
  '
}`
      )

      expect(await gitStatus()).toContain('MM test.js')
      // Save diff for the reference
      const initialIndex = await gitflow.execGit(['diff', '--cached'], gitOpts)

      // Stashing state
      await gitflow.gitStashSave(gitOpts)

      // Only index should remain
      expect(await gitStatus()).not.toContain(' M test.css')
      expect(await gitStatus()).toContain('M  test.js')
      expect(await gitflow.execGit(['diff', '--cached'], gitOpts)).toEqual(initialIndex)

      // Imitate running prettier on the version from the index
      await fsp.writeFile(
        path.join(wcDirPath, 'test.js'),
        `module.exports = {
  test: "test",
  
  
  
  
  

  foo: "baz"
};`
      )
      await gitflow.execGit(['add', 'test.js'], gitOpts)
      await gitflow.updateStash(gitOpts)
      const indexAfterEslint = await gitflow.execGit(['diff', '--cached'], gitOpts)

      // Restoring state
      await gitflow.gitStashPop(gitOpts)

      // Expect stashed files to be back
      expect(await gitStatus()).toContain('MM test.js')
      // and all lint-staged modifications to be gone
      expect(await gitflow.execGit(['diff', '--cached'], gitOpts)).toEqual(indexAfterEslint)
      expect(await readFile('test.js')).toEqual(`module.exports = {
  test: 'edited',
  
  
  
  
  

  foo: "baz"
};`)

      // No stashed should left
      expect(await gitStashList()).toEqual('')
    })
  })
})
