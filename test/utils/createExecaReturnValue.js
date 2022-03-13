export function createExecaReturnValue(value, executionTime) {
  const returnValue = { ...value }
  const returnedPromise = executionTime
    ? new Promise((resolve) => setTimeout(() => resolve(returnValue), executionTime))
    : Promise.resolve(returnValue)

  returnedPromise.kill = () => {
    returnValue.killed = true
  }

  return returnedPromise
}
