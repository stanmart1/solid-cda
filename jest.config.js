module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js?(x)', '**/?(*.)+(spec|test).js?(x)'],
  verbose: true,
  forceExit: true, // May be needed if handles are not released properly
  // clearMocks: true, // Automatically clear mock calls and instances between every test
  setupFilesAfterEnv: ['./tests/setup.js'], // For global setup like DB connection
  // coveragePathIgnorePatterns: [ // Optional: ignore patterns for coverage
  //   "/node_modules/",
  //   "/config/",
  //   "/middleware/upload", // if you have upload middleware
  // ],
};
