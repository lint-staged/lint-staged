#!/usr/bin/env node

'use strict'

const pkg = require('./package.json')
require('please-upgrade-node')(
  Object.assign({}, pkg, {
    engines: {
      node: '>=8.6.0'
    }
  })
)

const cmdline = require('commander')
const debugLib = require('debug')

const debug = debugLib('lint-staged:bin')

cmdline
  .version(pkg.version)
  .option('-c, --config [path]', 'Path to configuration file')
  .option('-x, --shell', 'Use execa’s shell mode to execute linter commands')
  .option('-q, --quiet', 'Use Listr’s silent renderer')
  .option('-d, --debug', 'Enable debug mode')
  .parse(process.argv)

if (cmdline.debug) {
  debugLib.enable('lint-staged*')
}

debug('Running `lint-staged@%s`', pkg.version)

require('./src')(console, cmdline.config, !!cmdline.shell, !!cmdline.quiet, !!cmdline.debug)
