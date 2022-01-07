import { pathToFileURL } from 'url'

export const dynamicImport = (path) => import(pathToFileURL(path)).then((module) => module.default)
