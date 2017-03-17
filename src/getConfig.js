/* eslint no-console: 0 */

module.exports = function getConfig(config) {
    const { verbose, gitDir } = config
    const concurrent = typeof config.concurrent !== 'undefined' ? config.concurrent : true
    const renderer = verbose ? 'verbose' : 'update'
    const newConfig = Object.assign(config, {
        gitDir: gitDir || '.',
        renderer,
        concurrent
    })
    // Output config in verbose mode
    if (verbose) console.log(newConfig)
    return newConfig
}
