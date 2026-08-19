import { defineConfig } from './lib/config.js'

export default defineConfig({
  '*': [
    ['oxfmt --check --no-error-on-unmatched-pattern', 'oxlint --no-error-on-unmatched-pattern'],
  ],
  '*.ts': () => 'tsc',
})
