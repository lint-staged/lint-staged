'use strict'

const sgf = require('staged-git-files')
const Listr = require('listr')
const has = require('lodash/has')
const pify = require('pify')
const runScript = require('./runScript')
const generateTasks = require('./generateTasks')
const resolveGitDir = require('./resolveGitDir')

/**
 * Executes all tasks and either resolves or rejects the promise
 * @param scripts
 * @param config {Object}
 * @returns {Promise}
 */
module.exports = function runAll(scripts, config) {
  // Config validation
  if (!config || !has(config, 'concurrent') || !has(config, 'renderer')) {
    throw new Error('Invalid config provided to runAll! Use getConfig instead.')
  }

  const gitDir = config.gitDir
  const concurrent = config.concurrent
  const renderer = config.renderer
  sgf.cwd = resolveGitDir(gitDir)

  return pify(sgf)('ACM').then(files => {
    /* files is an Object{ filename: String, status: String } */
    const filenames = files.map(file => file.filename)
    const tasks = generateTasks(config, filenames).map(task => ({
      title: `Running tasks for ${task.pattern}`,
      task: () =>
        new Listr(runScript(task.commands, task.fileList, scripts, config), {
          // In sub-tasks we don't want to run concurrently
          // and we want to abort on errors
          dateFormat: false,
          concurrent: false,
          exitOnError: true
        }),
      skip: () => {
        if (task.fileList.length === 0) {
          return `No staged files match ${task.pattern}`
        }
        return false
      }
    }))

    if (tasks.length) {
      return new Listr(tasks, {
        dateFormat: false,
        concurrent,
        renderer,
        exitOnError: !concurrent // Wait for all errors when running concurrently
      }).run()
    }
    return 'No tasks to run.'
  })
}
