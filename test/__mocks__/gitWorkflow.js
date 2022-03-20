import { jest } from '@jest/globals'

const stub = {
  prepare: jest.fn().mockImplementation(() => Promise.resolve()),
  hideUnstagedChanges: jest.fn().mockImplementation(() => Promise.resolve()),
  applyModifications: jest.fn().mockImplementation(() => Promise.resolve()),
  restoreUnstagedChanges: jest.fn().mockImplementation(() => Promise.resolve()),
  restoreOriginalState: jest.fn().mockImplementation(() => Promise.resolve()),
  cleanup: jest.fn().mockImplementation(() => Promise.resolve()),
}

export default () => stub
