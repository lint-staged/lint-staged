/**
 * Inlined functionality of `jest-snapshot-serializer-ansi` converted to CJS
 * until Jest supports loading ESM snapshot serializers.
 * @see https://github.com/jestjs/jest/issues/11167
 */

/** @see https://github.com/chalk/ansi-regex/blob/02fa893d619d3da85411acc8fd4e2eea0e95a9d9/index.js */
const ansiRegex = ({ onlyFirst = false } = {}) => {
  const pattern = [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))',
  ].join('|')

  return new RegExp(pattern, onlyFirst ? undefined : 'g')
}

const onlyFirstRegex = ansiRegex({ onlyFirst: true })

/** @see https://github.com/chalk/has-ansi/blob/a285373adebe5e01f325d5a2e9df2686a09bc0d7/index.js */
const hasAnsi = (string) => onlyFirstRegex.test(string)

const allRegex = ansiRegex()

/** @see https://github.com/chalk/strip-ansi/blob/1fdc531d4046cbaa830460f5c74452bf1f0a0884/index.js */
const stripAnsi = (string) => {
  if (typeof string !== 'string') {
    throw new TypeError(`Expected a \`string\`, got \`${typeof string}\``)
  }

  // Even though the regex is global, we don't need to reset the `.lastIndex`
  // because unlike `.exec()` and `.test()`, `.replace()` does it automatically
  // and doing it manually has a performance penalty.
  return string.replace(allRegex, '')
}

/** @see https://github.com/ikatyang/jest-snapshot-serializer-ansi/blob/3ca79ba5a2201124b4b616f728b4a92b7388fc68/src/index.ts */
// eslint-disable-next-line no-undef
module.exports = {
  test: (value) => typeof value === 'string' && hasAnsi(value),
  print: (value, serialize) => serialize(stripAnsi(value)),
}
