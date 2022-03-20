import { jest } from '@jest/globals'

import { createExecaReturnValue } from '../utils/createExecaReturnValue.js'

const execa = jest.fn(() =>
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

execa.command = execa

export default execa
