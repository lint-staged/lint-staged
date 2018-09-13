import dedent from 'dedent'
import execa from 'execa'
import isWindows from 'is-windows'
import logSymbols from 'log-symbols'
import pMap from 'p-map'
import resolveTaskFn from '../src/resolveTaskFn'

jest.mock('is-windows', () => jest.fn(() => true))
jest.mock('p-map')
jest.mock('execa', () =>
  jest.fn(() =>
    Promise.resolve({
      stdout: 'a-ok',
      stderr: '',
      code: 0,
      failed: false,
      cmd: 'mock cmd'
    })
  )
)

const defaultOpts = {
  linter: 'test',
  pathsToLint: ['test.js'],
  chunkSize: 1,
  subTaskConcurrency: 1
}

describe('resolveTaskFn', () => {
  describe('chunked tasks', () => {
    afterEach(() => {
      execa.mockClear()
      pMap.mockClear()
    })

    pMap.mockResolvedValue([
      {
        stdout: 'a-ok',
        stderr: '',
        code: 0,
        failed: false,
        cmd: 'mock cmd'
      }
    ])

    it('should invoke execa in mapper function', async () => {
      expect.assertions(3)

      const taskFn = resolveTaskFn({ ...defaultOpts })
      await taskFn()
      const [[[chunk], mapper]] = pMap.mock.calls
      expect(pMap).toHaveBeenCalledWith([['test.js']], mapper, { concurrency: 1 })
      await mapper(chunk)
      expect(execa).toHaveBeenCalledTimes(1)
      expect(execa).toHaveBeenCalledWith('test', ['test.js'], { reject: false })
    })

    it('should respect chunk size and concurrency', async () => {
      expect.assertions(6)

      const taskFn = resolveTaskFn({
        ...defaultOpts,
        pathsToLint: ['test1.js', 'test2.js'],
        subTaskConcurrency: 2
      })
      await taskFn()
      const [[chunks, mapper]] = pMap.mock.calls
      expect(mapper).toBeInstanceOf(Function)
      expect(pMap).toHaveBeenCalledWith([['test1.js'], ['test2.js']], mapper, { concurrency: 2 })

      // Check that calling the mapper invokes execa
      const [c1, c2] = chunks
      await mapper(c1)
      expect(execa).toHaveBeenCalledTimes(1)
      expect(execa).lastCalledWith('test', ['test1.js'], { reject: false })
      await mapper(c2)
      expect(execa).toHaveBeenCalledTimes(2)
      expect(execa).lastCalledWith('test', ['test2.js'], { reject: false })
    })

    it('should not return task fn with chunked execution if OS is not Windows', async () => {
      expect.assertions(3)
      isWindows.mockReturnValueOnce(false)

      const taskFn = resolveTaskFn({
        ...defaultOpts,
        pathsToLint: ['test1.js', 'test2.js']
      })
      await taskFn()
      expect(pMap).not.toHaveBeenCalled()
      expect(execa).toHaveBeenCalledTimes(1)
      expect(execa).toHaveBeenCalledWith('test', ['test1.js', 'test2.js'], { reject: false })
    })

    it('should throw error for failed linters', async () => {
      expect.assertions(1)
      pMap.mockResolvedValueOnce([
        {
          stdout: 'Mock error',
          stderr: '',
          code: 0,
          failed: true,
          cmd: 'mock cmd'
        }
      ])

      const taskFn = resolveTaskFn({
        ...defaultOpts,
        linter: 'mock-fail-linter'
      })
      try {
        await taskFn()
      } catch (err) {
        expect(err.privateMsg).toMatchSnapshot()
      }
    })

    it('should handle unexpected error', async () => {
      expect.assertions(1)
      pMap.mockRejectedValueOnce(new Error('Unexpected Error'))

      const taskFn = resolveTaskFn({ ...defaultOpts })
      try {
        await taskFn()
      } catch (err) {
        expect(err.message).toMatch(dedent`
          ${logSymbols.error} test got an unexpected error.
          Unexpected Error
        `)
      }
    })
  })
})
