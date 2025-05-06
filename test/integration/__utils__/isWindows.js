import os from 'os'

export const isWindows = os.platform() === 'win32'

/** Whether the current environment is a GitHub Actions runner under Windows */
export const isWindowsActions = () => {
  const { GITHUB_ACTIONS, RUNNER_OS } = process.env
  return GITHUB_ACTIONS === 'true' && RUNNER_OS === 'Windows'
}
