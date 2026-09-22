import { describe, it, vi } from 'vitest'

import { chunkFilesForCommand } from '../../lib/getSpawnedTasks.js'

describe('chunkFilesForCommand', () => {
  it.for([
    [undefined, ['a.js', 'b.js']],
    [Infinity, ['a.js', 'b.js']],
    [1, ['a.js']],
  ])(
    'does not chunk with maxArgLength $0 and files $1',
    async ([maxArgLength, files], { expect }) => {
      await expect(chunkFilesForCommand('lint', files, maxArgLength)).resolves.toEqual([
        { command: 'lint', files },
      ])
    }
  )

  it('chunks string commands while preserving file order', async ({ expect }) => {
    const files = ['a.js', 'b.js', 'c.js', 'd.js', 'e.js']

    await expect(chunkFilesForCommand('lint', files, 19)).resolves.toEqual([
      { command: 'lint', files: ['a.js', 'b.js', 'c.js'] },
      { command: 'lint', files: ['d.js', 'e.js'] },
    ])
  })

  it('reevaluates async function commands for each chunk', async ({ expect }) => {
    const files = ['a.js', 'b.js', 'c.js', 'd.js', 'e.js']
    const command = vi.fn(async (chunk) => `lint ${chunk.join(' ')}`)

    await expect(chunkFilesForCommand(command, files, 19)).resolves.toEqual([
      { command: 'lint a.js b.js c.js', files: [] },
      { command: 'lint d.js e.js', files: [] },
    ])
    expect(command).toHaveBeenCalledTimes(3)
    expect(command).toHaveBeenNthCalledWith(1, files)
    expect(command).toHaveBeenNthCalledWith(2, ['a.js', 'b.js', 'c.js'])
    expect(command).toHaveBeenNthCalledWith(3, ['d.js', 'e.js'])
  })

  it('chunks when any command returned by a function is too long', async ({ expect }) => {
    const command = (files) => [`lint ${files.join(' ')}`, `format ${files.join(' ')}`]

    await expect(chunkFilesForCommand(command, ['a.js', 'b.js'], 14)).resolves.toEqual([
      { command: 'lint a.js', files: [] },
      { command: 'format a.js', files: [] },
      { command: 'lint b.js', files: [] },
      { command: 'format b.js', files: [] },
    ])
  })

  it('passes a copy of the files to function commands', async ({ expect }) => {
    const files = ['a.js', 'b.js']
    const command = async (commandFiles) => {
      commandFiles.splice(0)
      return 'lint'
    }

    await expect(chunkFilesForCommand(command, files)).resolves.toEqual([
      { command: 'lint', files: [] },
    ])
    expect(files).toEqual(['a.js', 'b.js'])
  })

  it.for([
    null,
    undefined,
    1,
    false,
    ['lint', null],
    [['lint', false]],
    () => 'lint',
    ['lint', () => 'format'],
    { title: 'lint', task: () => {} },
  ])('rejects an invalid function result: %j', async (result, { expect }) => {
    await expect(chunkFilesForCommand(() => result, ['a.js'])).rejects.toThrow(
      'Commands must be strings'
    )
  })

  it('skips functions when no files matched', async ({ expect }) => {
    const command = vi.fn()

    await expect(chunkFilesForCommand(command, [])).resolves.toEqual([])
    expect(command).not.toHaveBeenCalled()
  })

  it('preserves empty and single-command groups', async ({ expect }) => {
    await expect(chunkFilesForCommand(() => [], ['a.js'])).resolves.toEqual([])
    await expect(chunkFilesForCommand([[], [() => 'lint'], () => []], ['a.js'])).resolves.toEqual([
      [],
      [{ command: 'lint', files: [] }],
      [],
    ])
  })

  it('preserves parallel groups from a whole-value function', async ({ expect }) => {
    await expect(
      chunkFilesForCommand(async () => ['before', ['lint', 'format'], 'after'], ['a.js'])
    ).resolves.toEqual([
      { command: 'before', files: [] },
      [
        { command: 'lint', files: [] },
        { command: 'format', files: [] },
      ],
      { command: 'after', files: [] },
    ])
  })

  it('preserves a function result at its position in a sequence', async ({ expect }) => {
    const files = ['a.js']

    await expect(
      chunkFilesForCommand(['before', () => ['lint', 'format'], 'after'], files)
    ).resolves.toEqual([
      { command: 'before', files },
      [
        { command: 'lint', files: [] },
        { command: 'format', files: [] },
      ],
      { command: 'after', files },
    ])
  })

  it.for([
    () => [[['lint']]],
    ['before', () => [['lint']], 'after'],
    [['lint', () => ['format']]],
    [['lint', () => []]],
    [[['lint']]],
  ])('rejects excessive nesting at the original position: %j', async (commands, { expect }) => {
    await expect(chunkFilesForCommand(commands, ['a.js'])).rejects.toThrow(
      'at most one nested array'
    )
  })

  it('preserves generated parallel groups within each file chunk', async ({ expect }) => {
    const commands = vi.fn(async (files) => [
      'before',
      [`lint ${files.join(' ')}`, `format ${files.join(' ')}`],
      'after',
    ])

    await expect(chunkFilesForCommand(commands, ['a.js', 'b.js'], 14)).resolves.toEqual([
      { command: 'before', files: [] },
      [
        { command: 'lint a.js', files: [] },
        { command: 'format a.js', files: [] },
      ],
      { command: 'after', files: [] },
      { command: 'before', files: [] },
      [
        { command: 'lint b.js', files: [] },
        { command: 'format b.js', files: [] },
      ],
      { command: 'after', files: [] },
    ])
    expect(commands).toHaveBeenCalledTimes(3)
  })

  it('chunks a function inside a sequence without repeating surrounding tasks', async ({
    expect,
  }) => {
    const files = ['a.js', 'b.js']
    const commands = (chunk) => [`lint ${chunk.join(' ')}`, `format ${chunk.join(' ')}`]

    await expect(chunkFilesForCommand(['a', commands, 'z'], files, 14)).resolves.toEqual([
      { command: 'a', files },
      [
        { command: 'lint a.js', files: [] },
        { command: 'format a.js', files: [] },
      ],
      [
        { command: 'lint b.js', files: [] },
        { command: 'format b.js', files: [] },
      ],
      { command: 'z', files },
    ])
  })

  it('validates function results again after splitting files', async ({ expect }) => {
    const commands = (files) => (files.length > 1 ? `lint ${files.join(' ')}` : null)

    await expect(chunkFilesForCommand(commands, ['a.js', 'b.js'], 10)).rejects.toThrow(
      'Commands must be strings'
    )
  })
})
