import normalizeTasksConfig from '../src/normalizeTasksConfig'

describe('normalizeTasksConfig', () => {
  it('should return the default title for null-ish tasks', () => {
    const { title, commands } = normalizeTasksConfig('*.js', undefined)

    expect(title).toBe('Running tasks for *.js')
    expect(commands).toBe(undefined)
  })

  it('should return the default title for string tasks', () => {
    const { title, commands } = normalizeTasksConfig('*.js', 'eslint --fix')

    expect(title).toBe('Running tasks for *.js')
    expect(commands).toBe('eslint --fix')
  })

  it('should return the default title for function tasks', () => {
    const tsc = () => 'tsc -p tsconfig.json --noEmit'
    const { title, commands } = normalizeTasksConfig('**/*.ts?(x)', tsc)

    expect(title).toBe('Running tasks for **/*.ts?(x)')
    expect(commands).toEqual(tsc)
  })

  it('should return the default title for array tasks', () => {
    const { title, commands } = normalizeTasksConfig('*.js', ['eslint --fix', 'git add'])

    expect(title).toBe('Running tasks for *.js')
    expect(commands).toEqual(['eslint --fix', 'git add'])
  })

  it('should return the default title for object tasks without a title property', () => {
    const { title, commands } = normalizeTasksConfig('**/*.js', {
      tasks: 'prettier --write'
    })

    expect(title).toBe('Running tasks for **/*.js')
    expect(commands).toBe('prettier --write')
  })

  it('should return the custom title for object tasks with a title property', () => {
    const { title, commands } = normalizeTasksConfig('**/*.js', {
      title: 'Running tasks JavaScript files',
      tasks: 'prettier --write'
    })

    expect(title).toBe('Running tasks JavaScript files')
    expect(commands).toBe('prettier --write')
  })
})
