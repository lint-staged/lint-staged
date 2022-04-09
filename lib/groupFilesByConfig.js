import path from 'path'

import debug from 'debug'

import { ConfigObjectSymbol } from './searchConfigs.js'

const debugLog = debug('lint-staged:groupFilesByConfig')

export const groupFilesByConfig = async ({ configs, files }) => {
  debugLog('Grouping %d files by %d configurations', files.length, Object.keys(configs).length)

  const filesSet = new Set(files)
  const filesByConfig = {}

  /** Configs are sorted deepest first by `searchConfigs` */
  for (const filepath of Reflect.ownKeys(configs)) {
    const config = configs[filepath]

    /** When passed an explicit config object via the Node.js API, skip logic */
    if (filepath === ConfigObjectSymbol) {
      filesByConfig[filepath] = { config, files }
      break
    }

    const dir = path.normalize(path.dirname(filepath))

    /** Check if file is inside directory of the configuration file */
    const isInsideDir = (file) => {
      const relative = path.relative(dir, file)
      return relative && !relative.startsWith('..') && !path.isAbsolute(relative)
    }

    const scopedFiles = new Set()

    /**
     * If file is inside the config file's directory, assign it to that configuration
     * and remove it from the set. This means only one configuration can match a file.
     */
    filesSet.forEach((file) => {
      if (isInsideDir(file)) {
        scopedFiles.add(file)
      }
    })

    scopedFiles.forEach((file) => {
      filesSet.delete(file)
    })

    filesByConfig[filepath] = { config, files: Array.from(scopedFiles) }
  }

  return filesByConfig
}
