/* eslint-disable no-useless-escape */

const { escapeArg, escape, escapeUnixShellArg, escapeWinCmdArg } = jest.requireActual(
  '../lib/escape'
)

const TEST_STRING = 'file.js'
const UNIX_ESCAPED = escapeUnixShellArg(TEST_STRING)
const WINCMD_ESCAPED = escapeWinCmdArg(TEST_STRING)

describe('escape', () => {
  it('should use current platform by default', () => {
    const isWin = process.platform === 'win32'
    expect(escape(TEST_STRING)).toEqual(isWin ? WINCMD_ESCAPED : UNIX_ESCAPED)
  })

  test.each([
    ['darwin', UNIX_ESCAPED],
    ['linux', UNIX_ESCAPED],
    ['win32', WINCMD_ESCAPED],
    ['cygwin', UNIX_ESCAPED],
  ])('should export platform-specific method for `%s`', async (platform, escaped) => {
    expect(escapeArg(TEST_STRING, platform)).toEqual(escaped)
  })
})

/**
 * Tricky things to escape
 * @see https://qntm.org/cmd
 */
const TEST_STRINGS = `yes
no
child.exe
argument 1
Hello, world
Hello"world
\some\path with\spaces
C:\Program Files\
she said, "you had me at hello"
arg;,ument"2
\some\directory with\spaces\
"
\
\\
\\\
\\\\
\\\\\
"\
"\T
"\\T
!1
!A
"!\/'"
"Jeff's!"
$PATH
%PATH%
&
<>|&^
()%!^"<>&|
>\\.\nul
malicious argument"&whoami
*@$$A$@#?-_`.split('\n')

describe('escapeUnixShellArg', () => {
  test.each(TEST_STRINGS.map((string) => [string]))('handles `%s`', (string) => {
    expect(escapeUnixShellArg(string)).toMatchSnapshot()
  })
})

describe('escapeWinCmdArg', () => {
  test.each(TEST_STRINGS.map((string) => [string]))('handles `%s`', (string) => {
    expect(escapeWinCmdArg(string)).toMatchSnapshot()
  })
})
