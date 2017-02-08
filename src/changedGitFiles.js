const { exec } = require('child_process')

module.exports = function changedGitFiles(opMode, callback) {
    const gitDiffCmd = 'git diff-tree -r --name-only --no-commit-id'
    let revA = 'HEAD@{1}'
    let revB = 'HEAD'

    if (opMode === 'checkout') {
        const params = process.env.GIT_PARAMS.split(' ')

        if (params[2] === '0') {
            // Exit early if this was only a file checkout, not a branch change ($3 == 1)
            callback(null, [])
            return
        }

        revA = params[0]
        revB = params[1]
    }

    exec(`${ gitDiffCmd } ${ revA } ${ revB }`, (err, sources) => {
        if (err) {
            callback(err)
        } else {
            callback(null, sources.split('\n').map(filename => ({ filename })))
        }
    })
}
