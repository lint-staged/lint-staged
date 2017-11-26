#!/usr/bin/env node

'use strict'

const cmdline = require('commander')
const pkg = require('./package.json')

const debug = require('debug')('lint-staged:bin')

cmdline
  .version(pkg.version)
  .option('-c, --config [path]', 'Path to configuration file')
  .parse(process.argv)

debug('Running `lint-staged@%s`', pkg.version)

require('./src')(console, cmdline.config)
