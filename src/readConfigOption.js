'use strict'

/**
 * Helper function for reading config option.
 * Returns the `config` option for given `key` or the given `defaultValue`
 * if `config` does not have the given `key`.
 *
 * @param {Object} config
 * @param {string} key
 * @param {*} defaultValue
 * @returns {*}
 */
module.exports = function readConfigOption(config, key, defaultValue) {
    if (typeof config !== 'undefined' && typeof config[key] !== 'undefined') {
        return config[key]
    }

    return defaultValue
}

