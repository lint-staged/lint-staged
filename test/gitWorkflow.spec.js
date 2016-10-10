/* eslint no-underscore-dangle: 0 */

import path from 'path'
import expect from 'expect'
import rewire from 'rewire'
import fsp from 'fs-promise'
import tmp from 'tmp'

tmp.setGracefulCleanup()

const gitflow = rewire('../src/gitWorkflow')
const fixturesWCDir = path.resolve(process.cwd(), 'test', '__fixtures__')
const fixturesGitDir = path.join(fixturesWCDir, '.git')
let wcDir
let wcDirPath
let gitOpts = { cwd: 'test/__fixtures__' }

describe('gitWorkflow', () => {

    describe('getCmdArgs', () => {
        it('should return an Array', () => {
            expect(gitflow.getCmdArgs(path.resolve('test', '__fixtures__')))
                .toEqual(['--git-dir', fixturesGitDir])
        })
    })

    describe('execGit', () => {
        it('should call execa with proper arguments', (done) => {
            const spy = expect.createSpy().andReturn(new Promise((resolve) => {
                resolve()
            }))
            const revert = gitflow.__set__('execa', spy)
            gitflow.execGit(['init', 'param'], { cwd: path.resolve('test/__fixtures__') })
                .then(() => {
                    expect(spy).toHaveBeenCalledWith(
                        'git',
                        ['--git-dir', fixturesGitDir, 'init', 'param'],
                        { cwd: path.resolve(process.cwd(), 'test', '__fixtures__') }
                    )
                    spy.restore()
                    revert()
                    done()
                })
        })

        it('should call execa in cwd if cwd is not specified', (done) => {
            const spy = expect.createSpy().andReturn(new Promise((resolve) => {
                resolve()
            }))
            const revert = gitflow.__set__('execa', spy)
            gitflow.execGit(['init', 'param'])
                .then(() => {
                    expect(spy).toHaveBeenCalledWith(
                        'git',
                        ['--git-dir', path.resolve(process.cwd(), '.git'), 'init', 'param'],
                        { cwd: path.resolve(process.cwd()) }
                    )
                    spy.restore()
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
                cwd: wcDirPath
            }
            // Init repository
            gitflow.execGit('init', gitOpts)
            //    Create JS file
                .then(() => fsp.writeFile(path.join(wcDirPath, 'test.js'), `module.exports = {
    test: 'test'
}
`))
                .then(() => fsp.writeFile(path.join(wcDirPath, 'test.css'), `.test {
    border: 1px solid green;
}
`))
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
