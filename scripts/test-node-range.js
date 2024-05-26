import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import chalk from 'chalk'
import { execa } from 'execa'
import { subset } from 'semver'

const packageJson = JSON.parse(
  await readFile(fileURLToPath(new URL('../package.json', import.meta.url)))
)

const lintStagedRequires = packageJson.engines.node

console.log(`Currently required Node.js version: ${lintStagedRequires}`)

console.log(chalk.dim('-----------------------------'))
console.log(chalk.dim('Testing current dependencies:'))
console.log(chalk.dim('-----------------------------'))

let allDependenciesSupported = true

for (const dependency of Object.keys(packageJson.dependencies)) {
  const { stdout: dependencyRequires } = await execa('npm', ['info', dependency, 'engines.node'])

  /** True if currently-required range is inside the dependency's required range */
  const isSubset = subset(lintStagedRequires, dependencyRequires)

  if (!isSubset) {
    allDependenciesSupported = false
  }

  const color = isSubset ? chalk.greenBright : chalk.redBright
  const symbol = isSubset ? `✓` : '×'

  console.log(`${color(`${symbol} ${dependency}`)}:`, dependencyRequires)
}

if (!allDependenciesSupported) {
  process.exit(1)
}
