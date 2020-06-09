'use strict'

const chalk = require('chalk')
const { error, info, warning } = require('log-symbols')

const NOT_GIT_REPO = chalk.redBright(`${error} Current directory is not a git directory!`)

const FAILED_GET_STAGED_FILES = chalk.redBright(`${error} Failed to get staged files!`)

const NO_STAGED_FILES = `${info} No staged files found.`

const NO_TASKS = `${info} No staged files match any configured task.`

const skippingBackup = (hasInitialCommit) => {
  const reason = hasInitialCommit ? '`--no-stash` was used' : 'there’s no initial commit yet'
  return `${warning} ${chalk.yellow(`Skipping backup because ${reason}.\n`)}`
}

const DEPRECATED_GIT_ADD = `${warning} ${chalk.yellow(
  `Some of your tasks use \`git add\` command. Please remove it from the config since all modifications made by tasks will be automatically added to the git commit index.`
)}
`

const TASK_ERROR = 'Skipped because of errors from tasks.'

const SKIPPED_GIT_ERROR = 'Skipped because of previous git error.'

const GIT_ERROR = `\n  ${error} ${chalk.red(`lint-staged failed due to a git error.`)}`

const PREVENTED_EMPTY_COMMIT = `
  ${warning} ${chalk.yellow(`lint-staged prevented an empty git commit.
  Use the --allow-empty option to continue, or check your task configuration`)}
`

const RESTORE_STASH_EXAMPLE = `  Any lost modifications can be restored from a git stash:

    > git stash list
    stash@{0}: automatic lint-staged backup
    > git stash apply --index stash@{0}
`

const CONFIG_STDIN_ERROR = 'Error: Could not read config from stdin.'

const UNSAFE_SHELL = chalk.yellow(`${warning} Using the shell option is unsafe and might lead to command injection!
  This option will be replaced by the \`--unsafe-shell\` option in the next major version.
  Use the \`--unsafe-shell-disable-warnings\` option to disable this warning.`)

const UNSAFE_SHELL_WINDOWS = chalk.yellow(`
${warning} Filenames are not escaped on Windows! Do not use the \`--shell\` option unless you understand the risks!`)

const unsafeShellWarning = (platform = process.platform) =>
  UNSAFE_SHELL + (platform === 'win32' ? UNSAFE_SHELL_WINDOWS : '')

module.exports = {
  CONFIG_STDIN_ERROR,
  DEPRECATED_GIT_ADD,
  FAILED_GET_STAGED_FILES,
  GIT_ERROR,
  NO_STAGED_FILES,
  NO_TASKS,
  NOT_GIT_REPO,
  PREVENTED_EMPTY_COMMIT,
  RESTORE_STASH_EXAMPLE,
  SKIPPED_GIT_ERROR,
  skippingBackup,
  TASK_ERROR,
  unsafeShellWarning,
}
