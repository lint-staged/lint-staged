import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import chalk from 'chalk'

import { exec } from '../lib/exec.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const importJson = async (path) => JSON.parse(await readFile(pathToFileURL(join(__dirname, path))))

const { dependencies } = await importJson('../package.json')

console.log(chalk.dim('Listing required Node.js versions for dependencies:'))
console.log(chalk.dim('---------------------------------------------------'))

for (const dependency of Object.keys(dependencies)) {
  const output = await exec('npm', ['info', dependency, 'engines.node'], {
    cwd: __dirname,
  })

  console.log(`${chalk.greenBright(dependency)}:`, output || chalk.dim('-'))
}
