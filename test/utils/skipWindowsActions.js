export const itSkipOnWindowsActions = (...args) => {
  const { GITHUB_ACTIONS, RUNNER_OS } = process.env
  const isWindowsActions = GITHUB_ACTIONS === 'true' && RUNNER_OS === 'Windows'
  return isWindowsActions ? it.skip(...args) : it(...args)
}
