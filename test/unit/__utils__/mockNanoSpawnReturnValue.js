const MOCK_DEFAULT_VALUE = {
  output: 'a-ok',
  nodeChildProcess: { pid: 0 },
  cmd: 'mock cmd',
}

export const mockNanoSpawnReturnValue = (value = MOCK_DEFAULT_VALUE, executionTime) => {
  let triggerResult
  let resolveTimeout

  const isFailed = value instanceof Error

  const returnedPromise = executionTime
    ? new Promise((resolve, reject) => {
        triggerResult = isFailed ? reject.bind(null, value) : resolve.bind(null, value)
        resolveTimeout = setTimeout(triggerResult, executionTime)
      })
    : isFailed
      ? Promise.reject(value)
      : Promise.resolve(value)

  returnedPromise.nodeChildProcess = value.nodeChildProcess

  returnedPromise.nodeChildProcess.kill = () => {
    clearTimeout(resolveTimeout)
    triggerResult?.()
  }

  return returnedPromise
}
