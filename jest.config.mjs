const config = {
  collectCoverage: true,
  collectCoverageFrom: [
    'lib/**/*.mjs',
    // Avoid ESM import.meta parse error.
    '!lib/resolveConfig.mjs',
  ],
  moduleDirectories: ['node_modules'],
  moduleFileExtensions: ['js', 'mjs'],
  setupFiles: ['./testSetup.mjs'],
  snapshotSerializers: ['jest-snapshot-serializer-ansi'],
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).mjs'],
  transform: {},
}

export default config
