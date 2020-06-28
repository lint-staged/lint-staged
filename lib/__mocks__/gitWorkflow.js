/* eslint-disable no-undef */
const GitWorkflow = jest.requireActual('../gitWorkflow')

class GitWorkflowStub extends GitWorkflow {
  constructor(...args) {
    super(args)
  }
  init() {
    return Promise.resolve({ baseDir: '.', shouldBackup: true })
  }
  prepare() {
    return Promise.resolve()
  }
  hideUnstagedChanges() {
    return Promise.resolve()
  }
  applyModifications() {
    return Promise.resolve()
  }
  restoreUnstagedChanges() {
    return Promise.resolve()
  }
  restoreOriginalState() {
    return Promise.resolve()
  }
  hasPartiallyStagedFiles() {
    return Promise.resolve()
  }
  cleanup() {
    return Promise.resolve()
  }
  finalize() {
    return Promise.resolve()
  }
}

module.exports = GitWorkflowStub
