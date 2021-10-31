export const isWindowsActions = () => {
  const { GITHUB_ACTIONS, RUNNER_OS } = process.env
  return GITHUB_ACTIONS === 'true' && RUNNER_OS === 'Windows'
}
