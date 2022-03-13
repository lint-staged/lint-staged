import { resolveTaskFn } from '../lib/resolveTaskFn'
import { getInitialState } from '../lib/state'

jest.unmock('execa')

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

  it('should kill a long running task when another fails', async () => {
    const context = getInitialState()

    const taskFn = resolveTaskFn({
      command: 'node -e "while(true) {}"',
      isFn: true,
    })
    const taskPromise = taskFn(context)

    const taskFn2 = resolveTaskFn({
      command: 'node -e "process.exit(1)"',
      isFn: true,
    })
    const task2Promise = taskFn2(context)

    await expect(task2Promise).rejects.toThrowErrorMatchingInlineSnapshot(
      `"node -e \\"process.exit(1)\\" [FAILED]"`
    )
    await expect(taskPromise).rejects.toThrowErrorMatchingInlineSnapshot(
      `"node -e \\"while(true) {}\\" [KILLED]"`
    )
  })
})
