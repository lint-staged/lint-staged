export const createExecaReturnValue = (value, executionTime) => {
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
