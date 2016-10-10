/* eslint no-unused-expressions: 0 */

import path from 'path'
import expect from 'expect'
import rewire from 'rewire'
import fsp from 'fs-promise'

const gitflow = rewire('../src/gitWorkflow')
const wcDir = path.resolve(process.cwd(), 'test', '__fixtures__')
const gitDir = path.join(wcDir, '.git')
const gitOpts = { cwd: 'test/__fixtures__' }

describe('gitWorkflow', () => {

    describe('getCmdArgs', () => {
        it('should return an Array', () => {
            expect(gitflow.getCmdArgs('test/__fixtures__'))
                .toEqual(['--git-dir', gitDir])
        })
    })

    describe('execGit', () => {
        it('should call execa with proper arguments', (done) => {
            const spy = expect.createSpy().andReturn(new Promise((resolve) => {
                resolve()
            }))
            const revert = gitflow.__set__('execa', spy)
            gitflow.execGit(['init', 'param'], gitOpts)
                .then(() => {
                    expect(spy).toHaveBeenCalledWith('git', ['--git-dir', gitDir, 'init', 'param'], { cwd: wcDir })
                    spy.restore()
                    revert()
                    done()
                })
        })
    })

    describe.skip('gitStashSave', () => {
        before((done) => {
            // Init repository
            gitflow.execGit('init', gitOpts)
            // Add all files
                .then(() => gitflow.execGit(['add', '.'], gitOpts))
                // Create inital commit
                .then(() => gitflow.execGit(['commit', '-m', '"commit"'], gitOpts))
                // Update one file
                // Add it to index
                .then(res => {
                    console.log(res)
                    done()
                })
                .catch(err => console.log(err))
        })

        afterEach((done) => {
            console.log(111)
            gitflow.execGit(['reset', '--hard'], gitOpts)
                .then(() => fsp.readFile(path.join(wcDir, 'test.css'), {encoding:'utf8'}))
                .then(res => {
                    console.log(res)
                    done()
                })
        })

        after((done) => {
            fsp.remove(gitDir) // Delete git repository
                .then(done)

        })

        it('should properly stash with --keep-index', (done) => {
            // Do some changes on existing files
            fsp.writeFile(path.join(wcDir, 'test.css'), '.test { border: red; }')
                .then(() => fsp.writeFile(path.join(wcDir, 'test.js'), 'module.exports = {}'))
                .then(() => gitflow.execGit(['status', '--porcelain'], gitOpts))
                .then((res) => {
                    expect(res.stdout).toEqual(' M test.css\n M test.js')
                })
                .then(() => gitflow.execGit(['add', 'test.js'], gitOpts))
                .then(() => gitflow.execGit(['status', '--porcelain'], gitOpts))
                .then((res) => {
                    console.log(res)
                    expect(res.stdout).toEqual(' M test.css\nM  test.js')
                    done()
                })
                // .then(() => gitflow.gitStashSave(gitOpts))
                // .then(() => gitflow.execGit(['status', '--porcelain'], gitOpts))
                // .then((res) => {
                //     expect(res.stdout).toEqual('M  test.js')
                //     done()
                // })
                .catch(err => console.log(err))
            // execa('git', ['--work-tree', gitDir, 'init'])
            //     .then(res => {
            //         console.log(res)
            //         done()
            //     })
            //
            // expect(git).toNotBe(undefined)
            // done()

        })

    })
})
