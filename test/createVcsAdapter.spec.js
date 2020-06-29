import createVcsAdapter from '../lib/createVcsAdapter'
import GitWorkflow from '../lib/gitWorkflow'

jest.mock('pluginModule', () => jest.fn(() => ({ pluginMethod: 'something' })), { virtual: true })

describe('unlcreateVcsAdapterink', () => {
  it('should call require with provided module name', async () => {
    const actual = createVcsAdapter('pluginModule', {}, 'logger')

    expect(actual).toEqual({ pluginMethod: 'something' })
  })

  it('should call git by default', async () => {
    const actual = createVcsAdapter(undefined, {}, 'logger')

    expect(actual).toBeInstanceOf(GitWorkflow)
  })
})
