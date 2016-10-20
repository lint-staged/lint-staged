#!/usr/bin/env node
const git = require('./src/gitWorkflow')

console.log('Running lint-staged-pre')
git.gitStashSave()
