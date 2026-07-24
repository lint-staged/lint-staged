import { blue, dim, green, red, yellow } from './colors.js'

export const wip = () => blue('⋯')

export const done = () => green('✔')

export const info = () => blue('→')

export const error = () => red('✖')

export const warning = () => yellow('⚠')

export const cancelled = () => dim('↓')

export const parallelGroupStart = () => dim('┌')
export const parallelGroupMiddle = () => dim('│')
export const parallelGroupStop = () => dim('└')
