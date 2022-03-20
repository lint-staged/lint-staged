import { jest } from '@jest/globals'

const actual = jest.requireActual('lilconfig')

export const lilconfig = jest.fn((name, options) => actual.lilconfig(name, options))
