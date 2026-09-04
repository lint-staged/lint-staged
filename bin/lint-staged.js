#!/usr/bin/env node

import { userInfo } from 'node:os'

import { getVersionNumber, parseCliOptions, printHelpText } from '../lib/cli.js'
import { enableColors, supportsColors } from '../lib/colors.js'
import { createDebug, enableDebug } from '../lib/debug.js'
import lintStaged from '../lib/index.js'
import { readStdin } from '../lib/readStdin.js'

enableColors(supportsColors())
const debugLog = createDebug('lint-staged:bin')

// SIGINT handled by an AbortController
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
    console.error('Failed to read config from stdin!')
    throw error
  }
}

const passed = await lintStaged(cliOptions)
if (!passed) {
  process.exitCode = 1
}
