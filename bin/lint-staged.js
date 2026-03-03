#!/usr/bin/env node

import { userInfo } from 'node:os'

import { getVersionNumber, parseCliOptions, printHelpText } from '../lib/cli.js'
import { createDebug, enableDebug } from '../lib/debug.js'
import lintStaged from '../lib/index.js'
import { CONFIG_STDIN_ERROR } from '../lib/messages.js'
import { readStdin } from '../lib/readStdin.js'

const debugLog = createDebug('lint-staged:bin')

// Do not terminate main Listr process on SIGINT
process.on('SIGINT', () => {})

const cliOptions = parseCliOptions(process.argv)

if (cliOptions.version) {
  console.log(await getVersionNumber())
  process.exit(0)
}

if (cliOptions.help) {
  console.log(await printHelpText())
  process.exit(0)
}

if (cliOptions.debug) {
  enableDebug()
}

try {
  const { shell } = userInfo()
  debugLog('Using shell: %s', shell)
} catch {
  debugLog('Could not determine current shell')
}

debugLog('Options parsed from command-line: %o', cliOptions)

if (cliOptions.configPath === '-') {
  delete cliOptions.configPath
  try {
    debugLog('Reading config from stdin')
    cliOptions.config = JSON.parse(await readStdin())
  } catch (error) {
    debugLog(CONFIG_STDIN_ERROR, error)
    console.error(CONFIG_STDIN_ERROR)
    process.exit(1)
  }
}

const passed = await lintStaged(cliOptions)
if (!passed) {
  process.exitCode = 1
}
