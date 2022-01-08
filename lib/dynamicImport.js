import { pathToFileURL } from 'url'

export const dynamicImport = async (path) => (await import(pathToFileURL(path))).default
