'use strict'

const chalk = require('chalk')
const symbols = require('log-symbols')

const NO_STAGED_FILES = `${symbols.info} No staged files found.`

const skippingBackup = (hasInitialCommit) => {
  const reason = hasInitialCommit ? '`--no-stash` was used' : 'there’s no initial commit yet'
  return `${symbols.warning} ${chalk.yellow(`Skipping backup because ${reason}.\n`)}`
}

const DEPRECATED_GIT_ADD = `${symbols.warning} ${chalk.yellow(
  `Some of your tasks use \`git add\` command. Please remove it from the config since all modifications made by tasks will be automatically added to the git commit index.`
)}
`

const TASK_ERROR = 'Skipped because of errors from tasks.'

const SKIPPED_GIT_ERROR = 'Skipped because of previous git error.'

const GIT_ERROR = `\n  ${symbols.error} ${chalk.red(`lint-staged failed due to a git error.`)}`

const PREVENTED_EMPTY_COMMIT = `
  ${symbols.warning} ${chalk.yellow(`lint-staged prevented an empty git commit.
  Use the --allow-empty option to continue, or check your task configuration`)}
`

const RESTORE_STASH_EXAMPLE = `  Any lost modifications can be restored from a git stash:

    > git stash list
    stash@{0}: automatic lint-staged backup
    > git stash apply --index stash@{0}
`

module.exports = {
  NO_STAGED_FILES,
  skippingBackup,
  DEPRECATED_GIT_ADD,
  TASK_ERROR,
  SKIPPED_GIT_ERROR,
  GIT_ERROR,
  PREVENTED_EMPTY_COMMIT,
  RESTORE_STASH_EXAMPLE
}
