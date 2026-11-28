export const Signal = {
  SIGINT: 'SIGINT',
  SIGKILL: 'SIGKILL',
}

/**
 * Get an AbortController used to cancel running tasks on failure/interruption.
 * @returns {AbortController & { dispose: () => void }}
 */
export const getAbortController = (nodeProcess = process) => {
  const abortController = new AbortController()

  const handleSigint = () => {
    abortController.abort(Signal.SIGINT)
  }

  nodeProcess.on(Signal.SIGINT, handleSigint)

  abortController.dispose = () => {
    nodeProcess.off(Signal.SIGINT, handleSigint)
  }

  return abortController
}
