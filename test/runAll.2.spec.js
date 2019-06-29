import runAll from '../src/runAll'

jest.unmock('execa')

describe('runAll', () => {
  it('should throw when not in a git directory', async () => {
    const config = { cwd: '/' }
    await expect(runAll(config)).rejects.toThrowErrorMatchingSnapshot()
  })
})
