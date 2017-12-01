#!/usr/bin/env node

'use strict'

const cmdline = require('commander')
const debugLib = require('debug')
const pkg = require('./package.json')

const debug = debugLib('lint-staged:bin')

cmdline
  .version(pkg.version)
  .option('-c, --config [path]', 'Path to configuration file')
  .option('-d, --debug', 'Enable debug mode')
  .parse(process.argv)

if (cmdline.debug) {
  debugLib.enable('lint-staged*')
}

debug('Running `lint-staged@%s`', pkg.version)

require('./src')(console, cmdline.config, cmdline.debug)
