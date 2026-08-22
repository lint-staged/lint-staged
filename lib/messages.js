import { inspect } from 'node:util'

import { bold, red, yellow } from './colors.js'
import * as figures from './figures.js'

export const configurationError = (opt, helpMsg, value) =>
  `${red(`${figures.error()} Validation Error:`)}

  Invalid value for '${bold(opt)}': ${bold(inspect(value))}

  ${helpMsg}`

export const notGitRepo = () => red(`${figures.error()} Current directory is not a git directory!`)

export const failedGetStagedFiles = () => red(`${figures.error()} Failed to get staged files!`)

export const incorrectBraces = (before, after) =>
  yellow(
    `${figures.warning()} Detected incorrect braces with only single value: \`${before}\`. Reformatted as: \`${after}\`
`
  )

export const noConfiguration = () =>
  `${figures.error()} lint-staged could not find any valid configuration.`

export const noStagedFiles = () => `${figures.info()} lint-staged could not find any staged files.`

export const noTasks = () =>
  `${figures.info()} lint-staged could not find any staged files matching configured tasks.`

export const skippingBackup = (all, hasInitialCommit, diff) => {
  const reason =
    diff !== undefined
      ? '`--diff` was used'
      : (all
          ? '`--all` was used'
          : hasInitialCommit
            ? '`--no-stash` was used'
            : 'there’s no initial commit yet') + '. This might result in data loss'

  return yellow(`${figures.warning()} Skipping backup because ${reason}.\n`)
}

export const skippingHidePartiallyChanged = () =>
  yellow(
    `${figures.warning()} Skipping hiding unstaged changes from partially staged files because \`--no-hide-partially-staged\` was used.\n`
  )

export const deprecatedGitAdd = () =>
  yellow(
    `${figures.warning()} Some of your tasks use \`git add\` command. Please remove it from the config since all modifications made by tasks will be automatically added to the git commit index.
`
  )

export const taskError = () => 'Skipped because of errors from tasks.'

export const preventedTaskModifications = () =>
  `\n${figures.error()} lint-staged failed because \`--fail-on-changes\` was used.`

export const gitError = () =>
  `\n  ${red(`${figures.error()} lint-staged failed due to a git error.`)}`

export const invalidOption = (
  name,
  value,
  message
) => `${red(`${figures.error()} Validation Error:`)}

  Invalid value for option '${bold(name)}': ${bold(value)}

  ${message}

See https://github.com/lint-staged/lint-staged#command-line-flags`

export const preventedEmptyCommit = () => `
  ${yellow(`${figures.warning()} lint-staged prevented an empty git commit.
  Use the --allow-empty option to continue, or check your task configuration`)}
`

export const restoreStashExample = (
  hash = '<git-hash>'
) => `Any lost modifications can be restored from a git stash:

  > git stash list --format="%h %s"
  ${hash} On main: lint-staged automatic backup
  > git apply --index ${hash}
`

export const failedToLoadConfig = (filepath) =>
  red(`${figures.error()} Failed to read config from file "${filepath}".`)

export const failedToParseConfig = (
  filepath,
  error
) => `${red(`${figures.error()} Failed to parse config from file "${filepath}".`)}

${error}

See https://github.com/lint-staged/lint-staged#configuration.`

export const unstagedChangesBackupStashLocation = () =>
  'Unstaged changes have been kept back in a patch file:'

export const minGitVersionRequired = (expected) =>
  red(`${figures.error()} lint-staged requires at least Git version ${bold(expected)}.

Please update Git: https://git-scm.com/downloads`)
