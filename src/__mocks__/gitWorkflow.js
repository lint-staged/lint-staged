'use strict'

const hasPartiallyStagedFiles = jest.fn().mockImplementation(() => Promise.resolve(true))
const gitStashSave = jest.fn().mockImplementation(() => Promise.resolve(null))
const gitStashPop = jest.fn().mockImplementation(() => Promise.resolve(null))
const updateStash = jest.fn().mockImplementation(() => Promise.resolve(null))

module.exports = {
  gitStashSave,
  gitStashPop,
  updateStash,
  hasPartiallyStagedFiles
}
