'use strict'

const sgf = require('staged-git-files')
const Listr = require('listr')
const has = require('lodash/has')
const pify = require('pify')
const runScript = require('./runScript')
const generateTasks = require('./generateTasks')
const resolveGitDir = require('./resolveGitDir')
const git = require('./gitWorkflow')

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

  const concurrent = config.concurrent
  const renderer = config.renderer
  sgf.cwd = resolveGitDir()

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

    const listrBaseOptions = {
      dateFormat: false,
      renderer
    }

    if (tasks.length) {
      return new Listr(
        [
          {
            title: 'Stashing changes...',
            task: (ctx, task) =>
              git.hasUnstagedFiles().then(res => {
                ctx.hasStash = res
                if (res) {
                  // TODO: Handle Ctrl+C before stashing
                  return git.gitStashSave()
                }
                return task.skip('No unstaged files found...')
              })
          },
          {
            title: 'Running linters...',
            task: () =>
              new Listr(
                tasks,
                Object.assign({}, listrBaseOptions, {
                  concurrent,
                  exitOnError: !concurrent // Wait for all errors when running concurrently
                })
              )
          },
          {
            title: 'Restoring local changes...',
            enabled: ctx => ctx.hasStash,
            task: () => git.gitStashPop()
          }
        ],
        listrBaseOptions
      ).run()
    }
    return 'No tasks to run.'
  })
}
