const execa = jest.fn(() =>
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

execa.command = execa

module.exports = execa
