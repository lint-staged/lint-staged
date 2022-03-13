import { createExecaReturnValue } from '../utils/createExecaReturnValue'

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

module.exports = execa
