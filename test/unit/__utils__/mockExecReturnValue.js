import { ExecError } from '../../../lib/exec'

export const MOCK_DEFAULT_VALUE = {
  output: 'a-ok',
  process: {
    cmd: 'mock cmd',
    exitCode: 0,
    killed: false,
    signalCode: null,
  },
}

export const mockExecReturnValue = (value = MOCK_DEFAULT_VALUE, executionTime) => {
  const returnValue = { ...value }

  const mockFailed =
    returnValue.process.exitCode !== 0 ||
    returnValue.process.killed ||
    returnValue.process.signalCode != null

  let trigger
  let resolveTimeout

  const returnedPromise = executionTime
    ? new Promise((resolve, reject) => {
        trigger = mockFailed
          ? reject.bind(null, new ExecError(returnValue))
          : resolve.bind(null, returnValue)

        resolveTimeout = setTimeout(trigger, executionTime)
      })
    : mockFailed
      ? Promise.reject(new ExecError(returnValue))
      : Promise.resolve(returnValue)

  returnedPromise.process = returnValue.process

  returnedPromise.process.kill = () => {
    returnValue.process.killed = true
    clearTimeout(resolveTimeout)
    trigger?.()
  }

  return returnedPromise
}
