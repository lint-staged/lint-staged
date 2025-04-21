import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { jest } from '@jest/globals'

import { MOCK_DEFAULT_VALUE, mockExecReturnValue } from './mockExecReturnValue.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * @typedef {import('../../../lib/exec.js').ExecPromise} ExecPromise
 * @type {(mockReturnValue: typeof MOCK_DEFAULT_VALUE) => Promise<ExecPromise> & ExecPromise}
 */
export const getMockExec = async (mockReturnValue = MOCK_DEFAULT_VALUE) => {
  const pathToExec = path.resolve(__dirname, '../../../lib/exec.js')

  jest.unstable_mockModule(pathToExec, () => ({
    exec: jest.fn().mockImplementation(() => {
      return mockExecReturnValue(mockReturnValue)
    }),
  }))

  return import(pathToExec)
}
