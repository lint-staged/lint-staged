'use strict'

/**
 * @param {string} pattern
 * @param {*} commands
 * @returns {{ title: string, commands: * }}
 */
module.exports = function normalizeTasksConfig(pattern, commands) {
  const defaultTitle = `Running tasks for ${pattern}`

  if (commands && commands.tasks) {
    return { title: commands.title || defaultTitle, commands: commands.tasks }
  }

  return { title: defaultTitle, commands }
}
