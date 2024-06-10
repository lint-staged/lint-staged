import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import chalk from 'chalk'
import { execaCommand } from 'execa'
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

for (const [dependency, version] of Object.entries(packageJson.dependencies)) {
  /**
   * @example <caption>when matching single version</caption>
   * "">=18"
   * @example <caption>when matching multiple versions</caption>
   * [">=6.0", ">=6.0"]
   */
  const { stdout } = await execaCommand(`npm info ${dependency}@${version} engines.node --json`)
  const json = JSON.parse(stdout)

  const requiredVersion = Array.isArray(json) ? json[json.length - 1] : json

  /** True if currently-required range is inside the dependency's required range */
  const isSubset = subset(lintStagedRequires, requiredVersion)

  if (!isSubset) {
    allDependenciesSupported = false
  }

  const color = isSubset ? chalk.greenBright : chalk.redBright
  const symbol = isSubset ? `✓` : '×'

  console.log(`${color(`${symbol} ${dependency}`)}:`, requiredVersion)
}

if (!allDependenciesSupported) {
  process.exit(1)
}
