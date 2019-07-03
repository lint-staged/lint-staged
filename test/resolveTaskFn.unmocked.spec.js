import resolveTaskFn from '../src/resolveTaskFn'

jest.unmock('execa')

describe('resolveTaskFn', () => {
  it('should call execa with shell when configured so', async () => {
    const taskFn = resolveTaskFn({
      pathsToLint: ['package.json'],
      isFn: true,
      linter: 'node -e "process.exit(1)" || echo $?',
      shell: true
    })

    await expect(taskFn()).resolves.toMatchInlineSnapshot(
      `"√ node -e \\"process.exit(1)\\" || echo $? passed!"`
    )
  })
})
