const backupOriginalState = jest.fn().mockImplementation(() => Promise.resolve(null))
const applyModifications = jest.fn().mockImplementation(() => Promise.resolve(null))
const restoreOriginalState = jest.fn().mockImplementation(() => Promise.resolve(null))
const dropBackupStashes = jest.fn().mockImplementation(() => Promise.resolve(null))

module.exports = {
  backupOriginalState,
  applyModifications,
  restoreOriginalState,
  dropBackupStashes
}
