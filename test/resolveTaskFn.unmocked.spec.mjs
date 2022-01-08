import { resolveTaskFn } from '../lib/resolveTaskFn.mjs'

describe('resolveTaskFn', () => {
  it('should call execa with shell when configured so', async () => {
    const taskFn = resolveTaskFn({
      command: 'node -e "process.exit(1)" || echo $?',
      files: ['package.json'],
      isFn: true,
      shell: true,
    })

    await expect(taskFn()).resolves.toMatchInlineSnapshot(`undefined`)
  })
})
