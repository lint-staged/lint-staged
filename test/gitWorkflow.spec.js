/* eslint no-underscore-dangle: 0 */

import path from 'path'
import expect from 'expect'
import rewire from 'rewire'
import fsp from 'fs-promise'
import tmp from 'tmp'
import { toEventuallyEqual } from './utils'

const gitflow = rewire('../src/gitWorkflow')

let wcDir
let wcDirPath
let gitOpts = { cwd: 'test/__fixtures__' }

tmp.setGracefulCleanup()
expect.extend(toEventuallyEqual)

const execaSpy = expect.createSpy().andReturn(new Promise(resolve => resolve()))
const gitStatus = opts => gitflow.execGit(['status', '--porcelain'], opts)

describe('gitWorkflow', () => {

    describe('getCmdArgs', () => {
        it('should return empty Array if not specified', () => {
            expect(gitflow.getCmdArgs()).toEqual([])
        })
        it('should return an Array with --git-dir if specified', () => {
            const tmpDir = tmp.dirSync()
            expect(gitflow.getCmdArgs(tmpDir.name))
                .toEqual(['--git-dir', tmpDir.name])
            tmpDir.removeCallback()
        })
        it('should work with relative paths', () => {
            expect(gitflow.getCmdArgs(path.join('.', 'test')))
                .toEqual(['--git-dir', path.resolve(process.cwd(), 'test')])
        })
    })

    describe('execGit', () => {

        afterEach(() => {
            execaSpy.reset()
            execaSpy.restore()
        })

        it('should execute git in cwd if working copy is not specified', async() => {
            const revert = gitflow.__set__('execa', execaSpy)
            await gitflow.execGit(['init', 'param'])
            expect(execaSpy).toHaveBeenCalledWith(
                'git',
                ['init', 'param'],
                { cwd: path.resolve(process.cwd()) }
            )
            revert()
        })

        it('should execute git in a given working copy', async() => {
            const revert = gitflow.__set__('execa', execaSpy)
            await gitflow.execGit(['init', 'param'], { cwd: 'test/__fixtures__' })
            expect(execaSpy).toHaveBeenCalledWith(
                'git',
                ['init', 'param'],
                { cwd: path.resolve(process.cwd(), 'test', '__fixtures__') }
            )
            revert()
        })

        it('should execute git with a given gitDir', async() => {
            const revert = gitflow.__set__('execa', execaSpy)
            await gitflow.execGit(['init', 'param'], {
                gitDir: path.resolve('..')
            })
            expect(execaSpy).toHaveBeenCalledWith(
                'git',
                ['--git-dir', path.resolve(process.cwd(), '..'), 'init', 'param'],
                { cwd: path.resolve(process.cwd()) }
            )
            revert()
        })

        it('should work with relative paths', async() => {
            const revert = gitflow.__set__('execa', execaSpy)
            await gitflow.execGit(['init', 'param'], {
                gitDir: '..',
                cwd: 'test/__fixtures__'
            })
            expect(execaSpy).toHaveBeenCalledWith(
                'git',
                ['--git-dir', path.resolve(process.cwd(), '..'), 'init', 'param'],
                { cwd: path.resolve(process.cwd(), 'test', '__fixtures__') }
            )
            revert()
        })
    })

    describe('gitStashSave/gitStashPop', () => {
        beforeEach(async() => {
            wcDir = tmp.dirSync({ unsafeCleanup: true })
            wcDirPath = wcDir.name
            gitOpts = {
                cwd: wcDirPath,
                gitDir: path.join(wcDirPath, '.git')
            }

            // Init repository
            await gitflow.execGit('init', gitOpts)
            // Create JS file
            await fsp.writeFile(path.join(wcDirPath, 'test.js'), `module.exports = {
    test: 'test'
}
`)
            await fsp.writeFile(path.join(wcDirPath, 'test.css'), `.test {
    border: 1px solid green;
}
`)
            await gitflow.execGit(['config', 'user.name', '"test"'], gitOpts)
            await gitflow.execGit(['config', 'user.email', '"test@test.com"'], gitOpts)
            // Add all files
            await gitflow.execGit(['add', '.'], gitOpts)
            // Create inital commit
            await gitflow.execGit(['commit', '-m', '"commit"'], gitOpts)
        })

        afterEach(() => {
            wcDir.removeCallback()
        })

        it('should stash and restore WC state without a commit', async() => {
            // Update one of the files
            await fsp.writeFile(path.join(wcDirPath, 'test.css'), '.test { border: red; }')
            // Update one of the files
            await fsp.writeFile(path.join(wcDirPath, 'test.js'), `module.exports = {
    test: 'test2'
}`)
            // Expect both are modified
            await expect(gitStatus(gitOpts)).toEventuallyEqual(' M test.css\n M test.js')
            await gitflow.execGit(['add', 'test.js'], gitOpts)
            // Expect one is in index
            await expect(gitStatus(gitOpts)).toEventuallyEqual(' M test.css\nM  test.js')
            await gitflow.gitStashSave(gitOpts)
            // Expect only one file from indexed
            await expect(gitStatus(gitOpts)).toEventuallyEqual('M  test.js')
            // Restoring state
            await gitflow.gitStashPop(gitOpts)
            // Expect stashed files to be back. Indexed file remains indexed
            await expect(gitStatus(gitOpts)).toEventuallyEqual(' M test.css\nM  test.js')
        })

        it('should stash and restore WC state with additional edits without a commit', async() => {
            // Update one of the files
            await fsp.writeFile(path.join(wcDirPath, 'test.css'), '.test { border: red; }')
            // Update one of the files
            await fsp.writeFile(path.join(wcDirPath, 'test.js'), `module.exports = {
    test: 'test2'
}`)
            // Expect both are modified
            await expect(gitStatus(gitOpts)).toEventuallyEqual(' M test.css\n M test.js')
            await gitflow.execGit(['add', 'test.js'], gitOpts)
            // Expect one is in index
            await expect(gitStatus(gitOpts)).toEventuallyEqual(' M test.css\nM  test.js')
            await gitflow.gitStashSave(gitOpts)
            // Expect only one file from indexed
            await expect(gitStatus(gitOpts)).toEventuallyEqual('M  test.js')
            // Do additional edits (imitate eslint --fix)
            await fsp.writeFile(path.join(wcDirPath, 'test.js'), `module.exports = {
    test: 'test2',
};`)

            // Expect both indexed and modified state on one file
            await expect(gitStatus(gitOpts)).toEventuallyEqual('MM test.js')
            // Restoring state
            await gitflow.gitStashPop(gitOpts)
            // Expect stashed files to be back. Commited file is gone.
            await expect(gitStatus(gitOpts)).toEventuallyEqual(' M test.css\nM  test.js')
            const jsContent = await fsp.readFileSync(path.join(wcDirPath, 'test.js'), { encoding: 'utf-8' })
            expect(jsContent).toEqual(`module.exports = {
    test: 'test2'
}`)
        })

        it('should stash and restore WC state with additional edits before a commit', async() => {
            // Update one of the files
            await fsp.writeFile(path.join(wcDirPath, 'test.css'), '.test { border: red; }')
            // Update one of the files
            await fsp.writeFile(path.join(wcDirPath, 'test.js'), `module.exports = {
    test: 'test2'
}`)
            // Expect both are modified
            await expect(gitStatus(gitOpts)).toEventuallyEqual(' M test.css\n M test.js')
            await gitflow.execGit(['add', '.'], gitOpts)
            // Expect both are in index
            await expect(gitStatus(gitOpts)).toEventuallyEqual('M  test.css\nM  test.js')
            await gitflow.gitStashSave(gitOpts)
            // Expect both are in index
            await expect(gitStatus(gitOpts)).toEventuallyEqual('M  test.css\nM  test.js')
            // Do additional edits (simulate eslint --fix)
            await fsp.writeFile(path.join(wcDirPath, 'test.js'), `module.exports = {
    test: 'test2',
};`)
            // Expect both indexed and modified state on one file
            await expect(gitStatus(gitOpts)).toEventuallyEqual('M  test.css\nMM test.js')
            // Add additional changes to the commit
            await gitflow.execGit(['add', 'test.js'], gitOpts)
            // Expect both files are in the index
            await expect(gitStatus(gitOpts)).toEventuallyEqual('M  test.css\nM  test.js')
            // Restoring state
            await gitflow.gitStashPop(gitOpts)
            // Expect stashed files to be back. Index changes are persisted.
            await expect(gitStatus(gitOpts)).toEventuallyEqual('M  test.css\nM  test.js')
            const jsContent = await fsp.readFileSync(path.join(wcDirPath, 'test.js'), { encoding: 'utf-8' })
            expect(jsContent).toEqual(`module.exports = {
    test: 'test2',
};`)
        })

    })
})
