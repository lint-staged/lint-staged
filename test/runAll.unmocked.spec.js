import runAll from '../src/runAll'
import resolveGitDir from '../src/resolveGitDir'

jest.mock('../src/resolveGitDir')
jest.unmock('execa')

describe('runAll', () => {
  it('should throw when not in a git directory', async () => {
    resolveGitDir.mockImplementationOnce(async () => null)
    await expect(runAll({})).rejects.toThrowErrorMatchingSnapshot()
  })
})
