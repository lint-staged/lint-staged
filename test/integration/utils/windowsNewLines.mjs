/** Replace Windows `\r\n` newlines with `\n` */
export const normalizeWindowsNewlines = (input) => input.replace(/(\r\n|\r|\n)/gm, '\n')
