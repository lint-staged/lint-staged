'use strict'

const chalk = require('chalk')
const { error, info, warning } = require('log-symbols')
const format = require('stringify-object')

const configurationError = (opt, helpMsg, value) =>
  `${chalk.redBright(`${error} Validation Error:`)}

  Invalid value for '${chalk.bold(opt)}': ${chalk.bold(
    format(value, { inlineCharacterLimit: Number.POSITIVE_INFINITY })
  )}

  ${helpMsg}`

const NOT_GIT_REPO = chalk.redBright(`${error} Current directory is not a git directory!`)

const FAILED_GET_STAGED_FILES = chalk.redBright(`${error} Failed to get staged files!`)

const incorrectBraces = (before, after) => `${warning} ${chalk.yellow(
  `Detected incorrect braces with only single value: \`${before}\`. Reformatted as: \`${after}\``
)}
`

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

const invalidOption = (name, value, message) => `${chalk.redBright(`${error} Validation Error:`)}

  Invalid value for option '${chalk.bold(name)}': ${chalk.bold(value)}

  ${message}

See https://github.com/okonet/lint-staged#command-line-flags`

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

module.exports = {
  CONFIG_STDIN_ERROR,
  configurationError,
  DEPRECATED_GIT_ADD,
  FAILED_GET_STAGED_FILES,
  GIT_ERROR,
  incorrectBraces,
  invalidOption,
  NO_STAGED_FILES,
  NO_TASKS,
  NOT_GIT_REPO,
  PREVENTED_EMPTY_COMMIT,
  RESTORE_STASH_EXAMPLE,
  SKIPPED_GIT_ERROR,
  skippingBackup,
  TASK_ERROR,
}
