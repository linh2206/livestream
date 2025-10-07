module.exports = {
  displayName: 'Unit Tests',
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/../../src/$1',
  },
  collectCoverageFrom: [
    '../../src/**/*.(t|j)s',
    '!../../src/**/*.module.ts',
    '!../../src/**/*.dto.ts',
    '!../../src/**/index.ts',
    '!../../src/main.ts',
  ],
};

