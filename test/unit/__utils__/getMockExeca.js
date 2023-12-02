import { jest } from '@jest/globals'

import { mockExecaReturnValue } from './mockExecaReturnValue.js'

export const getMockExeca = async (mockReturnValue = {}) => {
  jest.unstable_mockModule('execa', () => {
    const execa = jest.fn().mockImplementation(() => mockExecaReturnValue(mockReturnValue))
    return { execa, execaCommand: execa }
  })

  return import('execa')
}
