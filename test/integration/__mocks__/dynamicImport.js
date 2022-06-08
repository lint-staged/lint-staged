jest.mock('../../../lib/dynamicImport.js', () => ({
  // 'pathToFileURL' is not supported with Jest + Babel
  dynamicImport: jest.fn().mockImplementation(async (input) => require(input)),
}))
