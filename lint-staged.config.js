/** @type {import('./lib/index.js').Configuration} */
export default {
  '*.js': 'eslint --fix',
  '*.{json,md}': 'prettier --write',
  '*.ts': () => 'tsc',
}
