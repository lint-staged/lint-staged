/** @typedef {import('./index').Logger} Logger */

import { basename, join } from 'path'

import normalize from 'normalize-path'

import { execGit } from './execGit.js'
import { loadConfig, searchPlaces } from './loadConfig.js'
import { parseGitZOutput } from './parseGitZOutput.js'
import { validateConfig } from './validateConfig.js'

const EXEC_GIT = ['ls-files', '-z', '--full-name']

const filterPossibleConfigFiles = (file) => searchPlaces.includes(basename(file))

const numberOfLevels = (file) => file.split('/').length

const sortDeepestParth = (a, b) => (numberOfLevels(a) > numberOfLevels(b) ? -1 : 1)

/**
 * Search all config files from the git repository
 *
 * @param {string} gitDir
 * @param {Logger} logger
 * @returns {Promise<{ [key: string]: * }>} found configs with filepath as key, and config as value
 */
export const searchConfigs = async (gitDir = process.cwd(), logger) => {
  /** Get all possible config files known to git */
  const cachedFiles = parseGitZOutput(await execGit(EXEC_GIT, { cwd: gitDir })).filter(
    filterPossibleConfigFiles
  )

  /** Get all possible config files from uncommitted files */
  const otherFiles = parseGitZOutput(
    await execGit([...EXEC_GIT, '--others', '--exclude-standard'], { cwd: gitDir })
  ).filter(filterPossibleConfigFiles)

  /** Sort possible config files so that deepest is first */
  const possibleConfigFiles = [...cachedFiles, ...otherFiles]
    .map((file) => join(gitDir, file))
    .map((file) => normalize(file))
    .sort(sortDeepestParth)

  /** Create object with key as config file, and value as null */
  const configs = possibleConfigFiles.reduce(
    (acc, configPath) => Object.assign(acc, { [configPath]: null }),
    {}
  )

  /** Load and validate all configs to the above object */
  await Promise.all(
    possibleConfigFiles
      .map((configPath) => loadConfig({ configPath }, logger))
      .map((promise) =>
        promise.then(({ config, filepath }) => {
          if (config) {
            configs[filepath] = validateConfig(config, filepath, logger)
          }
        })
      )
  )

  /** Get validated configs from the above object, without any `null` values (not found) */
  const foundConfigs = Object.entries(configs)
    .filter(([, value]) => !!value)
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})

  return foundConfigs
}
