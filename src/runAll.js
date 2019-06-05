'use strict'

const sgf = require('staged-git-files')
const Listr = require('listr')
const has = require('lodash/has')
const pify = require('pify')
const makeCmdTasks = require('./makeCmdTasks')
const generateTasks = require('./generateTasks')
const resolveGitDir = require('./resolveGitDir')
const git = require('./gitWorkflow')

const debug = require('debug')('lint-staged:run')

/**
 * Executes all tasks and either resolves or rejects the promise
 * @param config {Object}
 * @returns {Promise}
 */
module.exports = function runAll(config) {
  debug('Running all linter scripts')
  // Config validation
  if (!config || !has(config, 'concurrent') || !has(config, 'renderer')) {
    throw new Error('Invalid config provided to runAll! Use getConfig instead.')
  }

  const { concurrent, renderer, chunkSize, subTaskConcurrency } = config
  const gitDir = resolveGitDir()
  debug('Resolved git directory to be `%s`', gitDir)

  sgf.cwd = gitDir
  return pify(sgf)('ACM').then(files => {
    /* files is an Object{ filename: String, status: String } */
    const filenames = files.map(file => file.filename)
    debug('Loaded list of staged files in git:\n%O', filenames)

    const tasks = generateTasks(config, filenames).map(task => ({
      title: `Running tasks for ${task.pattern}`,
      task: () =>
        new Listr(
          makeCmdTasks(task.commands, task.fileList, {
            chunkSize,
            subTaskConcurrency
          }),
          {
            // In sub-tasks we don't want to run concurrently
            // and we want to abort on errors
            dateFormat: false,
            concurrent: false,
            exitOnError: true
          }
        ),
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

    // If all of the configured "linters" should be skipped
    // avoid executing any lint-staged logic
    if (tasks.every(task => task.skip())) {
      console.log('No staged files match any of provided globs.')
      return 'No tasks to run.'
    }

    // Do not terminate main Listr process on SIGINT
    process.on('SIGINT', () => {})

    return new Listr(
      [
        {
          title: 'Stashing changes...',
          skip: async () => {
            const hasPSF = await git.hasPartiallyStagedFiles()
            if (!hasPSF) {
              return 'No partially staged files found...'
            }
            return false
          },
          task: ctx => {
            ctx.hasStash = true
            return git.gitStashSave()
          }
        },
        {
          title: 'Running linters...',
          task: () =>
            new Listr(tasks, {
              ...listrBaseOptions,
              concurrent,
              exitOnError: !concurrent // Wait for all errors when running concurrently
            })
        },
        {
          title: 'Updating stash...',
          enabled: ctx => ctx.hasStash,
          skip: ctx => ctx.hasErrors && 'Skipping stash update since some tasks exited with errors',
          task: () => git.updateStash()
        },
        {
          title: 'Restoring local changes...',
          enabled: ctx => ctx.hasStash,
          task: () => git.gitStashPop()
        }
      ],
      listrBaseOptions
    ).run()
  })
}
