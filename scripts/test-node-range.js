import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import spawn from 'nano-spawn'
import { subset } from 'semver'

import { bold, green, red } from '../lib/colors.js'

const packageJson = JSON.parse(
  await readFile(fileURLToPath(new URL('../package.json', import.meta.url)))
)

const lintStagedRequires = packageJson.engines.node

console.log(bold(`Currently required Node.js version: ${lintStagedRequires}`))

console.log('-----------------------------')
console.log('Testing current dependencies:')
console.log('-----------------------------')

let allDependenciesSupported = true

for (const [dependency, version] of Object.entries(packageJson.dependencies)) {
  /**
   * @example <caption>when matching single version</caption>
   * "">=18"
   * @example <caption>when matching multiple versions</caption>
   * [">=6.0", ">=6.0"]
   */
  const { output } = await spawn('npm', [
    'info',
    `${dependency}@${version}`,
    'engines.node',
    '--json',
  ])
  const json = JSON.parse(output)

  const requiredVersion = Array.isArray(json) ? json[json.length - 1] : json

  /** True if currently-required range is inside the dependency's required range */
  const isSubset = subset(lintStagedRequires, requiredVersion)

  if (!isSubset) {
    allDependenciesSupported = false
  }

  const color = isSubset ? green : red
  const symbol = isSubset ? `✓` : '×'

  console.log(`${color(`${symbol} ${dependency}`)}:`, requiredVersion)
}

if (!allDependenciesSupported) {
  process.exit(1)
}
