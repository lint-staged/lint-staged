'use strict'

const getInitialState = ({ quiet = false } = {}) => ({
  hasPartiallyStagedFiles: null,
  shouldBackup: null,
  matchedFileChunks: [],
  errors: new Set([]),
  output: [],
  quiet,
})

module.exports = {
  getInitialState,
}
