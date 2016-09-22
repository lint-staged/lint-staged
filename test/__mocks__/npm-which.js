jest.genMockFromModule('npm-which')

function sync(path) {
    if (path.indexOf('missing') >= 0) {
        throw new Error(`not found: ${ path }`)
    }
    return path
}

module.exports = function npmWhich() {
    return {
        sync
    }
}
