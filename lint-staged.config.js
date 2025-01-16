/** @type {import('./lib/types').Configuration} */
export default {
  '*.js': 'eslint --fix',
  '*.{json,md}': 'prettier --write',
  '*.ts': 'tsc --noEmit --strict',
}
