const config = {
  collectCoverageFrom: [
    'lib/**/*.js',
    /**
     * Instanbul uses babel to parse coverage data,
     * so `import.meta` is not available
     */
    '!lib/resolveConfig.js',
  ],
  coverageReporters: ['html', 'text', 'text-summary', 'cobertura'],
  moduleDirectories: ['node_modules'],
  prettierPath: null,
  setupFiles: ['./test/testSetup.js'],
  snapshotSerializers: ['./test/serializer.cjs'],
  testEnvironment: 'node',
  transform: {},
}

export default config
