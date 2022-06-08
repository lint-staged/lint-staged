const MOCK_DEFAULT_VALUE = {
  stdout: 'a-ok',
  stderr: '',
  code: 0,
  cmd: 'mock cmd',
  failed: false,
  killed: false,
  signal: null,
}

export const mockExecaReturnValue = (value = MOCK_DEFAULT_VALUE, executionTime) => {
  const returnValue = { ...value }
  let triggerResolve
  let resolveTimeout

  const returnedPromise = executionTime
    ? new Promise((resolve) => {
        triggerResolve = resolve.bind(null, returnValue)
        resolveTimeout = setTimeout(triggerResolve, executionTime)
      })
    : Promise.resolve(returnValue)

  returnedPromise.kill = () => {
    returnValue.killed = true
    clearTimeout(resolveTimeout)
    triggerResolve()
  }

  return returnedPromise
}
