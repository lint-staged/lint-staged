#!/usr/bin/env node
const git = require('./src/gitWorkflow')

console.log('Running lint-staged-post')
git.gitStashPop()
