#!/usr/bin/env node

'use strict'

const cmdline = require('commander')
const pkg = require('./package.json')

cmdline
  .version(pkg.version)
  .option('-c, --config [path]', 'Path to configuration file')
  .option('-v, --verbose', 'Run in verbose mode')
  .parse(process.argv)

require('./src')(console, cmdline.config, cmdline.verbose)
