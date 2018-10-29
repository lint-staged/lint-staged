module.exports = jest.fn(() =>
  Promise.resolve({
    stdout: 'a-ok',
    stderr: '',
    code: 0,
    cmd: 'mock cmd',
    failed: false,
    killed: false,
    signal: null
  })
)
