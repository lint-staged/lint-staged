import { createExecaReturnValue } from '../utils/createExecaReturnValue'

export const execa = jest.fn(() =>
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

export const execaCommand = execa
