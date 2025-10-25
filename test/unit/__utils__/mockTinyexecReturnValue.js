const MOCK_DEFAULT_VALUE = {
  stdout: 'a-ok',
  stderr: '',
  pid: 0,
  cmd: 'mock cmd',
}

export const mockTinyexecReturnValue = (value = MOCK_DEFAULT_VALUE, executionTime) => {
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

  returnedPromise.kill = () => {
    clearTimeout(resolveTimeout)
    triggerResult?.()
  }

  return returnedPromise
}
