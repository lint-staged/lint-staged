const hasPartiallyStagedFiles = jest.fn().mockImplementation(() => Promise.resolve(false))
const gitStashSave = jest.fn().mockImplementation(() => Promise.resolve(null))
const gitStashPop = jest.fn().mockImplementation(() => Promise.resolve(null))
const updateStash = jest.fn().mockImplementation(() => Promise.resolve(null))

module.exports = {
  gitStashSave,
  gitStashPop,
  updateStash,
  hasPartiallyStagedFiles
}
