import { unsafeShellWarning } from '../lib/messages'

test('unsafeShellWarning', () => {
  expect(unsafeShellWarning('linux')).toMatchInlineSnapshot(`
    "‼ Using the shell option is unsafe and might lead to command injection!
      This option will be replaced by the \`--unsafe-shell\` option in the next major version.
      Use the \`--unsafe-shell-disable-warnings\` option to disable this warning."
  `)

  expect(unsafeShellWarning('win32')).toMatchInlineSnapshot(`
    "‼ Using the shell option is unsafe and might lead to command injection!
      This option will be replaced by the \`--unsafe-shell\` option in the next major version.
      Use the \`--unsafe-shell-disable-warnings\` option to disable this warning.
    ‼ Filenames are not escaped on Windows! Do not use the \`--shell\` option unless you understand the risks!"
  `)
})
