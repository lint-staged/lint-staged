const config = {
  collectCoverage: true,
  collectCoverageFrom: ['lib/**/*.js'],
  moduleDirectories: ['node_modules'],
  setupFiles: ['./testSetup.js'],
  snapshotSerializers: ['jest-snapshot-serializer-ansi'],
  testEnvironment: 'node',
  transform: {
    '\\.[jt]sx?$': 'babel-jest',
    '\\.mjs$': 'babel-jest',
  },
  /** Also transform ESM packages in `node_modules` */
  transformIgnorePatterns: [],
}

export default config
