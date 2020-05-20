import requireNodeVersion from '../lib/nodeVersion'

describe('requireNodeVersion', () => {
  it('should pass using all tested Node.js versions', async () => {
    await expect(requireNodeVersion()).resolves.toEqual(undefined)
  })

  it('should fail for Node.js v8.17.0', async () => {
    await expect(requireNodeVersion('8.17.0')).rejects.toThrowErrorMatchingInlineSnapshot(
      `"× Your current Node.js v8.17.0 doesn't satisfy the required range for lint-staged (>=12 || 10.13.0 - 10.20.1). Please upgrade Node.js!"`
    )
  })

  it('should fail for Node.js v9.11.2', async () => {
    await expect(requireNodeVersion('9.11.2')).rejects.toThrowErrorMatchingInlineSnapshot(
      `"× Your current Node.js v9.11.2 doesn't satisfy the required range for lint-staged (>=12 || 10.13.0 - 10.20.1). Please upgrade Node.js!"`
    )
  })

  it('should fail for Node.js v10.12.0', async () => {
    await expect(requireNodeVersion('10.12.0')).rejects.toThrowErrorMatchingInlineSnapshot(
      `"× Your current Node.js v10.12.0 doesn't satisfy the required range for lint-staged (>=12 || 10.13.0 - 10.20.1). Please upgrade Node.js!"`
    )
  })

  it('should fail for Node.js v11.15.0', async () => {
    await expect(requireNodeVersion('11.15.0')).rejects.toThrowErrorMatchingInlineSnapshot(
      `"× Your current Node.js v11.15.0 doesn't satisfy the required range for lint-staged (>=12 || 10.13.0 - 10.20.1). Please upgrade Node.js!"`
    )
  })
})
