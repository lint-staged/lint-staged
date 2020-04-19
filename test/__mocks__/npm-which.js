const mockFn = jest.fn((path) => {
  if (path.includes('missing')) {
    throw new Error(`not found: ${path}`)
  }
  return path
})

module.exports = function npmWhich() {
  return {
    sync: mockFn
  }
}

module.exports.mockFn = mockFn
