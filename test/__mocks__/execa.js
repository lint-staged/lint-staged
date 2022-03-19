import { createExecaReturnValue } from '../utils/createExecaReturnValue'

export const execa = jest
  .fn()
  .mockName('execa')
  .mockReturnValue(
    createExecaReturnValue({
      stdout: 'a-ok',
      stderr: '',
      code: 0,
      cmd: 'mock cmd',
      failed: false,
      killed: false,
      signal: null,
    })
  )

export const execaCommand = execa.mockName('execaCommand')
