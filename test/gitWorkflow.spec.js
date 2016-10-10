/* eslint no-underscore-dangle: 0 */

import path from 'path'
import expect from 'expect'
import rewire from 'rewire'
import fsp from 'fs-promise'
import tmp from 'tmp'

const gitflow = rewire('../src/gitWorkflow')

let wcDir
let wcDirPath
let gitOpts = { cwd: 'test/__fixtures__' }

tmp.setGracefulCleanup()

const execaSpy = expect.createSpy().andReturn(new Promise(resolve => resolve()))

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

        it('should execute git in cwd if working copy is not specified', (done) => {
            const revert = gitflow.__set__('execa', execaSpy)
            gitflow.execGit(['init', 'param'])
                .then(() => {
                    expect(execaSpy).toHaveBeenCalledWith(
                        'git',
                        ['init', 'param'],
                        { cwd: path.resolve(process.cwd()) }
                    )
                    revert()
                    done()
                })
        })

        it('should execute git in a given working copy', (done) => {
            const revert = gitflow.__set__('execa', execaSpy)
            gitflow.execGit(['init', 'param'], { cwd: 'test/__fixtures__' })
                .then(() => {
                    expect(execaSpy).toHaveBeenCalledWith(
                        'git',
                        ['init', 'param'],
                        { cwd: path.resolve(process.cwd(), 'test', '__fixtures__') }
                    )
                    revert()
                    done()
                })
        })

        it('should execute git with a given gitDir', (done) => {
            const revert = gitflow.__set__('execa', execaSpy)
            gitflow.execGit(['init', 'param'], {
                gitDir: path.resolve('..')
            })
                .then(() => {
                    expect(execaSpy).toHaveBeenCalledWith(
                        'git',
                        ['--git-dir', path.resolve(process.cwd(), '..'), 'init', 'param'],
                        { cwd: path.resolve(process.cwd()) }
                    )
                    revert()
                    done()
                })
        })

        it('should work with relative paths', (done) => {
            const revert = gitflow.__set__('execa', execaSpy)
            gitflow.execGit(['init', 'param'], {
                gitDir: '..',
                cwd: 'test/__fixtures__'
            })
                .then(() => {
                    expect(execaSpy).toHaveBeenCalledWith(
                        'git',
                        ['--git-dir', path.resolve(process.cwd(), '..'), 'init', 'param'],
                        { cwd: path.resolve(process.cwd(), 'test', '__fixtures__') }
                    )
                    revert()
                    done()
                })
        })
    })

    describe('gitStashSave/gitStashPop', () => {
        beforeEach((done) => {
            wcDir = tmp.dirSync({ unsafeCleanup: true })
            wcDirPath = wcDir.name
            gitOpts = {
                cwd: wcDirPath,
                gitDir: path.join(wcDirPath, '.git')
            }

            // Init repository
            gitflow.execGit('init', gitOpts)
                // Create JS file
                .then(() => fsp.writeFile(path.join(wcDirPath, 'test.js'), `module.exports = {
    test: 'test'
}
`))
                .then(() => fsp.writeFile(path.join(wcDirPath, 'test.css'), `.test {
    border: 1px solid green;
}
`))
                .then(() => gitflow.execGit(['config', 'user.name', '"test"'], gitOpts))
                .then(() => gitflow.execGit(['config', 'user.email', '"test@test.com"'], gitOpts))
                // Add all files
                .then(() => gitflow.execGit(['add', '.'], gitOpts))
                // Create inital commit
                .then(() => gitflow.execGit(['commit', '-m', '"commit"'], gitOpts))
                .then(() => done())
        })

        afterEach(() => {
            wcDir.removeCallback()
        })

        it('should stash and restore WC state without a commit', (done) => {
            // Update one of the files
            fsp.writeFile(path.join(wcDirPath, 'test.css'), '.test { border: red; }')
                // Update one of the files
                .then(() => fsp.writeFile(path.join(wcDirPath, 'test.js'), `module.exports = {
    test: 'test2'
}`))
                .then(() => gitflow.execGit(['status', '--porcelain'], gitOpts))
                .then((res) => {
                    // Expect both are modified
                    expect(res.stdout).toEqual(' M test.css\n M test.js')
                })
                .then(() => gitflow.execGit(['add', 'test.js'], gitOpts))
                .then(() => gitflow.execGit(['status', '--porcelain'], gitOpts))
                .then((res) => {
                    // Expect one is in index
                    expect(res.stdout).toEqual(' M test.css\nM  test.js')
                })
                .then(() => gitflow.gitStashSave(gitOpts))
                .then(() => gitflow.execGit(['status', '--porcelain'], gitOpts))
                .then((res) => {
                    // Expect only one file from indexed
                    expect(res.stdout).toEqual('M  test.js')
                })

                // Restoring state
                .then(() => gitflow.gitStashPop(gitOpts))
                .then(() => gitflow.execGit(['status', '--porcelain'], gitOpts))
                .then((res) => {
                    // Expect stashed files to be back. Indexed file remains indexed
                    expect(res.stdout).toEqual(' M test.css\nM  test.js')
                    done()
                })
        })

        it('should stash and restore WC state after commit', (done) => {
            // Update one of the files
            fsp.writeFile(path.join(wcDirPath, 'test.css'), '.test { border: red; }')
                // Update one of the files
                .then(() => fsp.writeFile(path.join(wcDirPath, 'test.js'), `module.exports = {
    test: 'test2'
}`))
                .then(() => gitflow.execGit(['status', '--porcelain'], gitOpts))
                .then((res) => {
                    // Expect both are modified
                    expect(res.stdout).toEqual(' M test.css\n M test.js')
                })
                .then(() => gitflow.execGit(['add', 'test.js'], gitOpts))
                .then(() => gitflow.execGit(['status', '--porcelain'], gitOpts))
                .then((res) => {
                    // Expect one is in index
                    expect(res.stdout).toEqual(' M test.css\nM  test.js')
                })
                .then(() => gitflow.gitStashSave(gitOpts))
                .then(() => gitflow.execGit(['status', '--porcelain'], gitOpts))
                .then((res) => {
                    // Expect only one file from indexed
                    expect(res.stdout).toEqual('M  test.js')
                })

                .then(() => gitflow.execGit(['commit', '-m', 'second commit'], gitOpts))
                .then(() => gitflow.execGit(['status', '--porcelain'], gitOpts))
                .then((res) => {
                    // Expect clean WC
                    expect(res.stdout).toEqual('')
                })

                // Restoring state
                .then(() => gitflow.gitStashPop(gitOpts))
                .then(() => gitflow.execGit(['status', '--porcelain'], gitOpts))
                .then((res) => {
                    // Expect stashed files to be back. Commited file is gone.
                    expect(res.stdout).toEqual(' M test.css')
                    done()
                })
        })

        it('should stash and restore WC state with additional edits without a commit', (done) => {
            // Update one of the files
            fsp.writeFile(path.join(wcDirPath, 'test.css'), '.test { border: red; }')
                // Update one of the files
                .then(() => fsp.writeFile(path.join(wcDirPath, 'test.js'), `module.exports = {
    test: 'test2'
}`))
                .then(() => gitflow.execGit(['status', '--porcelain'], gitOpts))
                .then((res) => {
                    // Expect both are modified
                    expect(res.stdout).toEqual(' M test.css\n M test.js')
                })
                .then(() => gitflow.execGit(['add', 'test.js'], gitOpts))
                .then(() => gitflow.execGit(['status', '--porcelain'], gitOpts))
                .then((res) => {
                    // Expect one is in index
                    expect(res.stdout).toEqual(' M test.css\nM  test.js')
                })
                .then(() => gitflow.gitStashSave(gitOpts))
                .then(() => gitflow.execGit(['status', '--porcelain'], gitOpts))
                .then((res) => {
                    // Expect only one file from indexed
                    expect(res.stdout).toEqual('M  test.js')
                })

                // Do additional edits (imitate eslint --fix)
                .then(() => fsp.writeFile(path.join(wcDirPath, 'test.js'), `module.exports = {
    test: 'test2',
};`))

                .then(() => gitflow.execGit(['status', '--porcelain'], gitOpts))
                .then((res) => {
                    // Expect both indexed and modified state on one file
                    expect(res.stdout).toEqual('MM test.js')
                })

                // Restoring state
                .then(() => gitflow.gitStashPop(gitOpts))
                .then(() => gitflow.execGit(['status', '--porcelain'], gitOpts))
                .then((res) => {
                    const jsContent = fsp.readFileSync(path.join(wcDirPath, 'test.js'), { encoding: 'utf-8' })
                    // Expect stashed files to be back. Commited file is gone.
                    expect(res.stdout).toEqual(' M test.css\nM  test.js')
                    expect(jsContent).toEqual(`module.exports = {
    test: 'test2'
}`)
                    done()
                })
        })

    })
})
