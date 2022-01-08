const config = {
  collectCoverage: true,
  collectCoverageFrom: [
    'lib/**/*.js',
    // Avoid ESM import.meta parse error.
    '!lib/resolveConfig.js',
  ],
  moduleDirectories: ['node_modules'],
  moduleFileExtensions: ['js', 'mjs'],
  setupFiles: ['./testSetup.js'],
  snapshotSerializers: ['jest-snapshot-serializer-ansi'],
  testEnvironment: 'node',
  transform: {},
}

export default config
