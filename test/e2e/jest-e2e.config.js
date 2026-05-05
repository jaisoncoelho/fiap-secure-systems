/** @type {import('jest').Config} */
module.exports = {
  rootDir: '../..',
  testEnvironment: 'node',
  testTimeout: 180000,
  testRegex: 'test/e2e/.*\\.e2e-spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: {
    '^@app/shared(|/.*)$': '<rootDir>/libs/shared/src/$1',
  },
  setupFiles: ['<rootDir>/test/e2e/jest.e2e.setup.ts'],
  maxWorkers: 1,
};
