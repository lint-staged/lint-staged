/* global process */
/* eslint no-console: 0 */

'use strict'

const sgf = require('staged-git-files')
const Listr = require('listr')
const stringifyObject = require('stringify-object')
const getConfig = require('./getConfig')
const runScript = require('./runScript')
const generateTasks = require('./generateTasks')
const resolveGitDir = require('./resolveGitDir')

module.exports = function runAll(packageJson, originalConfig) {
  const config = getConfig(originalConfig)
  const { gitDir, verbose, concurrent, renderer } = config
  sgf.cwd = resolveGitDir(gitDir)

  if (verbose) {
    console.log(`
Running lint-staged with the following config:
${stringifyObject(config)}

`)
  }

  return new Promise((resolve, reject) => {
    sgf('ACM', (err, files) => {
      if (err) {
        console.error(err)
      }

      /* files is an Object{ filename: String, status: String } */
      const filenames = files.map(file => file.filename)
      const tasks = generateTasks(config, filenames).map(task => ({
        title: `Running tasks for ${task.pattern}`,
        task: () =>
          new Listr(runScript(task.commands, task.fileList, packageJson, config), {
            // In sub-tasks we don't want to run concurrently
            // and we want to abort on errors
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
        new Listr(
          tasks,
          Object.assign({}, config, {
            concurrent,
            renderer,
            exitOnError: !concurrent // Wait for all errors when running concurrently
          })
        )
          .run()
          .then(() => {
            resolve()
          })
          .catch(error => {
            if (Array.isArray(error.errors)) {
              error.errors.forEach(lintError => {
                console.error(lintError.message)
              })
            } else {
              console.log(error.message)
            }
            process.exit(1)
            reject()
          })
      }
    })
  })
}
