/** @type {import('jest').Config} */
export default {
  collectCoverageFrom: [
    'lib/**/*.js',
    /**
     * Instanbul uses babel to parse coverage data,
     * so `import.meta` is not available
     */
    '!lib/resolveConfig.js',
  ],
  coverageReporters: ['html', 'text', 'text-summary', 'cobertura'],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  moduleDirectories: ['node_modules'],
  prettierPath: null,
  setupFiles: ['./test/testSetup.js'],
  snapshotSerializers: ['./test/serializer.cjs'],
  testEnvironment: 'node',
  transform: {},
}
