import path from 'path'
import fsp from 'fs-promise'
import tmp from 'tmp'
import gitflow from '../src/gitWorkflow'
import serializer from './jest-stdout-serializer'

jest.unmock('execa')
expect.addSnapshotSerializer(serializer)
tmp.setGracefulCleanup()

let wcDir
let wcDirPath
let gitOpts = { cwd: 'test/__fixtures__' }

async function gitStatus(opts) {
    return gitflow.execGit(['status', '--porcelain'], opts)
}

describe('git', () => {
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
            // Update one of the files
            await fsp.writeFile(path.join(wcDirPath, 'test.css'), '.test { border: red; }')
            // Update one of the files
            await fsp.writeFile(path.join(wcDirPath, 'test.js'), `module.exports = {
    test: 'test2'
}`)
        })

        afterEach(() => {
            wcDir.removeCallback()
        })

        it('should stash and restore WC state without a commit', async () => {
            // Expect both are modified
            expect(await gitStatus(gitOpts)).toMatchSnapshot()
            await gitflow.execGit(['add', 'test.js'], gitOpts)
            // Expect one is in index
            expect(await gitStatus(gitOpts)).toMatchSnapshot()
            await gitflow.gitStashSave(gitOpts)
            // Expect only one file from indexed
            expect(await gitStatus(gitOpts)).toMatchSnapshot()
            // Restoring state
            await gitflow.gitStashPop(gitOpts)
            // Expect stashed files to be back. Indexed file remains indexed
            expect(await gitStatus(gitOpts)).toMatchSnapshot()
        })

        it('should stash and restore WC state with additional edits without a commit', async() => {
            // Expect both are modified
            expect(await gitStatus(gitOpts)).toMatchSnapshot()
            await gitflow.execGit(['add', 'test.js'], gitOpts)
            // Expect one is in index
            expect(await gitStatus(gitOpts)).toMatchSnapshot()
            await gitflow.gitStashSave(gitOpts)
            // Expect only one file from indexed
            expect(await gitStatus(gitOpts)).toMatchSnapshot()
            // Do additional edits (imitate eslint --fix)
            await fsp.writeFile(path.join(wcDirPath, 'test.js'), `module.exports = {
    test: 'test2',
};`)

            // Expect both indexed and modified state on one file
            expect(await gitStatus(gitOpts)).toMatchSnapshot()
            // Restoring state
            await gitflow.gitStashPop(gitOpts)
            // Expect stashed files to be back. Commited file is gone.
            expect(await gitStatus(gitOpts)).toMatchSnapshot()
            const jsContent = await fsp.readFileSync(path.join(wcDirPath, 'test.js'), { encoding: 'utf-8' })
            expect(jsContent).toEqual(`module.exports = {
    test: 'test2'
}`)
        })

        xit('should stash and restore WC state with additional edits after the commit', async() => {
            // Expect both are modified
            expect(await gitStatus(gitOpts)).toMatchSnapshot()
            await gitflow.execGit(['add', '.'], gitOpts)
            // Expect both are in index
            expect(await gitStatus(gitOpts)).toMatchSnapshot()
            await gitflow.gitStashSave(gitOpts)
            // Expect both are in index
            expect(await gitStatus(gitOpts)).toMatchSnapshot()
            // Do additional edits (simulate eslint --fix)
            await fsp.writeFile(path.join(wcDirPath, 'test.js'), `module.exports = {
    test: 'test2',
};`)
            // Expect both indexed and modified state on one file
            expect(await gitStatus(gitOpts)).toMatchSnapshot()
            // Add additional changes to the commit
            await gitflow.execGit(['add', 'test.js'], gitOpts)
            // Expect both files are in the index
            expect(await gitStatus(gitOpts)).toMatchSnapshot()
            // Commit changes
            await gitflow.execGit(['commit', '-m', '"fixed code commit"'], gitOpts)
            // Restoring from stash after the commit simulating running post script
            await gitflow.gitRestore(gitOpts)
            // Expect stashed files to be back. Index changes should be persisted.
            expect(await gitStatus(gitOpts)).toMatchSnapshot()
            const jsContent = await fsp.readFileSync(path.join(wcDirPath, 'test.js'), { encoding: 'utf-8' })
            expect(jsContent).toEqual(`module.exports = {
    test: 'test2',
};`)
        })

    })
})
