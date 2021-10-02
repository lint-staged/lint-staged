const chalk = require('chalk')
const { figures } = require('listr2')

const { arrowRight, cross, warning } = figures

module.exports = {
  info: chalk.blue(arrowRight),
  error: chalk.red(cross),
  warning: chalk.yellow(warning),
}
