/** @type {import('./lib/index.js').Configuration} */
export default {
  '*.js': 'eslint',
  '*.{json,md}': 'prettier --check',
  '*.ts': () => 'tsc',
}
