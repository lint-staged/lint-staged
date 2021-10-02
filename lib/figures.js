const { blue, redBright, yellow } = require('colorette')
const { figures } = require('listr2')

const { arrowRight, cross, warning } = figures

module.exports = {
  info: blue(arrowRight),
  error: redBright(cross),
  warning: yellow(warning),
}
