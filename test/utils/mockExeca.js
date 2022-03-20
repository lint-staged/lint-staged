import { jest } from '@jest/globals'

import { createExecaReturnValue } from './createExecaReturnValue.js'

export const mockExeca = async () => {
  jest.unstable_mockModule('execa', () => {
    const execa = jest.fn().mockImplementation(() => createExecaReturnValue({}))
    return { execa, execaCommand: execa }
  })

  return import('execa')
}
