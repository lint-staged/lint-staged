'use strict'

const git = require('./src/gitWorkflow')

console.log('Running lint-staged-pre')
git.gitStashSave()
