/**
 * Get an AbortController used to cancel running tasks on failure/interruption.
 * @returns AbortController
 */
export const getAbortController = (nodeProcess = process) => {
  const abortController = new AbortController()

  nodeProcess.on('SIGINT', () => {
    abortController.abort('SIGINT')
  })

  return abortController
}
