module.exports = jest.fn(() =>
  Promise.resolve({
    stdout: 'a-ok',
    stderr: '',
    code: 0,
    failed: false,
    cmd: 'mock cmd'
  })
)
