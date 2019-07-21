const stashBackup = jest.fn().mockImplementation(() => Promise.resolve(null))
const restoreUnstagedChanges = jest.fn().mockImplementation(() => Promise.resolve(null))
const restoreOriginalState = jest.fn().mockImplementation(() => Promise.resolve(null))
const dropBackup = jest.fn().mockImplementation(() => Promise.resolve(null))

module.exports = {
  stashBackup,
  restoreUnstagedChanges,
  restoreOriginalState,
  dropBackup
}
