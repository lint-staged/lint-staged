#!/usr/bin/env node

'use strict'

// Force colors for packages that depend on https://www.npmjs.com/package/supports-color
const { supportsColor } = require('chalk')
if (supportsColor) {
  process.env.FORCE_COLOR = supportsColor.level.toString()
}

// Do not terminate main Listr process on SIGINT
process.on('SIGINT', () => {})

const pkg = require('../package.json')
require('please-upgrade-node')(
  Object.assign({}, pkg, {
    engines: {
      node: '>=10.13.0' // First LTS release of 'Dubnium'
    }
  })
)

const cmdline = require('commander')
const debugLib = require('debug')
const lintStaged = require('../lib')

const debug = debugLib('lint-staged:bin')

cmdline
  .version(pkg.version)
  .option('--allow-empty', 'allow empty commits when tasks revert all staged changes', false)
  .option('-c, --config [path]', 'path to configuration file')
  .option('-d, --debug', 'print additional debug information', false)
  .option(
    '-p, --concurrent <parallel tasks>',
    'the number of tasks to run concurrently, or false to run tasks serially',
    true
  )
  .option('-q, --quiet', 'disable lint-staged’s own console output', false)
  .option('-r, --relative', 'pass relative filepaths to tasks', false)
  .option('-x, --shell', 'skip parsing of tasks for better shell support', false)
  .parse(process.argv)

if (cmdline.debug) {
  debugLib.enable('lint-staged*')
}

debug('Running `lint-staged@%s`', pkg.version)

/**
 * Get the maximum length of a command-line argument string based on current platform
 *
 * https://serverfault.com/questions/69430/what-is-the-maximum-length-of-a-command-line-in-mac-os-x
 * https://support.microsoft.com/en-us/help/830473/command-prompt-cmd-exe-command-line-string-limitation
 * https://unix.stackexchange.com/a/120652
 */
const getMaxArgLength = () => {
  switch (process.platform) {
    case 'darwin':
      return 262144
    case 'win32':
      return 8191
    default:
      return 131072
  }
}

const options = {
  allowEmpty: !!cmdline.allowEmpty,
  concurrent: cmdline.concurrent,
  configPath: cmdline.config,
  debug: !!cmdline.debug,
  maxArgLength: getMaxArgLength() / 2,
  quiet: !!cmdline.quiet,
  relative: !!cmdline.relative,
  shell: !!cmdline.shell
}

debug('Options parsed from command-line:', options)

lintStaged(options)
  .then(passed => {
    process.exitCode = passed ? 0 : 1
  })
  .catch(() => {
    process.exitCode = 1
  })
