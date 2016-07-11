module.exports = function getLintersAsString (linters) {
    return Array.isArray(linters) ? linters.join(' → ') : linters
}
