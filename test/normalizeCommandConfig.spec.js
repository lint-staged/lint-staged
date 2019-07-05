import normalizeCommandConfig from '../src/normalizeCommandConfig'

describe('normalizeCommandConfig', () => {
  it('should normalize string commands', () => {
    const linters = normalizeCommandConfig(['foo.js'], 'eslint --fix')

    expect(linters).toEqual([
      { title: 'eslint --fix', task: 'eslint --fix', shouldBeProvidedPaths: true }
    ])
  })

  it('should normalize array commands', () => {
    const linters = normalizeCommandConfig(['foo.js'], ['prettier --write', 'git add'])

    expect(linters).toEqual([
      { title: 'prettier --write', task: 'prettier --write', shouldBeProvidedPaths: true },
      { title: 'git add', task: 'git add', shouldBeProvidedPaths: true }
    ])
  })

  it('should normalize function commands', () => {
    const tsc = () => 'tsc --noEmit'
    const linters = normalizeCommandConfig(['foo.js'], tsc)

    expect(linters).toEqual([
      { title: 'tsc --noEmit', task: 'tsc --noEmit', shouldBeProvidedPaths: false }
    ])
  })

  it('should normalize object commands without a title', () => {
    const linters = normalizeCommandConfig(['foo.js'], { task: 'prettier --write' })

    expect(linters).toEqual([
      { title: 'prettier --write', task: 'prettier --write', shouldBeProvidedPaths: true }
    ])
  })

  it('should normalize object commands with a title', () => {
    const linters = normalizeCommandConfig(['foo.js'], {
      title: 'Formatting files',
      task: 'prettier --write'
    })

    expect(linters).toEqual([
      { title: 'Formatting files', task: 'prettier --write', shouldBeProvidedPaths: true }
    ])
  })

  it('should normalize the kitchen sink', () => {
    const linters = normalizeCommandConfig(
      ['foo.js'],
      [
        {
          title: 'Formatting files',
          task: 'prettier --write'
        },
        'eslint --fix',
        () => 'git add'
      ]
    )

    expect(linters).toEqual([
      { title: 'Formatting files', task: 'prettier --write', shouldBeProvidedPaths: true },
      { title: 'eslint --fix', task: 'eslint --fix', shouldBeProvidedPaths: true },
      { title: 'git add', task: 'git add', shouldBeProvidedPaths: false }
    ])
  })
})
