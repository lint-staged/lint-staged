/** @type {import('./lib/index.js').Configuration} */
export default {
  '*': [
    ['oxfmt --write --no-error-on-unmatched-pattern', 'oxlint --no-error-on-unmatched-pattern'],
  ],
  '*.ts': () => 'tsc',
}
