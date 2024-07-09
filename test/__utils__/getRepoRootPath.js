import path from 'node:path'
import { fileURLToPath } from 'node:url'

const THIS_FILE_DIR = path.dirname(fileURLToPath(import.meta.url))

/** @returns the path to the `lint-staged` repo root */
export const getRepoRootPath = () => path.join(THIS_FILE_DIR, '../../')
