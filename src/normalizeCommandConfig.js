'use strict'

/**
 * @param {String[]} pathsToLint
 * @param {*} command
 * @param {Boolean} [shouldBeProvidedPaths]
 * @returns {Array<{ title: String, task: String, shouldBeProvidedPaths: Boolean }>}
 */
module.exports = function normalizeCommandConfig(
  pathsToLint,
  command,
  shouldBeProvidedPaths = true
) {
  if (Array.isArray(command)) {
    return command.reduce(
      (commands, com) => [
        ...commands,
        ...normalizeCommandConfig(pathsToLint, com, shouldBeProvidedPaths)
      ],
      []
    )
  }

  if (command && command.task) {
    return [{ title: command.title || command.task, task: command.task, shouldBeProvidedPaths }]
  }

  if (typeof command === 'function') {
    const resolved = command(pathsToLint)
    return normalizeCommandConfig(pathsToLint, resolved, false)
  }

  return [{ title: command, task: command, shouldBeProvidedPaths }]
}
