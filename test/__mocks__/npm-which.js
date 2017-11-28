module.exports = function npmWhich() {
  return {
    sync(path) {
      if (path.includes('missing')) {
        throw new Error(`not found: ${path}`)
      }
      return path
    }
  }
}
