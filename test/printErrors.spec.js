import Listr from 'listr'
import makeConsoleMock from 'consolemock'
import printErrors from '../lib/printErrors'

describe('printErrors', () => {
  const logger = makeConsoleMock()

  beforeEach(() => {
    logger.clearHistory()
  })

  it('should print plain errors', () => {
    const err = new Error('We have a problem')
    printErrors(err, logger)
    expect(logger.printHistory()).toMatchSnapshot()
  })

  it('should print Listr nested errors', async () => {
    expect.assertions(1)
    const list = new Listr(
      [
        {
          title: 'foo',
          task: () => Promise.reject(new Error('Foo failed'))
        },
        {
          title: 'bar',
          task: () =>
            new Listr([
              {
                title: 'unicorn',
                task: () => Promise.reject(new Error('Unicorn failed'))
              },
              {
                title: 'rainbow',
                task: () => Promise.resolve()
              }
            ])
        },
        {
          title: 'baz',
          task: () => Promise.resolve()
        }
      ],
      {
        exitOnError: false,
        renderer: 'silent'
      }
    )

    try {
      await list.run()
    } catch (err) {
      printErrors(err, logger)
      expect(logger.printHistory()).toMatchSnapshot()
    }
  })
})
