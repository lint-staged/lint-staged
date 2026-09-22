/**
 * Get the maximum length of a command-line argument string based on current platform
 *
 * https://serverfault.com/questions/69430/what-is-the-maximum-length-of-a-command-line-in-mac-os-x
 * https://support.microsoft.com/en-us/help/830473/command-prompt-cmd-exe-command-line-string-limitation
 * https://unix.stackexchange.com/a/120652
 */
export const getMaxArgLength = (platform = process.platform) => {
  switch (platform) {
    case 'darwin':
      return 262_144
    case 'win32':
      return 8_191
    default:
      return 131_072
  }
}
