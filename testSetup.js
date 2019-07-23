'use strict'

// Overwrite TTY mode to always render without ansi codes
process.stdout.isTTY = false

// Increase timeout for slow CI runners
jest.setTimeout(10000)
