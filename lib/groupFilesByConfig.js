import path from 'node:path'

import { createDebug } from './debug.js'

const debugLog = createDebug('lint-staged:groupFilesByConfig')

/**
 * @typedef {import('./getStagedFiles.js').StagedFile} StagedFile
 * @typedef {import('./config.js').Configuration} Configuration
 * @typedef {Record<string, { config: Configuration; files: StagedFile[] }>} FilesByConfig
 *
 * @param {object} params
 * @param {Record<string, Configuration>} params.configs
 * @param {StagedFile[]} params.files
 * @param {boolean} [params.singleConfigMode]
 * @returns {Promise<FilesByConfig>}
 */
export const groupFilesByConfig = async ({ configs, files, singleConfigMode }) => {
  debugLog('Grouping %d files by %d configurations', files.length, Object.keys(configs).length)

  /** @type {FilesByConfig} */
  const filesByConfig = {}

  const configEntries = Object.entries(configs)

  if (singleConfigMode) {
    const firstEntry = configEntries[0]
    if (firstEntry) {
      const [filepath, config] = firstEntry
      filesByConfig[filepath] = { config, files }
    }
    return filesByConfig
  }

  /** @type {Map<string, number>} */
  const configIndexByDirectory = new Map()
  let firstParentGlobConfigIndex = Infinity

  // Configs are ordered deepest first, so lower index is deeper and gets the files.
  for (const [configIndex, [filepath, config]] of configEntries.entries()) {
    filesByConfig[filepath] = { config, files: [] }

    const directory = path.dirname(filepath)
    if (!configIndexByDirectory.has(directory)) {
      configIndexByDirectory.set(directory, configIndex)
    }

    // A parent glob claims all files not already assigned to an earlier config.
    if (
      firstParentGlobConfigIndex === Infinity &&
      Object.keys(config).some((glob) => glob.startsWith('..'))
    ) {
      firstParentGlobConfigIndex = configIndex
    }
  }

  /** @type {Map<string, number>} */
  const containingConfigIndexCache = new Map()

  /**
   * @param {string} directory
   * @returns {number}
   */
  const findContainingConfigIndex = (directory) => {
    const cachedIndex = containingConfigIndexCache.get(directory)
    if (cachedIndex !== undefined) return cachedIndex

    let configIndex = configIndexByDirectory.get(directory) ?? Infinity
    const parentDirectory = path.dirname(directory)
    if (parentDirectory !== directory) {
      configIndex = Math.min(configIndex, findContainingConfigIndex(parentDirectory))
    }

    containingConfigIndexCache.set(directory, configIndex)
    return configIndex
  }

  // Deduplicate by object identity, preserving input order.
  for (const file of new Set(files)) {
    const containingConfigIndex = findContainingConfigIndex(path.dirname(file.filepath))

    const configIndex = Math.min(containingConfigIndex, firstParentGlobConfigIndex)

    if (configIndex !== Infinity) {
      const [configPath] = configEntries[configIndex]
      filesByConfig[configPath].files.push(file)
    }
  }

  return filesByConfig
}
